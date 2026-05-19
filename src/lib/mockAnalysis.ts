import { ARCHITECTURE_RULES } from "../data/architectureRules";
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
import { STAGE_LABELS } from "../data/knowledgeBase";
import { calculateProjectProgress } from "./calculateProjectProgress";
import { extractProjectSignals, signalsToDetectedLabels } from "./extractProjectSignals";
import { generateClarifyingQuestions } from "./generateClarifyingQuestions";

function applyClarificationAnswers(
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

function selectSpecialists(signals: ProjectSignal[]): SpecialistRecommendation[] {
  const ids = new Set<string>(["architect"]);
  const cat = String(signals.find((s) => s.key === "buildingCategory")?.value ?? "");
  const mdcp = signals.find((s) => s.key === "hasMdcp")?.value;
  const existing = signals.find((s) => s.key === "buildingType")?.value === "existing";
  const conservation = signals.find((s) => s.key === "hasConservationConstraint")?.value === true;
  const env = signals.find((s) => s.key === "hasEnvironmentalConstraint")?.value === true;

  if (mdcp === false) ids.add("surveyor");
  if (existing || cat !== "single_family") ids.add("structural");
  if (cat === "multi_family" || cat === "services" || cat === "public") {
    ids.add("installations");
    ids.add("fire");
    ids.add("accessibility");
  } else if (cat !== "single_family") {
    ids.add("installations");
  }
  if (conservation) ids.add("conservation");
  if (env) ids.add("environment");

  return SPECIALIST_MATRIX.filter((s) => ids.has(s.id));
}

function computeConfidence(signals: ProjectSignal[]): "low" | "medium" | "high" {
  const unknownPlanning = signals.find((s) => s.key === "planningStatus")?.value === "unknown";
  const lowCount = signals.filter((s) => s.confidence === "low").length;
  if (unknownPlanning || lowCount >= 3) return "low";
  if (lowCount >= 1 || !signals.find((s) => s.key === "buildingCategory")) return "medium";
  return "high";
}

function buildUncertainInputs(signals: ProjectSignal[]): string[] {
  const uncertain: string[] = [];
  if (signals.find((s) => s.key === "planningStatus")?.value === "unknown") {
    uncertain.push("Status planistyczny terenu (MPZP / WZ / inne ustalenia)");
  }
  if (signals.find((s) => s.key === "formalPathUnclear")?.value === true) {
    uncertain.push("Tryb formalny: pozwolenie na budowę vs zgłoszenie");
  }
  if (!signals.find((s) => s.key === "buildingCategory")) {
    uncertain.push("Kategoria i funkcja obiektu");
  }
  const avoidWz = signals.find((s) => s.key === "avoidWzPrimary")?.value === true;
  if (avoidWz) {
    uncertain.push("Ścieżka WZ — nie rekomendowana jako pierwsza przy obowiązującym MPZP");
  }
  return uncertain;
}

function projectTypeLabel(signals: ProjectSignal[]): string {
  const cat = signals.find((s) => s.key === "buildingCategory")?.value;
  const inv = signals.find((s) => s.key === "investmentType")?.value;
  const map: Record<string, string> = {
    single_family: "Budynek mieszkalny jednorodzinny",
    multi_family: "Budynek mieszkalny wielorodzinny",
    services: "Budynek usługowy",
    public: "Obiekt użyteczności publicznej",
  };
  if (cat && map[String(cat)]) return map[String(cat)];
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
  let order = 1;

  for (const rule of matchedRules) {
    if (avoidWzPrimary && rule.id === "rule-no-mpzp-wz") continue;

    documents.push(...rule.requiredDocuments);
    for (const step of rule.nextSteps) {
      actions.push({ ...step, order: order++ });
    }
    risks.push(...rule.risks);
    legal.push(...rule.legalBasis);
  }

  if (avoidWzPrimary) {
    actions = actions.filter(
      (a) => !a.badge || a.badge !== "WZ" || !a.title.toLowerCase().includes("wniosek o wz")
    );
  }

  documents = dedupeDocuments(documents);
  actions.sort((a, b) => a.order - b.order);
  risks = risks.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
  legal = legal.filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);

  const specialists = selectSpecialists(signals);
  const advancement = calculateProjectProgress(signals);
  const stageKey = String(signals.find((s) => s.key === "projectStage")?.value ?? "preliminary");
  const confidence = computeConfidence(signals);

  const immediate =
    actions[0]?.title ??
    (documents[0]
      ? `Priorytet: ${documents[0].name}`
      : "Uzupełnij dane wejściowe i zweryfikuj status planistyczny działki.");

  return {
    projectType: projectTypeLabel(signals),
    projectStage: STAGE_LABELS[stageKey] ?? STAGE_LABELS.unknown,
    advancementPercentage: advancement,
    confidenceLevel: confidence,
    detectedInputs: signalsToDetectedLabels(signals),
    uncertainInputs: buildUncertainInputs(signals),
    missingDocuments: documents,
    recommendedActions: actions,
    specialists,
    legalBasis: legal,
    risks,
    clarifyingQuestionsAsked: questionsAsked,
    immediateNextStep: immediate,
    disclaimer: DISCLAIMER_PL,
  };
}

export function preliminaryAnalysis(
  prompt: string,
  structuredFields?: StructuredProjectFields
) {
  const signals = extractProjectSignals(prompt, structuredFields);
  const questions = generateClarifyingQuestions(signals);
  return { signals, questions };
}
