import { ARCHITECTURE_RULES } from "../data/architectureRules";
import { evaluateGeotechnicalNeeds } from "../data/geotechnicalRules";
import { evaluateInvestorBrief } from "../data/investorBriefRules";
import { getProjectTypeEntry } from "../data/projectTypeMatrix";
import { SPECIALIST_MATRIX } from "../data/specialistMatrix";
import type {
  ActionStep,
  ClarificationAnswer,
  LegalBasis,
  ProjectAnalysis,
  ProjectSignal,
  RequiredDocument,
  RiskItem,
  SpecialistRecommendation,
  StructuredProjectFields,
} from "../types/architecture";
import { DISCLAIMER_PL } from "../types/architecture";
import type { ProjectTypeKey } from "../types/projectType";
import { STAGE_LABELS } from "../data/knowledgeBase";
import { calculateAnalysisCompleteness } from "./calculateAnalysisCompleteness";
import { calculateProjectProgress } from "./calculateProjectProgress";
import { describeActionStep } from "./actionDescriptions";
import { buildTypeSpecificActionPlan } from "./buildTypeActionPlan";
import { classifyProjectType } from "./classifyProjectType";
import { deduplicateActions } from "./deduplicateActions";
import { extractProjectSignals, signalsToDetectedLabels } from "./extractProjectSignals";
import { generateClarifyingQuestions } from "./generateClarifyingQuestions";

export function applyClarificationAnswers(
  signals: ProjectSignal[],
  answers: ClarificationAnswer[]
): ProjectSignal[] {
  const updated = [...signals];
  const answerMap = new Map(answers.filter((a) => !a.skipped).map((a) => [a.questionId, a.answer]));

  const planning = answerMap.get("cq-planning-status") ?? answerMap.get("cq-planning-status-fallback");
  if (planning) {
    if (/mpzp|tak.*mpzp/i.test(planning)) {
      updated.push({
        key: "planningStatus",
        label: "Status planistyczny",
        value: "mpzp_exists",
        source: "clarification",
        confidence: "high",
      });
    } else if (/brak/i.test(planning)) {
      updated.push({
        key: "planningStatus",
        label: "Status planistyczny",
        value: "no_mpzp",
        source: "clarification",
        confidence: "high",
      });
    }
  }

  const excerpt = answerMap.get("cq-mpzp-excerpt");
  if (excerpt && /tak|posiadam/i.test(excerpt)) {
    updated.push({
      key: "hasMpzpExcerpt",
      label: "Wypis i wyrys MPZP",
      value: true,
      source: "clarification",
      confidence: "high",
    });
  }

  const mdcp = answerMap.get("cq-mdcp-status");
  if (mdcp) {
    if (/tak/i.test(mdcp)) {
      updated.push({
        key: "hasMdcp",
        label: "MDCP",
        value: true,
        source: "clarification",
        confidence: "high",
      });
    } else if (/nie/i.test(mdcp)) {
      updated.push({
        key: "hasMdcp",
        label: "MDCP",
        value: false,
        source: "clarification",
        confidence: "high",
      });
    }
  }

  for (const [qid, key] of [
    ["cq-storage-height", "warehouseStorageDefined"],
    ["cq-docks-tir", "warehouseDocksDefined"],
    ["cq-fire-load-warehouse", "warehouseFireLoadDefined"],
    ["cq-floor-slab", "warehouseSlabLoadsDefined"],
    ["cq-stormwater-industrial", "warehouseStormwaterDefined"],
    ["cq-warehouse-utilities", "warehouseUtilitiesDefined"],
  ] as const) {
    const ans = answerMap.get(qid);
    if (ans && /tak|ustalone|częściowo/i.test(ans)) {
      updated.push({
        key,
        label: "Parametry magazynu",
        value: true,
        source: "clarification",
        confidence: "medium",
      });
    }
  }

  const geo = answerMap.get("cq-geotechnical");
  if (geo && /tak|posiadam|zlecone|w trakcie/i.test(geo)) {
    updated.push({
      key: "hasGeotechnicalOpinion",
      label: "Opinia geotechniczna",
      value: true,
      source: "clarification",
      confidence: "medium",
    });
  }

  const params = answerMap.get("cq-planning-params");
  if (params && /tak|częściowo/i.test(params)) {
    updated.push({
      key: "hasPartialPlanningParams",
      label: "Parametry planistyczne",
      value: true,
      source: "clarification",
      confidence: "medium",
    });
  }

  const formal = answerMap.get("cq-formal-path");
  if (formal && /jednorodzinny/i.test(formal)) {
    updated.push({
      key: "formalPathUnclear",
      label: "Tryb formalny",
      value: true,
      source: "clarification",
      confidence: "low",
    });
  }

  const constraints = answerMap.get("cq-constraints");
  if (constraints) {
    if (/konserw/i.test(constraints)) {
      updated.push({
        key: "hasConservationConstraint",
        label: "Ochrona konserwatorska",
        value: true,
        source: "clarification",
        confidence: "high",
      });
    }
    if (/środow|oba/i.test(constraints)) {
      updated.push({
        key: "hasEnvironmentalConstraint",
        label: "Ochrona środowiska",
        value: true,
        source: "clarification",
        confidence: "high",
      });
    }
  }

  return updated;
}

function dedupeDocuments(docs: RequiredDocument[]): RequiredDocument[] {
  const map = new Map<string, RequiredDocument>();
  for (const d of docs) {
    const existing = map.get(d.id);
    if (!existing || d.priority === "critical") map.set(d.id, d);
  }
  return [...map.values()].sort((a, b) => {
    const p = { critical: 0, high: 1, medium: 2 };
    return p[a.priority] - p[b.priority];
  });
}

function getProjectTypeKey(signals: ProjectSignal[]): ProjectTypeKey {
  const subtype = signals.find((s) => s.key === "projectSubtype")?.value;
  return (subtype ? String(subtype) : "unknown") as ProjectTypeKey;
}

function selectSpecialists(signals: ProjectSignal[], prompt: string): SpecialistRecommendation[] {
  const pt = getProjectTypeKey(signals);
  const entry = getProjectTypeEntry(pt);
  const classification = classifyProjectType(signals, prompt);
  const ids = new Set<string>(["architect", ...entry.typicalSpecialists]);

  const mdcp = signals.find((s) => s.key === "hasMdcp")?.value;
  const existing =
    signals.find((s) => s.key === "buildingType")?.value === "existing" ||
    classification.isExtension;
  const conservation = signals.find((s) => s.key === "hasConservationConstraint")?.value === true;
  const env = signals.find((s) => s.key === "hasEnvironmentalConstraint")?.value === true;
  const hasGeo = signals.find((s) => s.key === "hasGeotechnicalOpinion")?.value === true;

  if (mdcp === false) ids.add("surveyor");
  if (!hasGeo && (classification.isNewBuilding || classification.isIndustrial || classification.isExtension)) {
    ids.add("geotechnical");
  }
  if (existing) ids.add("structural");
  if (conservation) ids.add("conservation");
  if (env || classification.isIndustrial) ids.add("environment");
  if (pt === "warehouse" || pt === "warehouse_service_hall") ids.add("traffic");
  if (pt === "factory_industrial" || pt === "production_hall") ids.add("technology");

  return SPECIALIST_MATRIX.filter((s) => ids.has(s.id));
}

function computeConfidence(signals: ProjectSignal[]): "low" | "medium" | "high" {
  const unknownPlanning = signals.find((s) => s.key === "planningStatus")?.value === "unknown";
  const lowCount = signals.filter((s) => s.confidence === "low").length;
  if (unknownPlanning || lowCount >= 3) return "low";
  if (lowCount >= 1 || !signals.find((s) => s.key === "buildingCategory")) return "medium";
  return "high";
}

function sanitizeActionDescriptions(actions: ActionStep[]): ActionStep[] {
  return actions.map((a) => ({
    ...a,
    description:
      a.description.trim() === a.title.trim()
        ? describeActionStep(a.title)
        : a.description,
  }));
}

function buildUncertainInputs(signals: ProjectSignal[]): string[] {
  const uncertain: string[] = [];
  const planning = signals.find((s) => s.key === "planningStatus")?.value;
  if (planning === "unknown") {
    uncertain.push("Status planistyczny terenu (MPZP / WZ / inne ustalenia)");
  }
  if (signals.find((s) => s.key === "formalPathUnclear")?.value === true) {
    uncertain.push("Tryb formalny: pozwolenie na budowę vs zgłoszenie");
  }
  if (!signals.find((s) => s.key === "buildingCategory")) {
    uncertain.push("Kategoria i funkcja obiektu");
  }
  return uncertain;
}

function projectTypeLabel(signals: ProjectSignal[]): string {
  const label = signals.find((s) => s.key === "projectTypeLabel")?.value;
  if (label) return String(label);
  const pt = getProjectTypeKey(signals);
  if (pt !== "unknown") return getProjectTypeEntry(pt).labelPl;
  const inv = signals.find((s) => s.key === "investmentType")?.value;
  if (inv) return String(inv);
  return "Inwestycja budowlana — typ do doprecyzowania";
}

export function mockAnalysis(
  prompt: string,
  structuredFields?: StructuredProjectFields,
  clarificationAnswers: ClarificationAnswer[] = [],
  questionsAsked: ReturnType<typeof generateClarifyingQuestions> = []
): ProjectAnalysis {
  let signals = extractProjectSignals(prompt, structuredFields);
  signals = applyClarificationAnswers(signals, clarificationAnswers);

  const matchedRules = ARCHITECTURE_RULES.filter((r) => r.condition(signals));
  const avoidWzPrimary = signals.some(
    (s) => s.key === "avoidWzPrimary" && s.value === true
  );

  let documents: RequiredDocument[] = [];
  let actions: ActionStep[] = [];
  let risks: RiskItem[] = [];
  let legal: LegalBasis[] = [];

  const pt = getProjectTypeKey(signals);
  const classification = classifyProjectType(signals, prompt);

  const geo = evaluateGeotechnicalNeeds({
    projectType: pt,
    isNewBuilding: classification.isNewBuilding,
    isIndustrial: classification.isIndustrial,
    isExtension: classification.isExtension,
    hasGeotechnicalOpinion: signals.some(
      (s) => s.key === "hasGeotechnicalOpinion" && s.value === true
    ),
  });
  documents.push(...geo.documents);
  risks.push(...geo.risks);
  legal.push(...geo.legalBasis);

  const brief = evaluateInvestorBrief(
    pt,
    signals.some((s) => s.key === "hasInvestorBrief" && s.value === true),
    signals.some((s) => s.key === "investorBriefStage" && s.value === "partial")
  );
  if (brief.document) documents.push(brief.document);
  legal.push(...brief.legalBasis);

  for (const rule of matchedRules) {
    if (avoidWzPrimary && rule.id === "rule-no-mpzp-wz") continue;

    documents.push(...rule.requiredDocuments);
    for (const step of rule.nextSteps) {
      actions.push({ ...step });
    }
    risks.push(...rule.risks);
    legal.push(...rule.legalBasis);
  }

  const typeActions = buildTypeSpecificActionPlan(signals, prompt, 1);
  actions = sanitizeActionDescriptions(
    deduplicateActions([...typeActions, ...actions], pt)
  );

  if (avoidWzPrimary) {
    actions = actions.filter(
      (a) => !a.badge || a.badge !== "WZ" || !a.title.toLowerCase().includes("wniosek o wz")
    );
  }

  documents = dedupeDocuments(documents);
  actions.sort((a, b) => a.order - b.order);
  risks = risks.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
  legal = legal.filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);

  const specialists = selectSpecialists(signals, prompt);
  const advancement = calculateProjectProgress(signals);
  const analysisCompleteness = calculateAnalysisCompleteness(
    signals,
    prompt,
    clarificationAnswers,
    questionsAsked
  );
  const stageKey = String(signals.find((s) => s.key === "projectStage")?.value ?? "preliminary");
  const confidence = computeConfidence(signals);

  const immediate =
    actions[0]?.title ??
    (documents[0]
      ? `Priorytet: ${documents[0].name}`
      : "Uzupełnij dane wejściowe i zweryfikuj status planistyczny działki.");

  const uncertainInputs = buildUncertainInputs(signals);
  if (pt === "unknown") {
    uncertainInputs.push("Kategoria i funkcja obiektu — wymaga krytycznego doprecyzowania");
  }

  return {
    projectType: projectTypeLabel(signals),
    projectSubtype: pt !== "unknown" ? pt : undefined,
    projectStage: STAGE_LABELS[stageKey] ?? STAGE_LABELS.unknown,
    advancementPercentage: advancement,
    analysisCompletenessPercentage: analysisCompleteness,
    confidenceLevel: confidence,
    detectedInputs: signalsToDetectedLabels(signals),
    uncertainInputs,
    missingDocuments: documents,
    recommendedActions: actions,
    specialists,
    legalBasis: legal,
    risks,
    clarifyingQuestionsAsked: questionsAsked,
    immediateNextStep: immediate,
    disclaimer: DISCLAIMER_PL,
    investorBriefStage: brief.status,
    geotechnicalStatus: geo.status,
    investorBriefChecklist: brief.checklist,
  };
}

export function preliminaryAnalysis(
  prompt: string,
  structuredFields?: StructuredProjectFields
) {
  const signals = extractProjectSignals(prompt, structuredFields);
  const questions = generateClarifyingQuestions(signals, prompt);
  return { signals, questions };
}
