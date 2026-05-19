import type {
  ActionStep,
  ConfidenceLevel,
  LegalBasis,
  ProjectAnalysis,
  RequiredDocument,
  RiskItem,
  SpecialistRecommendation,
} from "../../types/architecture";

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["low", "medium", "high"];
const DOC_STATUSES = ["missing", "partial", "available", "uncertain"] as const;
const DOC_PRIORITIES = ["critical", "high", "medium"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const SPEC_PRIORITIES = ["essential", "recommended", "conditional"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function validateDocument(v: unknown): RequiredDocument | null {
  if (!isRecord(v)) return null;
  if (!isString(v.id) || !isString(v.name) || !isString(v.reason)) return null;
  if (!DOC_STATUSES.includes(v.status as (typeof DOC_STATUSES)[number])) return null;
  if (!DOC_PRIORITIES.includes(v.priority as (typeof DOC_PRIORITIES)[number])) return null;
  return {
    id: v.id,
    name: v.name,
    abbreviation: isString(v.abbreviation) ? v.abbreviation : undefined,
    status: v.status as RequiredDocument["status"],
    priority: v.priority as RequiredDocument["priority"],
    reason: v.reason,
    relatedStage: isString(v.relatedStage) ? v.relatedStage : undefined,
  };
}

function validateAction(v: unknown): ActionStep | null {
  if (!isRecord(v)) return null;
  if (!isString(v.id) || !isString(v.title) || !isString(v.description)) return null;
  if (!isNumber(v.order)) return null;
  return {
    id: v.id,
    order: v.order,
    title: v.title,
    description: v.description,
    responsible: isString(v.responsible) ? v.responsible : undefined,
    dependsOn: isStringArray(v.dependsOn) ? v.dependsOn : undefined,
    badge: isString(v.badge) ? v.badge : undefined,
    timeframe: isString(v.timeframe) ? v.timeframe : undefined,
  };
}

function validateSpecialist(v: unknown): SpecialistRecommendation | null {
  if (!isRecord(v)) return null;
  if (
    !isString(v.id) ||
    !isString(v.discipline) ||
    !isString(v.role) ||
    !isString(v.whenNeeded) ||
    !isString(v.inputRequired) ||
    !isString(v.outputDeliverable) ||
    !isString(v.reason)
  ) {
    return null;
  }
  if (!SPEC_PRIORITIES.includes(v.priority as (typeof SPEC_PRIORITIES)[number])) return null;
  return {
    id: v.id,
    discipline: v.discipline,
    role: v.role,
    whenNeeded: v.whenNeeded,
    inputRequired: v.inputRequired,
    outputDeliverable: v.outputDeliverable,
    priority: v.priority as SpecialistRecommendation["priority"],
    reason: v.reason,
  };
}

function validateLegal(v: unknown): LegalBasis | null {
  if (!isRecord(v)) return null;
  if (!isString(v.id) || !isString(v.title) || !isString(v.description) || !isString(v.scope)) {
    return null;
  }
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    scope: v.scope,
    sourceRef: isString(v.sourceRef) ? v.sourceRef : undefined,
    verificationRequired: v.verificationRequired === true,
  };
}

function validateRisk(v: unknown): RiskItem | null {
  if (!isRecord(v)) return null;
  if (!isString(v.id) || !isString(v.title) || !isString(v.description) || !isString(v.mitigation) || !isString(v.category)) {
    return null;
  }
  if (!RISK_LEVELS.includes(v.level as (typeof RISK_LEVELS)[number])) return null;
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    level: v.level as RiskItem["level"],
    mitigation: v.mitigation,
    category: v.category,
  };
}

function validateClarifyingQuestion(v: unknown): ProjectAnalysis["clarifyingQuestionsAsked"][number] | null {
  if (!isRecord(v)) return null;
  if (!isString(v.id) || !isString(v.question) || !isString(v.reason) || !isString(v.relatedArea)) {
    return null;
  }
  return {
    id: v.id,
    question: v.question,
    reason: v.reason,
    options: isStringArray(v.options) ? v.options : undefined,
    requiredForFinalPlan: v.requiredForFinalPlan === true,
    relatedArea: v.relatedArea as ProjectAnalysis["clarifyingQuestionsAsked"][number]["relatedArea"],
  };
}

/** Parses raw JSON into a ProjectAnalysis-shaped object (untrusted until validateAnalysis). */
export function parseProjectAnalysisJson(raw: unknown): ProjectAnalysis | null {
  if (!isRecord(raw)) return null;

  if (
    !isString(raw.projectType) ||
    !isString(raw.projectStage) ||
    !isNumber(raw.advancementPercentage) ||
    !isString(raw.immediateNextStep) ||
    !isString(raw.disclaimer)
  ) {
    return null;
  }

  if (!CONFIDENCE_LEVELS.includes(raw.confidenceLevel as ConfidenceLevel)) return null;
  if (!isStringArray(raw.detectedInputs) || !isStringArray(raw.uncertainInputs)) return null;

  const missingDocuments: RequiredDocument[] = [];
  if (Array.isArray(raw.missingDocuments)) {
    for (const item of raw.missingDocuments) {
      const doc = validateDocument(item);
      if (!doc) return null;
      missingDocuments.push(doc);
    }
  } else return null;

  const recommendedActions: ActionStep[] = [];
  if (Array.isArray(raw.recommendedActions)) {
    for (const item of raw.recommendedActions) {
      const action = validateAction(item);
      if (!action) return null;
      recommendedActions.push(action);
    }
  } else return null;

  const specialists: SpecialistRecommendation[] = [];
  if (Array.isArray(raw.specialists)) {
    for (const item of raw.specialists) {
      const spec = validateSpecialist(item);
      if (!spec) return null;
      specialists.push(spec);
    }
  } else return null;

  const legalBasis: LegalBasis[] = [];
  if (Array.isArray(raw.legalBasis)) {
    for (const item of raw.legalBasis) {
      const legal = validateLegal(item);
      if (!legal) return null;
      legalBasis.push(legal);
    }
  } else return null;

  const risks: RiskItem[] = [];
  if (Array.isArray(raw.risks)) {
    for (const item of raw.risks) {
      const risk = validateRisk(item);
      if (!risk) return null;
      risks.push(risk);
    }
  } else return null;

  const clarifyingQuestionsAsked: ProjectAnalysis["clarifyingQuestionsAsked"] = [];
  if (Array.isArray(raw.clarifyingQuestionsAsked)) {
    for (const item of raw.clarifyingQuestionsAsked) {
      const q = validateClarifyingQuestion(item);
      if (!q) return null;
      clarifyingQuestionsAsked.push(q);
    }
  } else return null;

  return {
    projectType: raw.projectType,
    projectStage: raw.projectStage,
    advancementPercentage: Math.min(100, Math.max(0, Math.round(raw.advancementPercentage))),
    confidenceLevel: raw.confidenceLevel as ConfidenceLevel,
    detectedInputs: raw.detectedInputs,
    uncertainInputs: raw.uncertainInputs,
    missingDocuments,
    recommendedActions,
    specialists,
    legalBasis,
    risks,
    clarifyingQuestionsAsked,
    immediateNextStep: raw.immediateNextStep,
    disclaimer: raw.disclaimer,
  };
}
