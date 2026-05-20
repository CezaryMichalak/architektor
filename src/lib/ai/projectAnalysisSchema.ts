import type {
  ActionStep,
  ClarifyingQuestion,
  ConfidenceLevel,
  LegalBasis,
  ProjectAnalysis,
  QuestionImpactArea,
  RequiredDocument,
  RiskItem,
  SpecialistRecommendation,
} from "../../types/architecture";

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["low", "medium", "high"];
const DOC_STATUSES = ["missing", "partial", "available", "uncertain"] as const;
const DOC_PRIORITIES = ["critical", "high", "medium"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const SPEC_PRIORITIES = ["essential", "recommended", "conditional"] as const;
const CLARIFICATION_AREAS = [
  "planning",
  "documentation",
  "formal_path",
  "specialists",
  "existing_building",
  "technical",
  "constraints",
] as const;

const IMPACT_AREAS: QuestionImpactArea[] = [
  "planning",
  "documentation",
  "investor_brief",
  "geotechnics",
  "fire_safety",
  "road_access",
  "utilities",
  "structure",
  "environment",
  "formal_path",
];

const RELATED_TO_IMPACT: Record<
  (typeof CLARIFICATION_AREAS)[number],
  QuestionImpactArea
> = {
  planning: "planning",
  documentation: "documentation",
  formal_path: "formal_path",
  specialists: "fire_safety",
  existing_building: "structure",
  technical: "utilities",
  constraints: "environment",
};

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

function pushEnumError(errors: string[], path: string, value: unknown, allowed: readonly string[]): void {
  errors.push(`${path}: invalid enum "${String(value)}" (allowed: ${allowed.join("|")})`);
}

function validateDocument(v: unknown, path: string, errors: string[]): RequiredDocument | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.name)) errors.push(`${path}.name: missing or wrong type`);
  if (!isString(v.reason)) errors.push(`${path}.reason: missing or wrong type`);
  if (!DOC_STATUSES.includes(v.status as (typeof DOC_STATUSES)[number])) {
    pushEnumError(errors, `${path}.status`, v.status, DOC_STATUSES);
  }
  if (!DOC_PRIORITIES.includes(v.priority as (typeof DOC_PRIORITIES)[number])) {
    pushEnumError(errors, `${path}.priority`, v.priority, DOC_PRIORITIES);
  }
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;
  return {
    id: v.id as string,
    name: v.name as string,
    abbreviation: isString(v.abbreviation) ? v.abbreviation : undefined,
    status: v.status as RequiredDocument["status"],
    priority: v.priority as RequiredDocument["priority"],
    reason: v.reason as string,
    relatedStage: isString(v.relatedStage) ? v.relatedStage : undefined,
  };
}

function validateAction(v: unknown, path: string, errors: string[]): ActionStep | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.title)) errors.push(`${path}.title: missing or wrong type`);
  if (!isString(v.description)) errors.push(`${path}.description: missing or wrong type`);
  if (!isNumber(v.order)) errors.push(`${path}.order: missing or wrong type (number required)`);
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;
  return {
    id: v.id as string,
    order: v.order as number,
    title: v.title as string,
    description: v.description as string,
    responsible: isString(v.responsible) ? v.responsible : undefined,
    dependsOn: isStringArray(v.dependsOn) ? v.dependsOn : undefined,
    badge: isString(v.badge) ? v.badge : undefined,
    timeframe: isString(v.timeframe) ? v.timeframe : undefined,
  };
}

function validateSpecialist(v: unknown, path: string, errors: string[]): SpecialistRecommendation | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.discipline)) errors.push(`${path}.discipline: missing or wrong type`);
  if (!isString(v.role)) errors.push(`${path}.role: missing or wrong type`);
  if (!isString(v.whenNeeded)) errors.push(`${path}.whenNeeded: missing or wrong type`);
  if (!isString(v.inputRequired)) errors.push(`${path}.inputRequired: missing or wrong type`);
  if (!isString(v.outputDeliverable)) errors.push(`${path}.outputDeliverable: missing or wrong type`);
  if (!isString(v.reason)) errors.push(`${path}.reason: missing or wrong type`);
  if (!SPEC_PRIORITIES.includes(v.priority as (typeof SPEC_PRIORITIES)[number])) {
    pushEnumError(errors, `${path}.priority`, v.priority, SPEC_PRIORITIES);
  }
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;
  return {
    id: v.id as string,
    discipline: v.discipline as string,
    role: v.role as string,
    whenNeeded: v.whenNeeded as string,
    inputRequired: v.inputRequired as string,
    outputDeliverable: v.outputDeliverable as string,
    priority: v.priority as SpecialistRecommendation["priority"],
    reason: v.reason as string,
  };
}

function validateLegal(v: unknown, path: string, errors: string[]): LegalBasis | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.title)) errors.push(`${path}.title: missing or wrong type`);
  if (!isString(v.description)) errors.push(`${path}.description: missing or wrong type`);
  if (!isString(v.scope)) errors.push(`${path}.scope: missing or wrong type`);
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;
  return {
    id: v.id as string,
    title: v.title as string,
    description: v.description as string,
    scope: v.scope as string,
    sourceRef: isString(v.sourceRef) ? v.sourceRef : undefined,
    verificationRequired: v.verificationRequired === true,
  };
}

function validateRisk(v: unknown, path: string, errors: string[]): RiskItem | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.title)) errors.push(`${path}.title: missing or wrong type`);
  if (!isString(v.description)) errors.push(`${path}.description: missing or wrong type`);
  if (!isString(v.mitigation)) errors.push(`${path}.mitigation: missing or wrong type`);
  if (!isString(v.category)) errors.push(`${path}.category: missing or wrong type`);
  if (!RISK_LEVELS.includes(v.level as (typeof RISK_LEVELS)[number])) {
    pushEnumError(errors, `${path}.level`, v.level, RISK_LEVELS);
  }
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;
  return {
    id: v.id as string,
    title: v.title as string,
    description: v.description as string,
    level: v.level as RiskItem["level"],
    mitigation: v.mitigation as string,
    category: v.category as string,
  };
}

function validateClarifyingQuestion(
  v: unknown,
  path: string,
  errors: string[]
): ProjectAnalysis["clarifyingQuestionsAsked"][number] | null {
  if (!isRecord(v)) {
    errors.push(`${path}: expected object`);
    return null;
  }
  if (!isString(v.id)) errors.push(`${path}.id: missing or wrong type`);
  if (!isString(v.question)) errors.push(`${path}.question: missing or wrong type`);
  if (!isString(v.reason)) errors.push(`${path}.reason: missing or wrong type`);
  if (!isString(v.relatedArea)) {
    errors.push(`${path}.relatedArea: missing or wrong type`);
  } else if (!CLARIFICATION_AREAS.includes(v.relatedArea as (typeof CLARIFICATION_AREAS)[number])) {
    pushEnumError(errors, `${path}.relatedArea`, v.relatedArea, CLARIFICATION_AREAS);
  }
  if (errors.some((e) => e.startsWith(`${path}.`))) return null;

  const relatedArea = v.relatedArea as ClarifyingQuestion["relatedArea"];
  const priority = isString(v.priority)
    ? (v.priority as ClarifyingQuestion["priority"])
    : "important";
  const impactArea =
    isString(v.impactArea) && IMPACT_AREAS.includes(v.impactArea as QuestionImpactArea)
      ? (v.impactArea as QuestionImpactArea)
      : RELATED_TO_IMPACT[relatedArea];
  const impactOnCompleteness = isNumber(v.impactOnCompleteness)
    ? Math.max(5, Math.min(20, Math.round(v.impactOnCompleteness)))
    : priority === "critical"
      ? 18
      : priority === "optional"
        ? 7
        : 12;

  return {
    id: v.id as string,
    question: v.question as string,
    reason: v.reason as string,
    options: isStringArray(v.options) ? v.options : undefined,
    requiredForFinalPlan: v.requiredForFinalPlan === true,
    relatedArea,
    impactArea,
    impactOnCompleteness,
    priority,
    triggerReason: isString(v.triggerReason) ? v.triggerReason : (v.reason as string),
  };
}

/** Collects all schema validation errors (for dev logging and UI). */
export function collectProjectAnalysisErrors(raw: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return ["root: expected JSON object"];
  }

  if (!isString(raw.projectType)) errors.push("projectType: missing or wrong type");
  if (!isString(raw.projectStage)) errors.push("projectStage: missing or wrong type");
  if (!isNumber(raw.advancementPercentage)) errors.push("advancementPercentage: missing or wrong type (number)");
  if (
    raw.analysisCompletenessPercentage !== undefined &&
    !isNumber(raw.analysisCompletenessPercentage)
  ) {
    errors.push("analysisCompletenessPercentage: wrong type (number)");
  }
  if (!isString(raw.immediateNextStep)) errors.push("immediateNextStep: missing or wrong type");
  if (!isString(raw.disclaimer)) errors.push("disclaimer: missing or wrong type");

  if (!CONFIDENCE_LEVELS.includes(raw.confidenceLevel as ConfidenceLevel)) {
    pushEnumError(errors, "confidenceLevel", raw.confidenceLevel, CONFIDENCE_LEVELS);
  }

  if (!isStringArray(raw.detectedInputs)) errors.push("detectedInputs: must be string[]");
  if (!isStringArray(raw.uncertainInputs)) errors.push("uncertainInputs: must be string[]");

  if (!Array.isArray(raw.missingDocuments)) {
    errors.push("missingDocuments: must be array");
  } else {
    raw.missingDocuments.forEach((item, i) => validateDocument(item, `missingDocuments[${i}]`, errors));
  }

  if (!Array.isArray(raw.recommendedActions)) {
    errors.push("recommendedActions: must be array");
  } else {
    raw.recommendedActions.forEach((item, i) => validateAction(item, `recommendedActions[${i}]`, errors));
  }

  if (!Array.isArray(raw.specialists)) {
    errors.push("specialists: must be array");
  } else {
    raw.specialists.forEach((item, i) => validateSpecialist(item, `specialists[${i}]`, errors));
  }

  if (!Array.isArray(raw.legalBasis)) {
    errors.push("legalBasis: must be array");
  } else {
    raw.legalBasis.forEach((item, i) => validateLegal(item, `legalBasis[${i}]`, errors));
  }

  if (!Array.isArray(raw.risks)) {
    errors.push("risks: must be array");
  } else {
    raw.risks.forEach((item, i) => validateRisk(item, `risks[${i}]`, errors));
  }

  if (!Array.isArray(raw.clarifyingQuestionsAsked)) {
    errors.push("clarifyingQuestionsAsked: must be array");
  } else {
    raw.clarifyingQuestionsAsked.forEach((item, i) =>
      validateClarifyingQuestion(item, `clarifyingQuestionsAsked[${i}]`, errors)
    );
  }

  return errors;
}

/** Parses raw JSON into a ProjectAnalysis-shaped object (untrusted until validateAnalysis). */
export function parseProjectAnalysisJson(raw: unknown): ProjectAnalysis | null {
  const errors = collectProjectAnalysisErrors(raw);
  if (errors.length > 0 || !isRecord(raw)) return null;

  const missingDocuments: RequiredDocument[] = [];
  for (const item of raw.missingDocuments as unknown[]) {
    const doc = validateDocument(item, "missingDocuments", []);
    if (doc) missingDocuments.push(doc);
  }

  const recommendedActions: ActionStep[] = [];
  for (const item of raw.recommendedActions as unknown[]) {
    const action = validateAction(item, "recommendedActions", []);
    if (action) recommendedActions.push(action);
  }

  const specialists: SpecialistRecommendation[] = [];
  for (const item of raw.specialists as unknown[]) {
    const spec = validateSpecialist(item, "specialists", []);
    if (spec) specialists.push(spec);
  }

  const legalBasis: LegalBasis[] = [];
  for (const item of raw.legalBasis as unknown[]) {
    const legal = validateLegal(item, "legalBasis", []);
    if (legal) legalBasis.push(legal);
  }

  const risks: RiskItem[] = [];
  for (const item of raw.risks as unknown[]) {
    const risk = validateRisk(item, "risks", []);
    if (risk) risks.push(risk);
  }

  const clarifyingQuestionsAsked: ProjectAnalysis["clarifyingQuestionsAsked"] = [];
  for (const item of raw.clarifyingQuestionsAsked as unknown[]) {
    const q = validateClarifyingQuestion(item, "clarifyingQuestionsAsked", []);
    if (q) clarifyingQuestionsAsked.push(q);
  }

  return {
    projectType: raw.projectType as string,
    projectStage: raw.projectStage as string,
    advancementPercentage: Math.min(100, Math.max(0, Math.round(raw.advancementPercentage as number))),
    analysisCompletenessPercentage: Math.min(
      100,
      Math.max(
        0,
        Math.round(
          isNumber(raw.analysisCompletenessPercentage)
            ? (raw.analysisCompletenessPercentage as number)
            : 30
        )
      )
    ),
    confidenceLevel: raw.confidenceLevel as ConfidenceLevel,
    detectedInputs: raw.detectedInputs as string[],
    uncertainInputs: raw.uncertainInputs as string[],
    missingDocuments,
    recommendedActions,
    specialists,
    legalBasis,
    risks,
    clarifyingQuestionsAsked,
    immediateNextStep: raw.immediateNextStep as string,
    disclaimer: raw.disclaimer as string,
    projectSubtype: isString(raw.projectSubtype) ? raw.projectSubtype : undefined,
    investorBriefStage: isString(raw.investorBriefStage) ? raw.investorBriefStage : undefined,
    geotechnicalStatus: isString(raw.geotechnicalStatus) ? raw.geotechnicalStatus : undefined,
    investorBriefChecklist: isStringArray(raw.investorBriefChecklist) ? raw.investorBriefChecklist : undefined,
  };
}
