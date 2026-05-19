import type {
  AnalysisMeta,
  ClarificationAnswer,
  ClarifyingQuestion,
  PreliminaryAnalysisResult,
  ProjectAnalysis,
  StructuredProjectFields,
} from "../types/architecture";
import { analyzeWithAI } from "./ai/analyzeWithAI";
import { applySafetyPass } from "./ai/safetyPass";
import { applySourceGuard } from "./ai/sourceGuard";
import { validateAnalysis } from "./ai/validateAnalysis";
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
  const uncertain: string[] = [];
  const missingCritical: string[] = [];

  if (signals.find((s) => s.key === "planningStatus")?.value === "unknown") {
    uncertain.push("Status planistyczny terenu (MPZP / WZ / inne ustalenia)");
    missingCritical.push("Status planistyczny");
  }
  if (signals.find((s) => s.key === "hasMdcp")?.value === false) {
    missingCritical.push("MDCP / pomiad geodezyjny");
  }
  if (!signals.find((s) => s.key === "buildingCategory")) {
    uncertain.push("Kategoria i funkcja obiektu");
    missingCritical.push("Kategoria obiektu");
  }

  const requiredQs = questions.filter((q) => q.requiredForFinalPlan);
  const canGenerateFinalPlan =
    missingCritical.length === 0 && requiredQs.length === 0;

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

  if (aiResult.ok && aiResult.analysis) {
    const validated = validateAnalysis(aiResult.analysis);
    if (!validated.ok) {
      validationError = validated.errors.join("; ");
    } else if (validated.analysis) {
      let analysis = applySourceGuard(validated.analysis);
      analysis = applySafetyPass(analysis, signals);
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

  const fallback = mockAnalysis(prompt, structuredFields, clarificationAnswers, questionsAsked);
  const meta: AnalysisMeta = {
    source: "rules",
    usedFallback: true,
    aiError: aiResult.error ?? validationError,
    needsClarification:
      fallback.uncertainInputs.length > 0 || fallback.confidenceLevel === "low",
    verifyLegalBasis: fallback.legalBasis.some((l) => l.verificationRequired === true),
  };
  return { analysis: { ...fallback, meta }, meta };
}
