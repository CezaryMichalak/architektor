import {
  evaluateMissingIntakeGroups,
  getOrderedIntakeGroups,
} from "../data/intakeDataGroups";
import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ProjectSignal,
  QuestionPriority,
} from "../types/architecture";
import type { ProjectTypeKey } from "../types/projectType";
import { classifyProjectType } from "./classifyProjectType";

function getSignal(signals: ProjectSignal[], key: string): ProjectSignal | undefined {
  return signals.find((s) => s.key === key);
}

function signalValue(
  signals: ProjectSignal[],
  key: string
): string | boolean | number | undefined {
  return getSignal(signals, key)?.value;
}

function hasSignal(
  signals: ProjectSignal[],
  key: string,
  value?: string | boolean
): boolean {
  const s = getSignal(signals, key);
  if (!s) return false;
  if (value === undefined) return true;
  return String(s.value) === String(value);
}

const DEFAULT_IMPACT_BY_PRIORITY: Record<QuestionPriority, number> = {
  critical: 18,
  important: 12,
  optional: 7,
};

function promptWordCount(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length;
}

/** Base completeness from extracted signals and prompt detail (no clarification bonus). */
function baseCompletenessFromSignals(signals: ProjectSignal[], prompt: string): number {
  let score = 22;
  const words = promptWordCount(prompt);

  if (words >= 12) score += 6;
  if (words >= 28) score += 6;
  if (words >= 55) score += 5;

  const planning = signalValue(signals, "planningStatus");
  if (planning && planning !== "unknown") score += 12;
  else score -= 8;

  if (hasSignal(signals, "buildingCategory")) score += 10;
  else score -= 6;

  if (planning === "mpzp_exists") {
    if (hasSignal(signals, "hasMpzpExcerpt", true)) score += 14;
    else if (hasSignal(signals, "hasPartialPlanningParams", true)) score += 7;
    else score -= 4;
  }

  if (hasSignal(signals, "hasMdcp", true)) score += 12;
  else if (hasSignal(signals, "hasMdcp", false)) score += 2;

  if (hasSignal(signals, "hasInvestorBrief", true)) score += 6;
  else if (hasSignal(signals, "investorBriefStage", "partial")) score += 3;

  if (hasSignal(signals, "hasGeotechnicalOpinion", true)) score += 8;
  else if (hasSignal(signals, "hasGeotechnicalOpinion", false)) score += 1;

  if (!hasSignal(signals, "roadAccessUnclear", true)) score += 5;
  if (!hasSignal(signals, "utilitiesUnclear", true)) score += 5;
  if (!hasSignal(signals, "projectStageUnclear", true)) score += 4;

  if (hasSignal(signals, "hasPzt", true)) score += 4;
  if (hasSignal(signals, "hasPab", true)) score += 3;

  const lowConfidence = signals.filter((s) => s.confidence === "low").length;
  score -= Math.min(lowConfidence * 2, 10);

  const classification = classifyProjectType(signals, prompt);
  if (classification.projectType === "unknown") score -= 10;

  if (classification.isIndustrial) {
    if (hasSignal(signals, "hasTechnologyBrief", true)) score += 5;
    if (/\btir\b|dok|regał|wysokie\s+składow/i.test(prompt)) score += 4;
    if (hasSignal(signals, "warehouseStorageDefined", true)) score += 4;
    if (hasSignal(signals, "warehouseDocksDefined", true)) score += 4;
    if (hasSignal(signals, "warehouseFireLoadDefined", true)) score += 3;
    if (hasSignal(signals, "warehouseSlabLoadsDefined", true)) score += 3;
    if (hasSignal(signals, "warehouseStormwaterDefined", true)) score += 2;
    if (hasSignal(signals, "warehouseUtilitiesDefined", true)) score += 2;
  }

  const projectType = classification.projectType as ProjectTypeKey;
  const intakeCtx = { signals, prompt, projectType };
  const relevantGroups = getOrderedIntakeGroups(projectType).filter((g) =>
    g.isRelevant(intakeCtx)
  );
  if (relevantGroups.length > 0) {
    const missing = evaluateMissingIntakeGroups(intakeCtx);
    const satisfiedRatio = (relevantGroups.length - missing.length) / relevantGroups.length;
    score += Math.round(satisfiedRatio * 14);
  }

  if (words < 8) score = Math.min(score, 38);

  return Math.max(15, Math.min(88, Math.round(score)));
}

function clarificationBonus(
  answers: ClarificationAnswer[],
  questions: ClarifyingQuestion[]
): number {
  if (!answers.length || !questions.length) return 0;

  const questionById = new Map(questions.map((q) => [q.id, q]));
  let bonus = 0;

  for (const a of answers) {
    if (a.skipped || !a.answer.trim()) continue;
    const q = questionById.get(a.questionId);
    const impact =
      q?.impactOnCompleteness ??
      DEFAULT_IMPACT_BY_PRIORITY[q?.priority ?? "important"];
    bonus += impact;
  }

  return Math.min(45, bonus);
}

/**
 * How complete input data is for a reliable plan (0–100).
 * Increases when clarification answers address gaps; independent of project stage advancement.
 */
export function calculateAnalysisCompleteness(
  signals: ProjectSignal[],
  prompt: string,
  clarificationAnswers: ClarificationAnswer[] = [],
  questions: ClarifyingQuestion[] = []
): number {
  const base = baseCompletenessFromSignals(signals, prompt);
  const bonus = clarificationBonus(clarificationAnswers, questions);
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}

/** Whether clarification step should be shown (< 70% completeness and open questions). */
export function shouldShowClarification(
  completeness: number,
  questionCount: number
): boolean {
  return completeness < 70 && questionCount > 0;
}

/** Final plan allowed with documented assumptions (70–85%). */
export function canGenerateFinalPlanWithAssumptions(completeness: number): boolean {
  return completeness >= 70;
}

/** High-confidence plan threshold unless critical docs still missing. */
export function isHighCompletenessPlan(completeness: number): boolean {
  return completeness > 85;
}
