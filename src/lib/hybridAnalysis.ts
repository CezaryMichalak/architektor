import type {
  AnalysisMeta,
  ClarificationAnswer,
  ClarifyingQuestion,
  PreliminaryAnalysisResult,
  ProjectAnalysis,
  StructuredProjectFields,
} from "../types/architecture";
import { analyzeWithAI } from "./ai/analyzeWithAI";
import { normalizeAiAnalysisPayload } from "./ai/normalizeAiAnalysis";
import { applyPostAiPasses } from "./ai/applyPostAiPasses";
import { applySourceGuard } from "./ai/sourceGuard";
import { validateAnalysis } from "./ai/validateAnalysis";
import type { AnalysisErrorCode } from "../types/architecture";
import { classifyProjectType } from "./classifyProjectType";
import { extractProjectSignals, signalsToDetectedLabels } from "./extractProjectSignals";
import { applyClarificationAnswers, mockAnalysis, preliminaryAnalysis } from "./mockAnalysis";

function getSignalsWithClarification(
  prompt: string,
  structured?: StructuredProjectFields,
  clarificationAnswers: ClarificationAnswer[] = []
) {
  let signals = extractProjectSignals(prompt, structured);
  signals = applyClarificationAnswers(signals, clarificationAnswers);
  return signals;
}

function buildPreliminary(
  prompt: string,
  structured?: StructuredProjectFields
): PreliminaryAnalysisResult {
  const { signals, questions } = preliminaryAnalysis(prompt, structured);
  const classification = classifyProjectType(signals, prompt, structured);
  const uncertain: string[] = [];
  const missingCritical: string[] = [];

  if (signals.find((s) => s.key === "planningStatus")?.value === "unknown") {
    uncertain.push("Status planistyczny terenu (MPZP / WZ / inne ustalenia)");
    missingCritical.push("Status planistyczny");
  }
  if (signals.find((s) => s.key === "hasMdcp")?.value === false) {
    missingCritical.push("MDCP / pomiad geodezyjny");
  }
  if (
    !signals.find((s) => s.key === "buildingCategory") &&
    classification.projectType === "unknown"
  ) {
    uncertain.push("Kategoria i funkcja obiektu");
    missingCritical.push("Kategoria obiektu");
  }
  if (classification.projectType === "unknown") {
    uncertain.push("Typ inwestycji — wymaga doprecyzowania (krytyczne)");
  }

  const blockingQs = questions.filter(
    (q) => q.priority === "critical" || (q.requiredForFinalPlan && q.priority !== "optional")
  );
  const canGenerateFinalPlan =
    questions.length === 0 ||
    (missingCritical.length === 0 && blockingQs.length === 0);

  return {
    detectedInputs: signalsToDetectedLabels(signals),
    uncertainInputs: uncertain,
    missingCriticalInputs: missingCritical,
    clarifyingQuestions: questions,
    canGenerateFinalPlan,
    signals,
  };
}

export function runPreliminaryAnalysis(
  prompt: string,
  structured?: StructuredProjectFields
): PreliminaryAnalysisResult {
  return buildPreliminary(prompt, structured);
}

export interface HybridAnalysisResult {
  analysis: ProjectAnalysis;
  meta: AnalysisMeta;
}

export async function runHybridFinalAnalysis(
  prompt: string,
  structuredFields?: StructuredProjectFields,
  clarificationAnswers: ClarificationAnswer[] = [],
  questionsAsked: ClarifyingQuestion[] = []
): Promise<HybridAnalysisResult> {
  const signals = getSignalsWithClarification(prompt, structuredFields, clarificationAnswers);

  const aiResult = await analyzeWithAI({
    projectDescription: prompt,
    structuredFields: structuredFields ?? {},
    clarificationAnswers,
    ruleBasedSignals: signals,
  });

  let validationError: string | undefined;
  let validationErrorCode: AnalysisErrorCode | undefined;

  if (aiResult.ok && aiResult.analysis) {
    const normalized = normalizeAiAnalysisPayload(aiResult.analysis);
    const validated = validateAnalysis(normalized);
    if (!validated.ok) {
      const schemaErrors = validated.allErrors ?? validated.errors;
      validationError =
        "AI returned JSON, but it failed schema validation. Fallback used.";
      validationErrorCode = "invalid_json_schema";
      if (import.meta.env.DEV) {
        console.warn("[architektor-ai] schema validation failed", schemaErrors.slice(0, 10));
      }
      const fallbackRaw = mockAnalysis(prompt, structuredFields, clarificationAnswers, questionsAsked);
      const fallback = applyPostAiPasses(fallbackRaw, signals, prompt);
      const meta: AnalysisMeta = {
        source: "rules",
        usedFallback: true,
        aiError: validationError,
        aiErrorCode: validationErrorCode,
        fallbackReason: "schema_validation_failed",
        schemaValidationErrors: schemaErrors.slice(0, 3),
        needsClarification:
          fallback.uncertainInputs.length > 0 || fallback.confidenceLevel === "low",
        verifyLegalBasis: fallback.legalBasis.some((l) => l.verificationRequired === true),
      };
      return { analysis: { ...fallback, meta }, meta };
    } else if (validated.analysis) {
      let analysis = applySourceGuard(validated.analysis);
      analysis = applyPostAiPasses(analysis, signals, prompt);
      analysis.clarifyingQuestionsAsked = questionsAsked;

      const meta: AnalysisMeta = {
        source: "ai",
        usedFallback: false,
        needsClarification: analysis.meta?.needsClarification ?? false,
        verifyLegalBasis: analysis.meta?.verifyLegalBasis ?? false,
      };
      return { analysis: { ...analysis, meta }, meta };
    }
  }

  const fallbackReason =
    validationErrorCode === "invalid_json_schema"
      ? "schema_validation_failed"
      : aiResult.fallbackReason ?? "ai_unavailable";

  if (import.meta.env.DEV) {
    console.warn("[architektor-ai] using rule fallback", {
      reason: fallbackReason,
      errorCode: aiResult.errorCode ?? validationErrorCode,
      error: aiResult.error ?? validationError,
    });
  }

  const fallbackRaw = mockAnalysis(prompt, structuredFields, clarificationAnswers, questionsAsked);
  const fallback = applyPostAiPasses(fallbackRaw, signals, prompt);
  const meta: AnalysisMeta = {
    source: "rules",
    usedFallback: true,
    aiError:
      validationErrorCode === "invalid_json_schema"
        ? validationError ?? "AI returned JSON, but it failed schema validation. Fallback used."
        : aiResult.error ?? validationError,
    aiErrorCode: aiResult.errorCode ?? validationErrorCode,
    fallbackReason,
    needsClarification:
      fallback.uncertainInputs.length > 0 || fallback.confidenceLevel === "low",
    verifyLegalBasis: fallback.legalBasis.some((l) => l.verificationRequired === true),
  };
  return { analysis: { ...fallback, meta }, meta };
}
