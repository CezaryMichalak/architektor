import type {
  ClarificationAnswer,
  ProjectAnalysis,
  ProjectSignal,
} from "../../types/architecture";
import { calculateAnalysisCompleteness } from "../calculateAnalysisCompleteness";
import { calculateProjectProgress } from "../calculateProjectProgress";
import { applyConsistencyPass } from "./consistencyPass";
import { applyDedupePass } from "./dedupePass";
import { applyDomainEnrichmentPass } from "./domainEnrichmentPass";
import { applySafetyPass } from "./safetyPass";

/**
 * Post-AI pipeline: safety → domain enrichment → consistency → dedupe.
 * Used for AI output and optionally rule-based fallback for parity.
 */
export function applyPostAiPasses(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[],
  prompt: string,
  clarificationAnswers: ClarificationAnswer[] = []
): ProjectAnalysis {
  let result = applySafetyPass(analysis, signals);
  result = applyDomainEnrichmentPass(result, signals, prompt);
  result = applyConsistencyPass(result, signals, prompt);
  result = applyDedupePass(result, signals);

  // Final confidence: safety may have forced low; consistency ceiling wins for known types with doc gaps only
  const pt = String(signals.find((s) => s.key === "projectSubtype")?.value ?? "unknown");
  const planningUnknown = signals.find((s) => s.key === "planningStatus")?.value === "unknown";
  if (!planningUnknown && pt !== "unknown" && result.confidenceLevel === "low") {
    const hasDocGaps = result.missingDocuments.some((d) =>
      ["investor_brief", "mdcp", "mpzp_excerpt", "geotechnical_opinion"].includes(d.id)
    );
    if (hasDocGaps) {
      result = { ...result, confidenceLevel: "medium" };
    }
  }

  result = {
    ...result,
    advancementPercentage: calculateProjectProgress(signals),
    analysisCompletenessPercentage: calculateAnalysisCompleteness(
      signals,
      prompt,
      clarificationAnswers,
      result.clarifyingQuestionsAsked
    ),
  };

  return result;
}
