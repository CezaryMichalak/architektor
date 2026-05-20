import { ARCHITECTURE_RULES } from "../data/architectureRules";
import {
  evaluateMissingIntakeGroups,
  getIntakeGroupPriority,
  getIntakeQuestionsForMissingGroups,
  INTAKE_DATA_GROUPS,
  type IntakeGroupId,
} from "../data/intakeDataGroups";
import { getProjectTypeEntry } from "../data/projectTypeMatrix";
import type {
  ClarificationArea,
  ClarifyingQuestion,
  ClarifyingQuestionInput,
  ProjectSignal,
  QuestionImpactArea,
  QuestionPriority,
} from "../types/architecture";
import {
  calculateAnalysisCompleteness,
  shouldShowClarification,
} from "./calculateAnalysisCompleteness";
import type { ProjectTypeKey } from "../types/projectType";

type ComplexityTier = "simple" | "standard" | "complex" | "very_complex";

const PRIORITY_ORDER: Record<QuestionPriority, number> = {
  critical: 0,
  important: 1,
  optional: 2,
};

const DEFAULT_IMPACT_BY_PRIORITY: Record<QuestionPriority, number> = {
  critical: 18,
  important: 12,
  optional: 7,
};

const INTAKE_GROUP_BY_ID = new Map(
  INTAKE_DATA_GROUPS.map((g) => [g.id, g])
);

const RELATED_TO_IMPACT: Record<ClarificationArea, QuestionImpactArea> = {
  planning: "planning",
  documentation: "documentation",
  formal_path: "formal_path",
  specialists: "fire_safety",
  existing_building: "structure",
  technical: "utilities",
  constraints: "environment",
};

const COMPLEXITY_QUESTION_BOUNDS: Record<
  ComplexityTier,
  { min: number; max: number }
> = {
  simple: { min: 3, max: 6 },
  standard: { min: 5, max: 8 },
  complex: { min: 8, max: 10 },
  very_complex: { min: 8, max: 12 },
};

/** Max questions by classified project type (user spec: simple 0–3, residential 3–5, etc.). */
function maxQuestionsForType(projectType: ProjectTypeKey): number {
  switch (projectType) {
    case "single_family":
      return 6;
    case "multi_family":
      return 9;
    case "service":
    case "office":
    case "retail":
    case "public_utility":
    case "extension_reconstruction":
    case "change_of_use":
      return 10;
    case "warehouse":
    case "warehouse_service_hall":
    case "production_hall":
    case "factory_industrial":
      return 10;
    case "unknown":
    default:
      return 6;
  }
}

const TIER_LIMITS: Record<ComplexityTier, number> = {
  simple: 6,
  standard: 8,
  complex: 10,
  very_complex: 12,
};

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

function intakeGroupPriorityFromTrigger(triggerReason: string): number {
  const match = triggerReason.match(/^group:([^:]+)/);
  if (!match) return 500;
  const group = INTAKE_GROUP_BY_ID.get(match[1] as IntakeGroupId);
  return group ? getIntakeGroupPriority(group) : 500;
}

function makeQuestion(partial: ClarifyingQuestionInput): ClarifyingQuestion {
  const priority = partial.priority ?? "important";
  const relatedArea = partial.relatedArea;
  const impactArea =
    partial.impactArea ?? RELATED_TO_IMPACT[relatedArea] ?? "documentation";
  const impactOnCompleteness =
    partial.impactOnCompleteness ?? DEFAULT_IMPACT_BY_PRIORITY[priority];
  return {
    ...partial,
    priority,
    relatedArea,
    impactArea,
    impactOnCompleteness: Math.max(5, Math.min(20, impactOnCompleteness)),
    requiredForFinalPlan:
      partial.requiredForFinalPlan ?? priority === "critical",
  };
}

function mergeQuestions(questions: ClarifyingQuestion[]): ClarifyingQuestion[] {
  const byId = new Map<string, ClarifyingQuestion>();
  for (const q of questions) {
    const existing = byId.get(q.id);
    if (!existing || PRIORITY_ORDER[q.priority] < PRIORITY_ORDER[existing.priority]) {
      byId.set(q.id, q);
    }
  }
  return [...byId.values()];
}

function getProjectType(signals: ProjectSignal[]): ProjectTypeKey {
  const subtype = signalValue(signals, "projectSubtype");
  if (subtype) return String(subtype) as ProjectTypeKey;
  const cat = String(signalValue(signals, "buildingCategory") ?? "");
  const map: Record<string, ProjectTypeKey> = {
    single_family: "single_family",
    multi_family: "multi_family",
    service: "service",
    services: "service",
    office: "office",
    retail: "retail",
    warehouse: "warehouse",
    warehouse_service_hall: "warehouse_service_hall",
    production_hall: "production_hall",
    factory_industrial: "factory_industrial",
    public: "public_utility",
    public_utility: "public_utility",
  };
  return map[cat] ?? "unknown";
}

function assessComplexity(signals: ProjectSignal[]): ComplexityTier {
  const pt = getProjectType(signals);
  const entry = getProjectTypeEntry(pt);
  if (entry.complexityTier === "simple") return "simple";
  if (entry.complexityTier === "very_complex") return "very_complex";
  if (entry.complexityTier === "complex") return "complex";

  let score = 0;

  if (hasSignal(signals, "buildingType", "existing") || hasSignal(signals, "buildingType", "mixed")) {
    score += 2;
  }
  const cat = String(signalValue(signals, "buildingCategory") ?? "");
  if (cat && cat !== "single_family") score += 2;
  if (hasSignal(signals, "planningStatus", "no_mpzp")) score += 2;
  if (
    hasSignal(signals, "hasConservationConstraint", true) ||
    hasSignal(signals, "hasEnvironmentalConstraint", true)
  ) {
    score += 2;
  }
  if (hasSignal(signals, "formalPathUnclear", true)) score += 1;
  if (hasSignal(signals, "changeOfUse", true)) score += 2;
  if (hasSignal(signals, "roadAccessUnclear", true) || hasSignal(signals, "utilitiesUnclear", true)) {
    score += 1;
  }
  if (hasSignal(signals, "planningStatus", "unknown")) score += 2;
  if (hasSignal(signals, "projectStageUnclear", true)) score += 1;
  if (signalValue(signals, "promptWordCount") !== undefined) {
    const words = Number(signalValue(signals, "promptWordCount"));
    if (words < 8) score += 1;
  }

  const lowConfidence = signals.filter((s) => s.confidence === "low").length;
  score += Math.min(lowConfidence, 3);

  if (score <= 2) return "simple";
  if (score <= 5) return "standard";
  if (score <= 8) return "complex";
  return "very_complex";
}

function isInputCompleteEnough(signals: ProjectSignal[]): boolean {
  const planning = signalValue(signals, "planningStatus");
  const hasCategory = hasSignal(signals, "buildingCategory");
  const mpzpOk =
    planning !== "mpzp_exists" ||
    hasSignal(signals, "hasMpzpExcerpt", true) ||
    hasSignal(signals, "hasPartialPlanningParams", true);
  const mdcpOk =
    hasSignal(signals, "hasMdcp", true) ||
    (hasSignal(signals, "hasMdcp", false) && !hasSignal(signals, "mdcpStatus", "unknown"));
  const stageOk = !hasSignal(signals, "projectStageUnclear", true);
  const functionOk = hasCategory;

  if (planning === "unknown") return false;
  if (!functionOk) return false;
  if (!mpzpOk && planning === "mpzp_exists") return false;
  if (!mdcpOk && needsMdcpForStage(signals)) return false;
  if (!stageOk) return false;

  const tier = assessComplexity(signals);
  if (tier === "simple" && planning && mpzpOk && mdcpOk) {
    return !hasSignal(signals, "roadAccessUnclear", true) && !hasSignal(signals, "utilitiesUnclear", true);
  }
  return false;
}

function needsMdcpForStage(signals: ProjectSignal[]): boolean {
  const stage = String(signalValue(signals, "projectStage") ?? "");
  return stage === "preliminary" || stage === "building_permit_docs";
}

function collectRuleQuestions(signals: ProjectSignal[]): ClarifyingQuestion[] {
  const out: ClarifyingQuestion[] = [];
  for (const rule of ARCHITECTURE_RULES) {
    if (!rule.condition(signals)) continue;
    for (const q of rule.clarificationTriggers) {
      out.push(
        makeQuestion({
          ...q,
          priority: q.priority ?? (q.requiredForFinalPlan ? "important" : "optional"),
          triggerReason: q.triggerReason ?? rule.id,
        })
      );
    }
  }
  return out;
}

function buildDynamicQuestions(signals: ProjectSignal[]): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];
  const planning = signalValue(signals, "planningStatus");
  const tier = assessComplexity(signals);
  const noMpzpOrWz =
    planning === "no_mpzp" || planning === "wz_path" || hasSignal(signals, "locationNoMpzp", true);

  // 1. Planning unknown → critical
  if (planning === "unknown") {
    questions.push(
      makeQuestion({
        id: "cq-planning-status",
        question:
          "Czy dla działki inwestycyjnej obowiązuje MPZP (z możliwością wydania wypisu i wyrysu), czy jedyną ścieżką ustalenia parametrów zabudowy pozostaje decyzja o warunkach zabudowy (WZ)?",
        reason:
          "Status planistyczny determinuje dokument wejściowy do koncepcji, zakres weryfikacji w organie AAB oraz kolejność działań: ustalenia z MPZP (przeznaczenie, linia zabudowy, intensywność, PBC) albo postępowanie WZ — bez tego nie można rzetelnie zaplanować PZT/PAB ani wstępnie ocenić ścieżki PnB lub zgłoszenia.",
        options: ["Obowiązuje MPZP", "Brak MPZP — ścieżka WZ", "Wymaga weryfikacji w urzędzie"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "planning",
        triggerReason: "planning_unknown",
      })
    );
  }

  // 2. MPZP exists, no excerpt → important (never ask if MPZP exists when already known)
  if (
    planning === "mpzp_exists" &&
    !hasSignal(signals, "hasMpzpExcerpt", true) &&
    !hasSignal(signals, "hasPartialPlanningParams", true)
  ) {
    questions.push(
      makeQuestion({
        id: "cq-mpzp-excerpt",
        question:
          "Czy posiadasz wypis i wyrys z obowiązującego MPZP albo pełną treść uchwały planu wraz z załącznikiem graficznym?",
        reason:
          "Dokument stanowi podstawę weryfikacji przeznaczenia terenu, linii zabudowy, intensywności, PBC, geometrii dachu i pozostałych parametrów — bez nich nie należy rozwijać PZT/PAB ani zakładać zgodności z planem miejscowym.",
        options: ["Tak — posiadam", "Nie — do uzyskania", "Częściowo / w trakcie"],
        requiredForFinalPlan: true,
        priority: "important",
        relatedArea: "documentation",
        triggerReason: "mpzp_no_excerpt",
      })
    );
    questions.push(
      makeQuestion({
        id: "cq-planning-params",
        question:
          "Czy znane są przeznaczenie terenu oraz parametry z MPZP istotne dla projektu (intensywność, wysokość, linia zabudowy, udział powierzchni biologicznie czynnej)?",
        reason:
          "Te ustalenia muszą być znane przed opracowaniem koncepcji zabudowy i układu na PZT; brak parametrów wymusza wstrzymanie prac do czasu wypisu lub analizy treści planu i wpływa na zgodność PAB z organem AAB.",
        options: ["Tak, mam ustalenia", "Częściowo", "Nie — wymagam wypisu"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "planning",
        triggerReason: "mpzp_params_unknown",
      })
    );
  }

  // 3. No MPZP → WZ feasibility
  if (noMpzpOrWz && planning !== "unknown") {
    questions.push(
      makeQuestion({
        id: "cq-wz-feasibility",
        question:
          "Czy planowane jest zainicjowanie postępowania o decyzję o warunkach zabudowy (WZ) jako formalnej podstawy parametrów zabudowy przy braku obowiązującego MPZP?",
        reason:
          "Przy braku MPZP decyzja WZ zwykle stanowi dokument wejściowy do koncepcji i dokumentacji PZT/PAB; wybór lub rezygnacja z tej ścieżki może determinować harmonogram, zakres uzgodnień z organem oraz wstępną ocenę trybu PnB/zgłoszenie.",
        options: ["Tak — planuję WZ", "Nie — inna podstawa planistyczna", "Nie wiem — wymaga analizy"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "formal_path",
        triggerReason: "no_mpzp_wz_path",
      })
    );
  }

  // 4. MDCP — only if status unknown; not if user said brak mapy
  const mdcpKnown = hasSignal(signals, "hasMdcp", true) || hasSignal(signals, "hasMdcp", false);
  const skipMdcpForExtension =
    getProjectType(signals) === "extension_reconstruction" &&
    (hasSignal(signals, "buildingType", "existing") || hasSignal(signals, "buildingType", "mixed"));
  if (!mdcpKnown && !hasSignal(signals, "mdcpStatus", "declared_missing") && !skipMdcpForExtension) {
    questions.push(
      makeQuestion({
        id: "cq-mdcp-status",
        question:
          "Czy dysponujesz aktualną mapą do celów projektowych (MDCP) opracowaną na podstawie geodezyjnego pomiaru granic działki?",
        reason:
          "MDCP jest dokumentem wejściowym do lokalizacji obiektu na PZT i współrzędnych w PAB; jej brak na etapie wstępnym lub dokumentacji na PnB wymaga wcześniejszego zlecenia geodecie przed opracowaniem zagospodarowania terenu.",
        options: ["Tak", "Nie — do zamówienia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: needsMdcpForStage(signals) ? "critical" : "important",
        relatedArea: "documentation",
        triggerReason: "mdcp_unknown",
      })
    );
  }
  if (
    hasSignal(signals, "hasMdcp", false) &&
    needsMdcpForStage(signals) &&
    !hasSignal(signals, "hasPzt", true)
  ) {
    questions.push(
      makeQuestion({
        id: "cq-plot-boundaries",
        question:
          "Czy granice działki ewidencyjnej są oznakowane w terenie i możliwe do powtórzenia w pomiarze geodezyjnym pod MDCP?",
        reason:
          "Prawidłowo ustalone granice stanowią warunek wykonania MDCP i uniknięcia kolizji z sąsiednim zabudowaniem na etapie PZT — bez tego geodeta nie może opracować mapy stanowiącej podstawę dalszej dokumentacji projektowej.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "documentation",
        triggerReason: "mdcp_missing_late_stage",
      })
    );
  }

  // 5. Existing building
  if (hasSignal(signals, "buildingType", "existing") || hasSignal(signals, "buildingType", "mixed")) {
    questions.push(
      makeQuestion({
        id: "cq-existing-inventory",
        question:
          "Czy wykonano inwentaryzację architektoniczną istniejącego budynku oraz wstępną ocenę stanu konstrukcyjnego i parametrów charakterystycznych (nośność, rozpiętości, instalacje)?",
        reason:
          "Przy rozbudowie, przebudowie lub nadbudowie te materiały są dokumentem wejściowym do PAB i koordynacji z projektantem konstrukcji — brak inwentaryzacji może wymusić zmianę zakresu robót po pierwszych ustaleniach branżowych.",
        options: ["Tak — kompletna", "Częściowo", "Nie — do zlecenia", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "existing_building",
        triggerReason: "existing_building_inventory",
      })
    );
    questions.push(
      makeQuestion({
        id: "cq-building-scope",
        question:
          "Jaki jest przewidywany zakres robót budowlanych (rozbudowa, przebudowa, nadbudowa, zmiana sposobu użytkowania) i czy wpływa on na parametry planistyczne lub kubaturę?",
        reason:
          "Zakres robót determinuje wymagany poziom dokumentacji PZT/PAB, konieczność uzgodnień konserwatorskich oraz to, czy wystarczy aktualizacja opracowań, czy wymagana jest pełna ścieżka formalna w organie AAB (PnB lub zgłoszenie).",
        options: [
          "Rozbudowa",
          "Przebudowa",
          "Nadbudowa",
          "Zmiana użytkowania",
          "Kilka z powyższych",
        ],
        requiredForFinalPlan: true,
        priority: "important",
        relatedArea: "existing_building",
        triggerReason: "existing_building_scope",
      })
    );
  }

  // 6. Unclear function
  if (!hasSignal(signals, "buildingCategory")) {
    questions.push(
      makeQuestion({
        id: "cq-building-function",
        question:
          "Jaka kategoria inwestycji jest planowana (budynek mieszkalny jednorodzinny, wielorodzinny, usługowy, użyteczności publicznej, przemysłowy, inna)?",
        reason:
          "Kategoria funkcji determinuje wymagania PPOŻ, sanitarne, dostępnościowe oraz zakres koordynacji branżowej na etapie PZT/PAB — bez tego nie można dobrać właściwej ścieżki uzgodnień ani ocenić trybu formalnego.",
        options: [
          "Mieszkalna jednorodzinna",
          "Mieszkalna wielorodzinna",
          "Usługowa / handlowa",
          "Użyteczność publiczna",
          "Inna / mieszana",
        ],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "technical",
        triggerReason: "function_unclear",
      })
    );
  }

  // 7. Non-simple residential — targeted specialists
  const cat = String(signalValue(signals, "buildingCategory") ?? "");
  if (cat === "multi_family") {
    questions.push(
      makeQuestion({
        id: "cq-fire-accessibility",
        question:
          "Czy na etapie koncepcji uwzględniono wstępne założenia PPOŻ (strefy pożarowe, drogi pożarowe, odległości) oraz wymagania dostępności, w tym miejsc postojowych dla osób z niepełnosprawnościami?",
        reason:
          "Przy budynkach wielorodzinnych wczesna koordynacja PPOŻ i dostępności na PZT ogranicza ryzyko przeprojektowania PAB i opóźnień w uzgodnieniu z organem AAB.",
        options: ["Tak — wstępnie", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "specialists",
        triggerReason: "multi_family_ppoż",
      })
    );
    questions.push(
      makeQuestion({
        id: "cq-parking-multi",
        question:
          "Czy ustalono wymagania dotyczące liczby i lokalizacji miejsc postojowych oraz drogi pożarowej / dojazdu zgodnie z MPZP i przepisami o dostępności?",
        reason:
          "Te parametry wpływają na układ zagospodarowania na PZT i muszą być znane przed zamrożeniem koncepcji kubaturowej w PAB.",
        options: ["Tak", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "planning",
        triggerReason: "multi_family_parking",
      })
    );
  }
  if (
    ["service", "services", "retail", "commercial", "office", "production_hall", "factory_industrial", "industrial"].includes(
      cat
    )
  ) {
    questions.push(
      makeQuestion({
        id: "cq-fire-sanitary-services",
        question:
          "Czy dla funkcji usługowej lub handlowej określono wstępne wymagania PPOŻ oraz sanitarne (strefy, wentylacja, odległości od granic, pojemność instalacji)?",
        reason:
          "Obiekty inne niż prosta zabudowa mieszkaniowa wymagają koordynacji z branżystą PPOŻ i sanitarnym już na etapie koncepcji PZT — brak ustaleń może uniemożliwić złożenie kompletnej dokumentacji na PnB.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "specialists",
        triggerReason: "services_ppoż_sanitary",
      })
    );
  }
  if (cat === "public") {
    questions.push(
      makeQuestion({
        id: "cq-public-accessibility",
        question:
          "Czy uwzględniono wymagania dostępności architektonicznej dla obiektu użyteczności publicznej (drogi, wejścia, toalety, oznakowanie)?",
        reason:
          "Obiekty UP podlegają rozszerzonym wymaganiom dostępności; ich wczesne wpisanie w koncepcję PZT/PAB jest warunkiem uzgodnień i późniejszej zgodności przy składaniu dokumentacji do organu AAB.",
        options: ["Tak — wstępnie", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "specialists",
        triggerReason: "public_accessibility",
      })
    );
  }

  // 8. Constraints — targeted only when not already confirmed
  if (
    hasSignal(signals, "hasConservationConstraint", true) &&
    !hasSignal(signals, "conservationScopeConfirmed", true)
  ) {
    questions.push(
      makeQuestion({
        id: "cq-conservation-scope",
        question:
          "Czy uzyskano wstępne ustalenia konserwatorskie co do dopuszczalnego zakresu robót, kubatury, materiałów i formy architektonicznej w strefie ochrony?",
        reason:
          "Ograniczenia konserwatorskie mogą determinować koncepcję jeszcze przed kosztownym opracowaniem PAB i wpływają na tryb uzgodnień z wojewódzkim konserwatorem zabytków — brak ustaleń może wymusić przeprojektowanie całej ścieżki formalnej.",
        options: ["Tak", "Częściowo", "Nie — wymagane", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "constraints",
        triggerReason: "conservation_constraint",
      })
    );
  } else if (
    hasSignal(signals, "hasEnvironmentalConstraint", true) &&
    !hasSignal(signals, "environmentScopeConfirmed", true)
  ) {
    questions.push(
      makeQuestion({
        id: "cq-environment-scope",
        question:
          "Czy przeprowadzono wstępną identyfikację ograniczeń środowiskowych (obszary Natura 2000, formy ochrony przyrody, tory liniowe, buforowe strefy ochronne)?",
        reason:
          "Ograniczenia środowiskowe mogą wymagać dodatkowych opinii i wydłużyć ścieżkę formalną PnB; wczesna identyfikacja na etapie koncepcji/PZT pozwala uniknąć kolizji z zagospodarowaniem terenu.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "constraints",
        triggerReason: "environment_constraint",
      })
    );
  } else if (
    !hasSignal(signals, "hasConservationConstraint", true) &&
    !hasSignal(signals, "hasEnvironmentalConstraint", true) &&
    tier === "complex"
  ) {
    questions.push(
      makeQuestion({
        id: "cq-constraints-screening",
        question:
          "Czy dla terenu inwestycji zweryfikowano obecność ograniczeń konserwatorskich, środowiskowych lub dotyczących drzewostanu (ochrona zabytków, Natura 2000, pomniki przyrody, ochrona drzew)?",
        reason:
          "Wczesne wykluczenie lub potwierdzenie ograniczeń ogranicza ryzyko przeprojektowania PZT/PAB i nieplanowanych procedur w organie AAB przed złożeniem wniosku o pozwolenie na budowę.",
        options: ["Tak — konserwacja", "Tak — środowisko", "Tak — oba", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "optional",
        relatedArea: "constraints",
        triggerReason: "constraints_screening",
      })
    );
  }

  // 10. Unclear stage
  if (hasSignal(signals, "projectStageUnclear", true)) {
    questions.push(
      makeQuestion({
        id: "cq-project-stage",
        question:
          "Na jakim etapie opracowania jest inwestycja (koncepcja urbanistyczna, projekt zagospodarowania PZT, dokumentacja PAB na PnB, projekt techniczny, realizacja)?",
        reason:
          "Etap determinuje, które dokumenty wejściowe są obowiązkowe (MPZP, MDCP, inwentaryzacja) i czy dalsze prace powinny skupić się na uzupełnieniu braków, czy na koordynacji branżowej pod wniosek do organu AAB.",
        options: ["Koncepcja", "Etap wstępny / PZT", "Dokumentacja na PnB", "Realizacja", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "documentation",
        triggerReason: "stage_unclear",
      })
    );
  }
  if (
    needsMdcpForStage(signals) &&
    hasSignal(signals, "hasMdcp", false) &&
    (hasSignal(signals, "hasPzt", true) || hasSignal(signals, "hasPab", true))
  ) {
    questions.push(
      makeQuestion({
        id: "cq-stage-mdcp-mismatch",
        question:
          "Wskazano etap z opracowaniem PZT lub PAB, lecz brak MDCP — czy mapa geodezyjna i dokumentacja są prowadzone równolegle zgodnie z harmonogramem?",
        reason:
          "PZT i PAB wymagają podstawy geodezyjnej (MDCP); kontynuowanie opracowań bez mapy stanowi lukę procesową i może uniemożliwić złożenie kompletnego wniosku w organie AAB.",
        options: ["Tak — równolegle", "Nie — etap do skorygowania", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "documentation",
        triggerReason: "late_stage_missing_mdcp",
      })
    );
  }

  // Formal path — only simple residential when unclear
  if (
    hasSignal(signals, "formalPathUnclear", true) &&
    cat === "single_family" &&
    !hasSignal(signals, "formalPathConfirmed", true)
  ) {
    questions.push(
      makeQuestion({
        id: "cq-formal-path",
        question:
          "Czy zamierzenie budowlane obejmuje wyłącznie budynek mieszkalny jednorodzinny o zakresie kwalifikowanym do uproszczonego trybu (po weryfikacji zakresu robót)?",
        reason:
          "Rodzaj obiektu i zakres robót mogą determinować ścieżkę pozwolenia na budowę lub zgłoszenia — wstępna kwalifikacja ogranicza ryzyko błędnego trybu formalnego i korekty dokumentacji w organie AAB.",
        options: ["Tak — dom jednorodzinny", "Nie — szerszy zakres", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "optional",
        relatedArea: "formal_path",
        triggerReason: "formal_path_unclear",
      })
    );
  }

  // Optional program detail for MPZP + complete docs simple case
  if (
    planning === "mpzp_exists" &&
    hasSignal(signals, "hasMpzpExcerpt", true) &&
    hasSignal(signals, "hasMdcp", true) &&
    cat === "single_family" &&
    tier === "simple"
  ) {
    questions.push(
      makeQuestion({
        id: "cq-building-program",
        question:
          "Jaka jest planowana powierzchnia użytkowa i liczba kondygnacji nadziemnych w stosunku do parametrów z MPZP?",
        reason:
          "Te dane pozwalają na wstępną weryfikację zgodności z intensywnością, wysokością i linią zabudowy przed rozwinięciem PAB i oceną trybu formalnego.",
        options: undefined,
        requiredForFinalPlan: false,
        priority: "optional",
        relatedArea: "technical",
        triggerReason: "optional_program_detail",
      })
    );
  }

  return questions;
}

/** Questions from missing critical data groups (professional intake interview). */
function buildIntakeGroupQuestions(signals: ProjectSignal[], prompt: string): ClarifyingQuestion[] {
  const projectType = getProjectType(signals);
  const ctx = { signals, prompt, projectType };
  const missingGroups = evaluateMissingIntakeGroups(ctx);
  const inputs = getIntakeQuestionsForMissingGroups(missingGroups, ctx);
  return inputs.map((q) =>
    makeQuestion({
      ...q,
      impactArea: q.impactArea,
      triggerReason: q.triggerReason,
    })
  );
}

/** Skip questions already answered via extracted signals, prompt, or rule duplicates. */
function filterAnswered(
  questions: ClarifyingQuestion[],
  signals: ProjectSignal[],
  prompt: string
): ClarifyingQuestion[] {
  const planning = signalValue(signals, "planningStatus");

  return questions.filter((q) => {
    switch (q.id) {
      case "cq-planning-status":
      case "cq-planning-status-fallback":
        return planning === "unknown";
      case "cq-mpzp-excerpt":
        return planning === "mpzp_exists" && !hasSignal(signals, "hasMpzpExcerpt", true);
      case "cq-planning-params":
        return (
          planning === "mpzp_exists" &&
          !hasSignal(signals, "hasMpzpExcerpt", true) &&
          !hasSignal(signals, "hasPartialPlanningParams", true)
        );
      case "cq-wz-feasibility":
      case "cq-wz-intent":
        return planning === "no_mpzp" || planning === "wz_path";
      case "cq-mdcp-status":
        return !hasSignal(signals, "hasMdcp", true) && !hasSignal(signals, "hasMdcp", false);
      case "cq-mdcp-exists":
        return false;
      case "cq-plot-boundaries":
        return hasSignal(signals, "hasMdcp", false);
      case "cq-existing-inventory":
        return (
          hasSignal(signals, "buildingType", "existing") ||
          hasSignal(signals, "buildingType", "mixed")
        );
      case "cq-building-scope":
        return (
          (hasSignal(signals, "buildingType", "existing") ||
            hasSignal(signals, "buildingType", "mixed")) &&
          !hasSignal(signals, "scopeConfirmed", true)
        );
      case "cq-building-function":
        return !hasSignal(signals, "buildingCategory");
      case "cq-constraints":
        return (
          !hasSignal(signals, "hasConservationConstraint", true) &&
          !hasSignal(signals, "hasEnvironmentalConstraint", true)
        );
      case "cq-conservation-scope":
        return (
          hasSignal(signals, "hasConservationConstraint", true) &&
          !hasSignal(signals, "conservationScopeConfirmed", true)
        );
      case "cq-fire-sanitary-services":
        return ["service", "services", "retail", "commercial", "office", "industrial"].includes(
          String(signalValue(signals, "buildingCategory") ?? "")
        );
      case "cq-geotechnical":
        return !hasSignal(signals, "hasGeotechnicalOpinion", true);
      case "cq-investor-brief":
        return !hasSignal(signals, "hasInvestorBrief", true);
      case "cq-technology-brief":
        return !hasSignal(signals, "hasTechnologyBrief", true);
      case "cq-storage-height":
        return (
          ["warehouse", "warehouse_service_hall"].includes(getProjectType(signals)) &&
          !hasSignal(signals, "warehouseStorageDefined", true)
        );
      case "cq-floor-slab":
        return (
          ["warehouse", "warehouse_service_hall"].includes(getProjectType(signals)) &&
          !/obciążen.*posadzk|posadzk.*obciąż|płyt.*fundament|regał.*obciąż/i.test(prompt)
        );
      case "cq-fire-load-warehouse":
        return (
          ["warehouse", "warehouse_service_hall"].includes(getProjectType(signals)) &&
          !hasSignal(signals, "warehouseFireLoadDefined", true)
        );
      case "cq-docks-tir":
        return (
          ["warehouse", "warehouse_service_hall"].includes(getProjectType(signals)) &&
          !hasSignal(signals, "warehouseDocksDefined", true)
        );
      case "cq-warehouse-utilities":
      case "cq-stormwater-industrial":
        return ["warehouse", "warehouse_service_hall", "production_hall", "factory_industrial"].includes(
          getProjectType(signals)
        );
      case "cq-warehouse-environment":
        return (
          ["warehouse", "warehouse_service_hall"].includes(getProjectType(signals)) &&
          !hasSignal(signals, "environmentScopeConfirmed", true)
        );
      case "cq-structural-existing":
      case "cq-installations-existing":
        return (
          getProjectType(signals) === "extension_reconstruction" ||
          hasSignal(signals, "buildingType", "existing")
        );
      case "cq-new-function-planning":
        return getProjectType(signals) === "change_of_use" || hasSignal(signals, "changeOfUse", true);
      case "cq-fire-accessibility":
      case "cq-parking-multi":
        return signalValue(signals, "buildingCategory") === "multi_family";
      case "cq-public-accessibility":
        return signalValue(signals, "buildingCategory") === "public";
      case "cq-road-access":
        return hasSignal(signals, "roadAccessUnclear", true);
      case "cq-utilities":
        return hasSignal(signals, "utilitiesUnclear", true);
      case "cq-project-stage":
        return hasSignal(signals, "projectStageUnclear", true);
      case "cq-formal-path":
        return (
          hasSignal(signals, "formalPathUnclear", true) &&
          signalValue(signals, "buildingCategory") === "single_family"
        );
      case "cq-building-program":
        return (
          planning === "mpzp_exists" &&
          hasSignal(signals, "hasMpzpExcerpt", true) &&
          hasSignal(signals, "hasMdcp", true)
        );
      default:
        return true;
    }
  });
}

function resolveQuestionCap(
  tier: ComplexityTier,
  completeness: number,
  projectType: ProjectTypeKey,
  missingGroupCount: number
): number {
  if (completeness >= 70) return 0;
  const bounds = COMPLEXITY_QUESTION_BOUNDS[tier];
  const deficitRatio = Math.min(1, (70 - completeness) / 70);
  const gapBoost = Math.min(3, Math.max(0, Math.floor(missingGroupCount / 3)));
  const scaled =
    bounds.min + Math.round((bounds.max - bounds.min) * deficitRatio) + gapBoost;
  return Math.min(bounds.max, maxQuestionsForType(projectType), scaled, TIER_LIMITS[tier] + 2);
}

function rankAndLimit(
  questions: ClarifyingQuestion[],
  tier: ComplexityTier,
  projectType: ProjectTypeKey,
  completeness: number,
  missingGroupCount: number
): ClarifyingQuestion[] {
  const cap = resolveQuestionCap(tier, completeness, projectType, missingGroupCount);
  if (cap === 0) return [];

  const allowOptional =
    tier === "complex" || tier === "very_complex" || projectType !== "single_family";
  const filtered = questions.filter(
    (q) => allowOptional || q.priority !== "optional"
  );

  const sorted = [...filtered].sort((a, b) => {
    const priorityOrder = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityOrder !== 0) return priorityOrder;
    return (
      intakeGroupPriorityFromTrigger(a.triggerReason) -
      intakeGroupPriorityFromTrigger(b.triggerReason)
    );
  });

  return sorted.slice(0, cap);
}

export function generateClarifyingQuestions(
  signals: ProjectSignal[],
  prompt = ""
): ClarifyingQuestion[] {
  const completeness = calculateAnalysisCompleteness(signals, prompt);
  if (completeness >= 70 && isInputCompleteEnough(signals)) {
    return [];
  }

  const tier = assessComplexity(signals);
  const pt = getProjectType(signals);
  const intake = buildIntakeGroupQuestions(signals, prompt);
  const dynamic = buildDynamicQuestions(signals);
  const fromRules = collectRuleQuestions(signals);
  const merged = mergeQuestions([...intake, ...dynamic, ...fromRules]);
  const filtered = filterAnswered(merged, signals, prompt);

  if (filtered.length === 0 || completeness >= 70) {
    return [];
  }

  const missingGroupCount = evaluateMissingIntakeGroups({
    signals,
    prompt,
    projectType: pt,
  }).length;

  return rankAndLimit(filtered, tier, pt, completeness, missingGroupCount);
}

export function needsClarification(signals: ProjectSignal[], prompt: string): boolean {
  const questions = generateClarifyingQuestions(signals, prompt);
  const completeness = calculateAnalysisCompleteness(signals, prompt);
  return shouldShowClarification(completeness, questions.length);
}

export function getComplexityTier(signals: ProjectSignal[]): ComplexityTier {
  return assessComplexity(signals);
}
