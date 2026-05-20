import { DISCLAIMER_PL } from "../../types/architecture";

const CONFIDENCE_MAP: Record<string, "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  niski: "low",
  średni: "medium",
  sredni: "medium",
  wysoki: "high",
};

const RISK_LEVEL_MAP: Record<string, "low" | "medium" | "high"> = {
  ...CONFIDENCE_MAP,
  minimal: "low",
  moderate: "medium",
  severe: "high",
  krytyczny: "high",
};

const DOC_STATUS_MAP: Record<string, "missing" | "partial" | "available" | "uncertain"> = {
  missing: "missing",
  partial: "partial",
  available: "available",
  uncertain: "uncertain",
  brak: "missing",
  częściowy: "partial",
  czesciowy: "partial",
  dostępny: "available",
  dostepny: "available",
};

const DOC_PRIORITY_MAP: Record<string, "critical" | "high" | "medium"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  krytyczny: "critical",
  wysoki: "high",
  średni: "medium",
  sredni: "medium",
};

const SPEC_PRIORITY_MAP: Record<string, "essential" | "recommended" | "conditional"> = {
  essential: "essential",
  recommended: "recommended",
  conditional: "conditional",
  wymagany: "essential",
  zalecany: "recommended",
  warunkowy: "conditional",
};

const ALLOWED_ROOT_KEYS = new Set([
  "projectType",
  "projectStage",
  "advancementPercentage",
  "confidenceLevel",
  "detectedInputs",
  "uncertainInputs",
  "missingDocuments",
  "recommendedActions",
  "specialists",
  "legalBasis",
  "risks",
  "clarifyingQuestionsAsked",
  "immediateNextStep",
  "disclaimer",
  "projectSubtype",
  "investorBriefStage",
  "geotechnicalStatus",
  "investorBriefChecklist",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  return undefined;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => asString(x)).filter((x): x is string => Boolean(x));
  }
  const s = asString(v);
  return s ? [s] : [];
}

function mapEnum<T extends string>(value: unknown, map: Record<string, T>, fallback: T): T {
  const key = asString(value)?.toLowerCase() ?? "";
  return map[key] ?? fallback;
}

function stripWykonacPrefix(text: string): string {
  return text.replace(/^wykonać:\s*/i, "").replace(/^wykonac:\s*/i, "").trim();
}

function normalizeDescription(title: string, description: unknown): string {
  let desc = asString(description) ?? "";
  desc = stripWykonacPrefix(desc);
  if (!desc || desc === title.trim()) {
    return title;
  }
  return desc;
}

function normalizeDocument(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const id = asString(item.id) ?? `doc-${index + 1}`;
  const name = asString(item.name) ?? asString(item.label) ?? asString(item.title) ?? "Dokument";
  const reason = asString(item.reason) ?? asString(item.description) ?? "Wymagany na obecnym etapie projektu.";
  return {
    id,
    name,
    abbreviation: asString(item.abbreviation),
    status: mapEnum(item.status, DOC_STATUS_MAP, "missing"),
    priority: mapEnum(item.priority, DOC_PRIORITY_MAP, "high"),
    reason,
    relatedStage: asString(item.relatedStage),
  };
}

function normalizeAction(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const title = asString(item.title) ?? asString(item.name) ?? `Krok ${index + 1}`;
  const orderRaw = item.order;
  const order =
    typeof orderRaw === "number" && !Number.isNaN(orderRaw)
      ? orderRaw
      : typeof orderRaw === "string" && /^\d+$/.test(orderRaw)
        ? parseInt(orderRaw, 10)
        : index + 1;
  return {
    id: asString(item.id) ?? `action-${index + 1}`,
    order,
    title,
    description: normalizeDescription(title, item.description ?? item.details),
    responsible: asString(item.responsible),
    dependsOn: asStringArray(item.dependsOn),
    badge: asString(item.badge),
    timeframe: asString(item.timeframe),
  };
}

function normalizeSpecialist(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const discipline = asString(item.discipline) ?? asString(item.specialty) ?? "Branża";
  const role = asString(item.role) ?? discipline;
  const whenNeeded =
    asString(item.whenNeeded) ??
    asString(item.whenToInvolve) ??
    asString(item.when) ??
    "Na etapie koncepcji i dokumentacji projektowej.";
  const inputRequired =
    asString(item.inputRequired) ??
    asString(item.requiredInput) ??
    "Dane wejściowe z briefu i ustaleń planistycznych.";
  const outputDeliverable =
    asString(item.outputDeliverable) ??
    asString(item.expectedOutput) ??
    "Opracowanie branżowe do koordynacji PZT/PAB.";
  const reason =
    asString(item.reason) ?? "Wymagany do bezpiecznej koordynacji projektu na obecnym etapie.";
  return {
    id: asString(item.id) ?? `spec-${index + 1}`,
    discipline,
    role,
    whenNeeded,
    inputRequired,
    outputDeliverable,
    priority: mapEnum(item.priority, SPEC_PRIORITY_MAP, "recommended"),
    reason,
  };
}

function normalizeLegal(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const title = asString(item.title) ?? asString(item.label) ?? asString(item.name) ?? "Podstawa prawna";
  const scope =
    asString(item.scope) ??
    asString(item.category) ??
    asString(item.type) ??
    "planning";
  const description =
    asString(item.description) ??
    asString(item.summary) ??
    "Ogólne odniesienie do przepisów — wymaga weryfikacji w aktualnym stanie prawnym.";
  const verificationNote = asString(item.verificationNote);
  const verificationRequired =
    item.verificationRequired === true ||
    verificationNote?.toLowerCase().includes("weryfik") === true;
  return {
    id: asString(item.id) ?? `legal-${index + 1}`,
    title,
    description,
    scope,
    sourceRef: asString(item.sourceRef) ?? asString(item.source),
    verificationRequired,
  };
}

function normalizeRisk(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  return {
    id: asString(item.id) ?? `risk-${index + 1}`,
    title: asString(item.title) ?? "Ryzyko projektowe",
    description:
      asString(item.description) ?? "Ryzyko wymaga monitorowania w trakcie opracowania dokumentacji.",
    level: mapEnum(item.level ?? item.severity, RISK_LEVEL_MAP, "medium"),
    mitigation:
      asString(item.mitigation) ??
      asString(item.mitigationPlan) ??
      "Uzupełnić dane wejściowe i skoordynować z projektantami branżowymi.",
    category: asString(item.category) ?? "technical",
  };
}

function normalizeClarifyingQuestion(item: unknown, index: number): Record<string, unknown> | null {
  if (!isRecord(item)) return null;
  const question = asString(item.question);
  if (!question) return null;
  const reason = asString(item.reason) ?? asString(item.triggerReason) ?? "Wymaga doprecyzowania.";
  const relatedArea = asString(item.relatedArea) ?? "technical";
  return {
    id: asString(item.id) ?? `cq-ai-${index + 1}`,
    question,
    reason,
    options: asStringArray(item.options),
    requiredForFinalPlan: item.requiredForFinalPlan === true,
    relatedArea,
    priority: asString(item.priority) ?? "important",
    triggerReason: asString(item.triggerReason) ?? reason,
  };
}

function normalizeArray<T>(
  value: unknown,
  normalizer: (item: unknown, index: number) => T | null
): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, i) => normalizer(item, i)).filter((x): x is T => x !== null);
}

/** Best-effort normalization before schema validation (AI output varies). */
export function normalizeAiAnalysisPayload(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const o: Record<string, unknown> = {};
  for (const key of ALLOWED_ROOT_KEYS) {
    if (key in raw) o[key] = raw[key];
  }

  o.disclaimer =
    asString(o.disclaimer) && String(o.disclaimer).trim() ? String(o.disclaimer).trim() : DISCLAIMER_PL;

  o.detectedInputs = asStringArray(o.detectedInputs);
  o.uncertainInputs = asStringArray(o.uncertainInputs);
  o.investorBriefChecklist = asStringArray(o.investorBriefChecklist);

  o.missingDocuments = normalizeArray(o.missingDocuments, normalizeDocument);
  o.recommendedActions = normalizeArray(o.recommendedActions, normalizeAction);
  o.specialists = normalizeArray(o.specialists, normalizeSpecialist);
  o.legalBasis = normalizeArray(o.legalBasis, normalizeLegal);
  o.risks = normalizeArray(o.risks, normalizeRisk);
  o.clarifyingQuestionsAsked = normalizeArray(o.clarifyingQuestionsAsked, normalizeClarifyingQuestion);

  if (typeof o.advancementPercentage === "string" && /^\d+$/.test(o.advancementPercentage)) {
    o.advancementPercentage = parseInt(o.advancementPercentage, 10);
  }
  if (typeof o.advancementPercentage !== "number" || Number.isNaN(o.advancementPercentage)) {
    o.advancementPercentage = 20;
  }

  o.confidenceLevel = mapEnum(o.confidenceLevel, CONFIDENCE_MAP, "medium");
  o.projectStage = asString(o.projectStage) ?? "Etap wstępny";
  o.projectType = asString(o.projectType) ?? "Inwestycja budowlana";
  o.immediateNextStep =
    asString(o.immediateNextStep) ??
    "Uzupełnij dane wejściowe i zweryfikuj status planistyczny działki.";

  if (o.projectSubtype !== undefined) o.projectSubtype = asString(o.projectSubtype);
  if (o.investorBriefStage !== undefined) o.investorBriefStage = asString(o.investorBriefStage);
  if (o.geotechnicalStatus !== undefined) o.geotechnicalStatus = asString(o.geotechnicalStatus);

  return o;
}
