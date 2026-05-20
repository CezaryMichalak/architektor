import type {
  ClarificationArea,
  ClarifyingQuestionInput,
  ProjectSignal,
  QuestionImpactArea,
} from "../types/architecture";
import type { ProjectTypeKey } from "../types/projectType";

export type IntakeGroupId =
  | "planning_basis"
  | "surveying_mdcp"
  | "investor_brief"
  | "storage_logistics"
  | "traffic_docks"
  | "fire_safety"
  | "geotechnics"
  | "utilities_media"
  | "stormwater"
  | "structure_loads"
  | "environment_noise"
  | "pum_parking"
  | "accessibility_fire"
  | "technology_brief"
  | "hazardous_environment"
  | "existing_inventory"
  | "structural_existing"
  | "installations_existing"
  | "change_of_use_planning"
  | "function_category"
  | "road_access"
  | "conservation_constraints";

export interface IntakeEvalContext {
  signals: ProjectSignal[];
  prompt: string;
  projectType: ProjectTypeKey;
}

export interface IntakeDataGroup {
  id: IntakeGroupId;
  labelPl: string;
  /** Lower number = asked earlier (planning before optional env). */
  priority: number;
  impactArea: QuestionImpactArea;
  /** When false, group is skipped entirely for this context. */
  isRelevant: (ctx: IntakeEvalContext) => boolean;
  isSatisfied: (ctx: IntakeEvalContext) => boolean;
  questions: ClarifyingQuestionInput[];
}

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

function promptMatches(prompt: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(prompt));
}

function planningStatus(ctx: IntakeEvalContext): string | undefined {
  return String(signalValue(ctx.signals, "planningStatus") ?? "");
}

function isIndustrialType(projectType: ProjectTypeKey): boolean {
  return [
    "warehouse",
    "warehouse_service_hall",
    "production_hall",
    "factory_industrial",
  ].includes(projectType);
}

function planningBasisSatisfied(ctx: IntakeEvalContext): boolean {
  const planning = planningStatus(ctx);
  if (!planning || planning === "unknown") return false;
  if (planning === "mpzp_exists") {
    return (
      hasSignal(ctx.signals, "hasMpzpExcerpt", true) ||
      hasSignal(ctx.signals, "hasPartialPlanningParams", true) ||
      promptMatches(ctx.prompt, [
        /wypis\s+i\s+wyrys/i,
        /mam\s+wypis/i,
        /parametr.*mpzp/i,
        /intensywność/i,
        /linia\s+zabudowy/i,
      ])
    );
  }
  if (planning === "no_mpzp" || planning === "wz_path") {
    return promptMatches(ctx.prompt, [
      /warunki\s+zabudowy/i,
      /\bwz\b/i,
      /decyzj[aeę]\s+o\s+warunkach/i,
      /postępowanie\s+o\s+wz/i,
    ]);
  }
  return true;
}

function surveyingSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "hasMdcp", true)) return true;
  if (hasSignal(ctx.signals, "hasMdcp", false)) return true;
  if (hasSignal(ctx.signals, "mdcpStatus", "declared_missing")) return true;
  return promptMatches(ctx.prompt, [
    /\bmdcp\b/i,
    /mapa\s+do\s+celów\s+projektowych/i,
    /brak\s+mdcp/i,
    /nie\s+zamówion.*map/i,
  ]);
}

function investorBriefSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "hasInvestorBrief", true)) return true;
  if (hasSignal(ctx.signals, "investorBriefStage", "partial")) return true;
  const status = signalValue(ctx.signals, "investorBriefStatus");
  if (status === "available" || status === "partial") return true;
  return promptMatches(ctx.prompt, [
    /brief\s+(projektowy|inwestora|technologiczno)/i,
    /wytyczne\s+inwestora/i,
    /program\s+funkcjonaln/i,
    /mam\s+wytyczne/i,
  ]);
}

function geotechnicsSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "hasGeotechnicalOpinion", true)) return true;
  if (hasSignal(ctx.signals, "hasGeotechnicalOpinion", false)) return true;
  return promptMatches(ctx.prompt, [
    /opinia\s+geotechniczn/i,
    /badania\s+geotechniczn/i,
    /rozpoznanie\s+geotechniczn/i,
    /nie\s+wykonano\s+badań\s+geotechnicznych/i,
    /brak\s+.*geotechn/i,
  ]);
}

function storageSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "warehouseStorageDefined", true)) return true;
  return promptMatches(ctx.prompt, [
    /regał/i,
    /wysokość\s+składow/i,
    /wysokie\s+składow/i,
    /towar/i,
    /magazynowan/i,
    /klasa\s+pożar/i,
    /obciążenie\s+pożarowe\s+magazynu/i,
  ]);
}

function trafficSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "warehouseDocksDefined", true)) return true;
  return promptMatches(ctx.prompt, [
    /\bdok/i,
    /\btir\b/i,
    /plac\s+manewr/i,
    /samochod.*ciężar/i,
    /ruch\s+.*ciężar/i,
    /rampa/i,
  ]);
}

function fireSafetyIndustrialSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "warehouseFireLoadDefined", true)) return true;
  return promptMatches(ctx.prompt, [
    /ppoż/i,
    /obciążenie\s+pożar/i,
    /klasa\s+pożar/i,
    /sprinkler/i,
    /sap\b/i,
    /oddymian/i,
    /strefy\s+pożar/i,
    /drogi\s+pożar/i,
    /ewakuacj/i,
  ]);
}

function utilitiesSatisfied(ctx: IntakeEvalContext): boolean {
  if (!hasSignal(ctx.signals, "utilitiesUnclear", true)) {
    return promptMatches(ctx.prompt, [
      /przyłąc/i,
      /media/i,
      /energi/i,
      /moc\s+przyłączeniow/i,
      /zapotrzebowanie\s+na\s+energi/i,
    ]);
  }
  return false;
}

function stormwaterSatisfied(ctx: IntakeEvalContext): boolean {
  return promptMatches(ctx.prompt, [
    /wod[yę]\s+opadow/i,
    /retencj/i,
    /odprowadzen.*opadow/i,
    /kanalizacj.*deszczow/i,
    /dach.*opadow/i,
  ]);
}

function structureLoadsSatisfied(ctx: IntakeEvalContext): boolean {
  return promptMatches(ctx.prompt, [
    /obciążen.*posadzk/i,
    /posadzk.*obciąż/i,
    /płyt.*fundament/i,
    /regał.*obciąż/i,
    /rack/i,
    /siatka\s+konstrukcyjn.*hali/i,
    /nośność\s+posadzki/i,
  ]);
}

function environmentRelevant(ctx: IntakeEvalContext): boolean {
  if (!isIndustrialType(ctx.projectType)) return false;
  return (
    hasSignal(ctx.signals, "hasEnvironmentalConstraint", true) ||
    promptMatches(ctx.prompt, [
      /\btir\b/i,
      /hałas/i,
      /akustyk/i,
      /sąsiedztw/i,
      /mieszkaniow/i,
      /nocn[eą]\s+ciszy/i,
    ])
  );
}

function environmentSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "environmentScopeConfirmed", true)) return true;
  return promptMatches(ctx.prompt, [
    /analiz.*akustyczn/i,
    /wpływ.*hałas/i,
    /nie\s+dotyczy.*hałas/i,
    /oceniono\s+wpływ/i,
  ]);
}

function technologyBriefSatisfied(ctx: IntakeEvalContext): boolean {
  if (hasSignal(ctx.signals, "hasTechnologyBrief", true)) return true;
  if (hasSignal(ctx.signals, "hasTechnologyBrief", false)) return true;
  return promptMatches(ctx.prompt, [
    /brief\s+technologiczn/i,
    /wytyczne\s+technologiczn/i,
    /linia\s+produkcyjn/i,
    /układ\s+linii/i,
  ]);
}

const Q = (
  partial: ClarifyingQuestionInput & { relatedArea: ClarificationArea }
): ClarifyingQuestionInput => partial;

export const INTAKE_DATA_GROUPS: IntakeDataGroup[] = [
  {
    id: "planning_basis",
    labelPl: "Podstawa planistyczna (MPZP/WZ)",
    priority: 10,
    impactArea: "planning",
    isRelevant: () => true,
    isSatisfied: planningBasisSatisfied,
    questions: [
      Q({
        id: "cq-planning-status",
        question:
          "Czy dla działki inwestycyjnej obowiązuje MPZP (z możliwością wydania wypisu i wyrysu), czy jedyną ścieżką ustalenia parametrów zabudowy pozostaje decyzja o warunkach zabudowy (WZ)?",
        reason:
          "Status planistyczny determinuje dokument wejściowy do koncepcji, zakres weryfikacji w organie AAB oraz kolejność działań: ustalenia z MPZP albo postępowanie WZ.",
        options: ["Obowiązuje MPZP", "Brak MPZP — ścieżka WZ", "Wymaga weryfikacji w urzędzie"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "planning",
        impactOnCompleteness: 18,
        triggerReason: "group:planning_basis:status",
      }),
      Q({
        id: "cq-mpzp-excerpt",
        question:
          "Czy posiadasz wypis i wyrys z obowiązującego MPZP albo pełną treść uchwały planu wraz z załącznikiem graficznym?",
        reason:
          "Dokument stanowi podstawę weryfikacji przeznaczenia terenu, linii zabudowy, intensywności i PBC — bez nich nie należy rozwijać PZT/PAB.",
        options: ["Tak — posiadam", "Nie — do uzyskania", "Częściowo / w trakcie"],
        requiredForFinalPlan: true,
        priority: "important",
        relatedArea: "documentation",
        impactOnCompleteness: 16,
        triggerReason: "group:planning_basis:excerpt",
      }),
      Q({
        id: "cq-planning-params",
        question:
          "Czy znane są przeznaczenie terenu oraz parametry z MPZP istotne dla projektu (intensywność, wysokość, linia zabudowy, udział powierzchni biologicznie czynnej)?",
        reason:
          "Te ustalenia muszą być znane przed opracowaniem koncepcji zabudowy i układu na PZT.",
        options: ["Tak, mam ustalenia", "Częściowo", "Nie — wymagam wypisu"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "planning",
        impactOnCompleteness: 12,
        triggerReason: "group:planning_basis:params",
      }),
      Q({
        id: "cq-wz-feasibility",
        question:
          "Czy planowane jest zainicjowanie postępowania o decyzję o warunkach zabudowy (WZ) jako formalnej podstawy parametrów zabudowy przy braku obowiązującego MPZP?",
        reason:
          "Przy braku MPZP decyzja WZ zwykle stanowi dokument wejściowy do koncepcji i dokumentacji PZT/PAB.",
        options: ["Tak — planuję WZ", "Nie — inna podstawa planistyczna", "Nie wiem — wymaga analizy"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "formal_path",
        impactOnCompleteness: 18,
        triggerReason: "group:planning_basis:wz",
      }),
    ],
  },
  {
    id: "surveying_mdcp",
    labelPl: "Geodezja (MDCP)",
    priority: 20,
    impactArea: "documentation",
    isRelevant: () => true,
    isSatisfied: surveyingSatisfied,
    questions: [
      Q({
        id: "cq-mdcp-status",
        question:
          "Czy dysponujesz aktualną mapą do celów projektowych (MDCP) opracowaną na podstawie geodezyjnego pomiaru granic działki?",
        reason:
          "MDCP jest dokumentem wejściowym do lokalizacji obiektu na PZT i współrzędnych w PAB.",
        options: ["Tak", "Nie — do zamówienia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "documentation",
        impactOnCompleteness: 14,
        triggerReason: "group:surveying_mdcp",
      }),
    ],
  },
  {
    id: "investor_brief",
    labelPl: "Brief inwestora",
    priority: 30,
    impactArea: "investor_brief",
    isRelevant: (ctx) => ctx.projectType !== "unknown",
    isSatisfied: investorBriefSatisfied,
    questions: [
      Q({
        id: "cq-investor-brief",
        question:
          "Czy zebrano wytyczne inwestora / brief projektowy (program funkcjonalny, standard, harmonogram) przed koncepcją?",
        reason:
          "Brief jest dokumentem wejściowym do prac koncepcyjnych — standard profesjonalnej koordynacji projektowej.",
        options: ["Tak — kompletny", "Częściowo", "Nie — do zebrania", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "documentation",
        impactOnCompleteness: 12,
        triggerReason: "group:investor_brief",
      }),
    ],
  },
  {
    id: "storage_logistics",
    labelPl: "Magazynowanie i towary",
    priority: 40,
    impactArea: "structure",
    isRelevant: (ctx) =>
      ctx.projectType === "warehouse" || ctx.projectType === "warehouse_service_hall",
    isSatisfied: storageSatisfied,
    questions: [
      Q({
        id: "cq-storage-height",
        question:
          "Jaka jest planowana wysokość składowania (regały wysokiego składowania) i jakie towary będą magazynowane?",
        reason:
          "Wysokość regałów, rodzaj towarów i klasa pożarowa wpływają na kubaturę hali, strefy PPOŻ i drogi pożarowe.",
        options: ["Ustalone", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "critical",
        relatedArea: "technical",
        impactOnCompleteness: 16,
        triggerReason: "group:storage_logistics",
      }),
    ],
  },
  {
    id: "traffic_docks",
    labelPl: "Doki, TIR i plac manewrowy",
    priority: 50,
    impactArea: "road_access",
    isRelevant: (ctx) =>
      ctx.projectType === "warehouse" || ctx.projectType === "warehouse_service_hall",
    isSatisfied: trafficSatisfied,
    questions: [
      Q({
        id: "cq-docks-tir",
        question:
          "Czy określono liczbę doków, układ placu manewrowego i ruch samochodów ciężarowych (TIR) oraz dostęp do drogi publicznej?",
        reason:
          "Logistyka TIR i manewry ciężarówek wpływają na PZT, zjazdy, geometrię hali i nośność nawierzchni.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 14,
        triggerReason: "group:traffic_docks",
      }),
    ],
  },
  {
    id: "fire_safety",
    labelPl: "PPOŻ i bezpieczeństwo pożarowe",
    priority: 60,
    impactArea: "fire_safety",
    isRelevant: (ctx) => {
      const cat = String(signalValue(ctx.signals, "buildingCategory") ?? "");
      return (
        isIndustrialType(ctx.projectType) ||
        ctx.projectType === "multi_family" ||
        ctx.projectType === "service" ||
        ctx.projectType === "retail" ||
        (ctx.projectType === "extension_reconstruction" &&
          ["service", "services", "retail", "office"].includes(cat))
      );
    },
    isSatisfied: (ctx) => {
      if (ctx.projectType === "multi_family") {
        return promptMatches(ctx.prompt, [/ppoż/i, /drogi\s+pożar/i, /strefy\s+pożar/i, /ewakuacj/i]);
      }
      if (ctx.projectType === "service" || ctx.projectType === "retail") {
        return promptMatches(ctx.prompt, [/ppoż/i, /sanitarn/i, /wentylacj/i, /strefy/i]);
      }
      return fireSafetyIndustrialSatisfied(ctx);
    },
    questions: [
      Q({
        id: "cq-fire-sanitary-services",
        question:
          "Czy dla funkcji usługowej lub handlowej określono wstępne wymagania PPOŻ oraz sanitarne (strefy, wentylacja, odległości od granic)?",
        reason:
          "Obiekty usługowe wymagają koordynacji z branżystą PPOŻ i sanitarnym już na etapie koncepcji PZT.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "specialists",
        impactOnCompleteness: 11,
        triggerReason: "group:fire_safety:service",
      }),
      Q({
        id: "cq-fire-load-warehouse",
        question:
          "Czy ustalono obciążenie pożarowe magazynu i wstępne założenia PPOŻ dla wysokiego składowania (strefy, drogi pożarowe, sprinkler/SAP/oddymianie)?",
        reason:
          "Przy magazynie wysokiego składowania PPOŻ determinuje strefy, odległości i instalacje — wymaga wczesnych ustaleń przed PAB.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "critical",
        relatedArea: "specialists",
        impactOnCompleteness: 15,
        triggerReason: "group:fire_safety:warehouse",
      }),
      Q({
        id: "cq-fire-accessibility",
        question:
          "Czy na etapie koncepcji uwzględniono wstępne założenia PPOŻ (strefy pożarowe, drogi pożarowe, odległości) oraz wymagania dostępności?",
        reason:
          "Przy budynkach wielorodzinnych wczesna koordynacja PPOŻ i dostępności na PZT ogranicza ryzyko przeprojektowania PAB.",
        options: ["Tak — wstępnie", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "specialists",
        impactOnCompleteness: 12,
        triggerReason: "group:fire_safety:multi_family",
      }),
    ],
  },
  {
    id: "geotechnics",
    labelPl: "Geotechnika",
    priority: 70,
    impactArea: "geotechnics",
    isRelevant: (ctx) => ctx.projectType !== "unknown",
    isSatisfied: geotechnicsSatisfied,
    questions: [
      Q({
        id: "cq-geotechnical",
        question:
          "Czy wykonano lub planujecie Państwo opinię geotechniczną (badania podłoża, kategoria geotechniczna, poziom wód gruntowych) przed projektem fundamentów?",
        reason:
          "Geotechnik powinien być zaangażowany przed konstrukcją — to standard koordynacji przed fundamentami i płytą.",
        options: ["Tak — posiadam", "Zlecone / w trakcie", "Nie — do zlecenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 14,
        triggerReason: "group:geotechnics",
      }),
    ],
  },
  {
    id: "utilities_media",
    labelPl: "Media i energia",
    priority: 80,
    impactArea: "utilities",
    isRelevant: (ctx) =>
      isIndustrialType(ctx.projectType) ||
      ctx.projectType === "multi_family" ||
      ctx.projectType === "service" ||
      ctx.projectType === "retail" ||
      ctx.projectType === "office" ||
      hasSignal(ctx.signals, "utilitiesUnclear", true),
    isSatisfied: utilitiesSatisfied,
    questions: [
      Q({
        id: "cq-warehouse-utilities",
        question:
          "Czy zweryfikowano zapotrzebowanie na media (energia, woda, kanalizacja, ogrzewanie/chłodzenie, instalacje procesowe) oraz warunki gestorów sieci?",
        reason:
          "Przy halach i obiektach usługowych moce przyłączeniowe muszą być znane przed zamrożeniem układu na PZT.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 12,
        triggerReason: "group:utilities_media:industrial",
      }),
      Q({
        id: "cq-utilities",
        question:
          "Czy ustalono możliwość i zakres przyłączy mediów (woda, kanalizacja, energia elektryczna, gaz, teletechnika) oraz warunki gestorów sieci?",
        reason:
          "Ustalenia wpływają na układ PZT, lokalizację zjazdów i harmonogram uzgodnień z gestorami.",
        options: ["Tak — wszystkie", "Częściowo", "Nie — do uzgodnienia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 12,
        triggerReason: "group:utilities_media:general",
      }),
      Q({
        id: "cq-utilities-stormwater",
        question:
          "Czy ustalono zakres przyłączy mediów oraz sposób odprowadzenia wód opadowych (studnia, retencja, kanalizacja deszczowa)?",
        reason: "Wpływa na PZT, lokalizację zjazdów i uzgodnienia z gestorami przed PAB.",
        options: ["Tak", "Częściowo", "Nie — do uzgodnienia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "optional",
        relatedArea: "technical",
        impactOnCompleteness: 8,
        triggerReason: "group:utilities_media:residential",
      }),
    ],
  },
  {
    id: "stormwater",
    labelPl: "Wody opadowe i retencja",
    priority: 90,
    impactArea: "utilities",
    isRelevant: (ctx) => isIndustrialType(ctx.projectType) || ctx.projectType === "multi_family",
    isSatisfied: stormwaterSatisfied,
    questions: [
      Q({
        id: "cq-stormwater-industrial",
        question:
          "Czy ustalono odprowadzenie wód opadowych z dachu i utwardzonych placów (retencja, infiltracja, przyłącze do kanalizacji deszczowej)?",
        reason:
          "Przy halach i dużych powierzchniach utwardzonych retencja i odprowadzenie opadowych muszą być znane przed PZT.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 10,
        triggerReason: "group:stormwater",
      }),
    ],
  },
  {
    id: "structure_loads",
    labelPl: "Konstrukcja i obciążenia",
    priority: 100,
    impactArea: "structure",
    isRelevant: (ctx) =>
      ctx.projectType === "warehouse" || ctx.projectType === "warehouse_service_hall",
    isSatisfied: structureLoadsSatisfied,
    questions: [
      Q({
        id: "cq-floor-slab",
        question:
          "Czy znane są obciążenia posadzki / płyty fundamentowej (TIR, regały wysokiego składowania, strefy składowania, doki)?",
        reason: "Obciążenia łączą geotechnikę z konstrukcją płyty fundamentowej i posadzki przemysłowej.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 13,
        triggerReason: "group:structure_loads",
      }),
    ],
  },
  {
    id: "environment_noise",
    labelPl: "Środowisko i hałas",
    priority: 110,
    impactArea: "environment",
    isRelevant: environmentRelevant,
    isSatisfied: environmentSatisfied,
    questions: [
      Q({
        id: "cq-warehouse-environment",
        question:
          "Czy oceniono wpływ hałasu i ruchu ciężarówek na sąsiedztwo (wymagania środowiskowe do weryfikacji)?",
        reason:
          "Hale z TIR mogą wymagać analizy akustycznej lub warunków środowiskowych — do weryfikacji w gminie i przepisach.",
        options: ["Tak — ocenione", "Do weryfikacji", "Nie dotyczy", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "optional",
        relatedArea: "constraints",
        impactOnCompleteness: 7,
        triggerReason: "group:environment_noise",
      }),
    ],
  },
  {
    id: "pum_parking",
    labelPl: "PUM i parking",
    priority: 45,
    impactArea: "planning",
    isRelevant: (ctx) => ctx.projectType === "multi_family",
    isSatisfied: (ctx) =>
      promptMatches(ctx.prompt, [/pum\b/i, /miejsc\s+postoj/i, /parking/i, /intensywność/i]),
    questions: [
      Q({
        id: "cq-pum-parking",
        question:
          "Czy znane są wymagania PUM, liczba lokali oraz minimalna liczba miejsc postojowych z MPZP i przepisów o dostępności?",
        reason: "PUM i parking determinują układ PZT i wstępną ocenę zgodności z planem.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "planning",
        impactOnCompleteness: 12,
        triggerReason: "group:pum_parking",
      }),
      Q({
        id: "cq-parking-multi",
        question:
          "Czy ustalono wymagania dotyczące liczby i lokalizacji miejsc postojowych oraz drogi pożarowej / dojazdu zgodnie z MPZP?",
        reason:
          "Te parametry wpływają na układ zagospodarowania na PZT i muszą być znane przed zamrożeniem koncepcji.",
        options: ["Tak", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "planning",
        impactOnCompleteness: 10,
        triggerReason: "group:pum_parking:access",
      }),
    ],
  },
  {
    id: "technology_brief",
    labelPl: "Brief technologiczny",
    priority: 35,
    impactArea: "investor_brief",
    isRelevant: (ctx) =>
      ctx.projectType === "factory_industrial" || ctx.projectType === "production_hall",
    isSatisfied: technologyBriefSatisfied,
    questions: [
      Q({
        id: "cq-technology-brief",
        question:
          "Czy dysponujecie szczegółowym briefem technologicznym (linie produkcyjne, media, substancje, BHP)?",
        reason:
          "Bez briefu technologicznego nie można rzetelnie zaplanować układu hali i instalacji procesowych.",
        options: ["Tak", "Częściowo", "Nie — brak szczegółów", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "technical",
        impactOnCompleteness: 18,
        triggerReason: "group:technology_brief",
      }),
    ],
  },
  {
    id: "hazardous_environment",
    labelPl: "Substancje i decyzja środowiskowa",
    priority: 95,
    impactArea: "environment",
    isRelevant: (ctx) => ctx.projectType === "factory_industrial",
    isSatisfied: (ctx) =>
      promptMatches(ctx.prompt, [
        /substancj.*niebezpieczn/i,
        /decyzj.*środowisk/i,
        /ocen.*środowisk/i,
        /nie\s+dotyczy.*substancj/i,
      ]),
    questions: [
      Q({
        id: "cq-hazardous-substances",
        question:
          "Czy w procesie występują substancje niebezpieczne wymagające dodatkowych rozwiązań (do weryfikacji)?",
        reason: "Może wpływać na strefowanie, PPOŻ i wymagania środowiskowe.",
        options: ["Tak", "Nie", "Do weryfikacji", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "constraints",
        impactOnCompleteness: 10,
        triggerReason: "group:hazardous_environment:hazmat",
      }),
      Q({
        id: "cq-environmental-decision",
        question:
          "Czy oceniono konieczność decyzji o środowiskowych uwarunkowaniach (do weryfikacji)?",
        reason: "Procedura środowiskowa może wydłużyć harmonogram inwestycji przemysłowej.",
        options: ["Tak — wymagana", "Nie", "Do weryfikacji", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "formal_path",
        impactOnCompleteness: 10,
        triggerReason: "group:hazardous_environment:decision",
      }),
    ],
  },
  {
    id: "existing_inventory",
    labelPl: "Inwentaryzacja istniejącego",
    priority: 15,
    impactArea: "structure",
    isRelevant: (ctx) =>
      ctx.projectType === "extension_reconstruction" ||
      ctx.projectType === "change_of_use" ||
      hasSignal(ctx.signals, "buildingType", "existing") ||
      hasSignal(ctx.signals, "buildingType", "mixed"),
    isSatisfied: (ctx) =>
      promptMatches(ctx.prompt, [/inwentaryzacj/i, /dokumentacj.*istniej/i, /ocen.*konstrukcj/i]),
    questions: [
      Q({
        id: "cq-existing-inventory",
        question:
          "Czy wykonano inwentaryzację architektoniczną istniejącego budynku oraz wstępną ocenę stanu konstrukcyjnego i instalacji?",
        reason:
          "Przy rozbudowie, przebudowie lub zmianie użytkowania te materiały są dokumentem wejściowym do PAB.",
        options: ["Tak — kompletna", "Częściowo", "Nie — do zlecenia", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "existing_building",
        impactOnCompleteness: 17,
        triggerReason: "group:existing_inventory",
      }),
      Q({
        id: "cq-building-scope",
        question:
          "Jaki jest przewidywany zakres robót budowlanych (rozbudowa, przebudowa, nadbudowa, zmiana sposobu użytkowania) i czy wpływa on na parametry planistyczne?",
        reason:
          "Zakres robót determinuje wymagany poziom dokumentacji PZT/PAB oraz ścieżkę formalną w organie AAB.",
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
        impactOnCompleteness: 12,
        triggerReason: "group:existing_inventory:scope",
      }),
    ],
  },
  {
    id: "structural_existing",
    labelPl: "Ocena konstrukcji istniejącej",
    priority: 55,
    impactArea: "structure",
    isRelevant: (ctx) =>
      ctx.projectType === "extension_reconstruction" ||
      hasSignal(ctx.signals, "buildingType", "existing"),
    isSatisfied: (ctx) => promptMatches(ctx.prompt, [/nośność/i, /konstrukcj.*ocen/i, /projektant\s+konstrukcj/i]),
    questions: [
      Q({
        id: "cq-structural-existing",
        question:
          "Czy projektant konstrukcji ocenił nośność istniejących elementów pod nowe obciążenia i zakres rozbudowy?",
        reason: "Rozbudowa wymaga weryfikacji nośności przed zamrożeniem koncepcji.",
        options: ["Tak", "W trakcie", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "existing_building",
        impactOnCompleteness: 11,
        triggerReason: "group:structural_existing",
      }),
    ],
  },
  {
    id: "installations_existing",
    labelPl: "Instalacje istniejące",
    priority: 65,
    impactArea: "utilities",
    isRelevant: (ctx) =>
      ctx.projectType === "extension_reconstruction" ||
      hasSignal(ctx.signals, "buildingType", "existing"),
    isSatisfied: (ctx) => promptMatches(ctx.prompt, [/instalacj.*zinentaryz/i, /modernizacj.*instalacj/i]),
    questions: [
      Q({
        id: "cq-installations-existing",
        question: "Czy zinwentaryzowano instalacje istniejące i zakres ich modernizacji przy rozbudowie?",
        reason: "Instalacje często determinują koszt i zakres przebudowy.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "existing_building",
        impactOnCompleteness: 10,
        triggerReason: "group:installations_existing",
      }),
    ],
  },
  {
    id: "change_of_use_planning",
    labelPl: "Zgodność planistyczna zmiany użytkowania",
    priority: 25,
    impactArea: "planning",
    isRelevant: (ctx) =>
      ctx.projectType === "change_of_use" || hasSignal(ctx.signals, "changeOfUse", true),
    isSatisfied: (ctx) =>
      promptMatches(ctx.prompt, [/dopuszczaln.*mpzp/i, /zgodn.*wz/i, /zmiana\s+sposobu/i]),
    questions: [
      Q({
        id: "cq-new-function-planning",
        question:
          "Czy nowa funkcja jest dopuszczalna według MPZP/WZ i wymaga formalnej zmiany sposobu użytkowania?",
        reason: "Zmiana użytkowania wymaga zgodności planistycznej i właściwej ścieżki formalnej.",
        options: ["Tak — zgodne", "Wymaga analizy", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "planning",
        impactOnCompleteness: 16,
        triggerReason: "group:change_of_use_planning",
      }),
    ],
  },
  {
    id: "conservation_constraints",
    labelPl: "Ochrona konserwatorska",
    priority: 12,
    impactArea: "environment",
    isRelevant: (ctx) =>
      hasSignal(ctx.signals, "hasConservationConstraint", true) &&
      !hasSignal(ctx.signals, "conservationScopeConfirmed", true),
    isSatisfied: (ctx) =>
      hasSignal(ctx.signals, "conservationScopeConfirmed", true) ||
      promptMatches(ctx.prompt, [/ustaleni.*konserwator/i, /zgoda\s+konserwator/i]),
    questions: [
      Q({
        id: "cq-conservation-scope",
        question:
          "Czy uzyskano wstępne ustalenia konserwatorskie co do dopuszczalnego zakresu robót, kubatury, materiałów i formy architektonicznej w strefie ochrony?",
        reason:
          "Ograniczenia konserwatorskie mogą determinować koncepcję jeszcze przed kosztownym opracowaniem PAB.",
        options: ["Tak", "Częściowo", "Nie — wymagane", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "constraints",
        impactOnCompleteness: 17,
        triggerReason: "group:conservation_constraints",
      }),
    ],
  },
  {
    id: "road_access",
    labelPl: "Dostęp drogowy",
    priority: 75,
    impactArea: "road_access",
    isRelevant: (ctx) =>
      hasSignal(ctx.signals, "roadAccessUnclear", true) ||
      ctx.projectType === "multi_family",
    isSatisfied: (ctx) => {
      if (!hasSignal(ctx.signals, "roadAccessUnclear", true)) {
        return promptMatches(ctx.prompt, [
          /droga\s+pożarow/i,
          /dostęp\s+do\s+drogi/i,
          /zjazd/i,
          /serwitut/i,
          /droga\s+publiczn/i,
        ]);
      }
      return false;
    },
    questions: [
      Q({
        id: "cq-road-access",
        question:
          "Jaki jest sposób dostępu do drogi publicznej (bezpośredni front, zjazd przez serwitut, konieczność ustanowienia służebności)?",
        reason:
          "Dostęp do drogi publicznej warunkuje lokalizację zjazdu na PZT oraz uzgodnienia z zarządcą drogi.",
        options: ["Bezpośredni", "Przez serwitut", "Brak — wymaga rozwiązania", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        impactOnCompleteness: 13,
        triggerReason: "group:road_access",
      }),
    ],
  },
  {
    id: "function_category",
    labelPl: "Kategoria inwestycji",
    priority: 5,
    impactArea: "planning",
    isRelevant: (ctx) => ctx.projectType === "unknown" || !hasSignal(ctx.signals, "buildingCategory"),
    isSatisfied: (ctx) => hasSignal(ctx.signals, "buildingCategory"),
    questions: [
      Q({
        id: "cq-building-function",
        question:
          "Jaka kategoria inwestycji jest planowana (mieszkalna, usługowa, magazyn, hala, fabryka, rozbudowa, inna)?",
        reason:
          "Kategoria funkcji determinuje wymagania PPOŻ, sanitarne i zakres koordynacji branżowej na PZT/PAB.",
        options: [
          "Jednorodzinna",
          "Wielorodzinna",
          "Usługi / handel",
          "Magazyn / hala",
          "Przemysł",
          "Rozbudowa / zmiana użytkowania",
          "Inna",
        ],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "technical",
        impactOnCompleteness: 18,
        triggerReason: "group:function_category",
      }),
    ],
  },
];

const GROUP_BY_ID = new Map(INTAKE_DATA_GROUPS.map((g) => [g.id, g]));

/** Ordered intake groups per canonical project type. */
export const INTAKE_GROUP_ORDER_BY_TYPE: Record<ProjectTypeKey, IntakeGroupId[]> = {
  single_family: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "geotechnics",
    "road_access",
    "utilities_media",
  ],
  multi_family: [
    "function_category",
    "conservation_constraints",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "pum_parking",
    "fire_safety",
    "geotechnics",
    "road_access",
    "utilities_media",
    "stormwater",
  ],
  service: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "fire_safety",
    "geotechnics",
    "utilities_media",
  ],
  office: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "geotechnics",
    "utilities_media",
  ],
  retail: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "fire_safety",
    "geotechnics",
    "utilities_media",
  ],
  warehouse: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "storage_logistics",
    "traffic_docks",
    "fire_safety",
    "geotechnics",
    "utilities_media",
    "stormwater",
    "structure_loads",
    "environment_noise",
  ],
  warehouse_service_hall: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "storage_logistics",
    "traffic_docks",
    "fire_safety",
    "geotechnics",
    "utilities_media",
    "stormwater",
    "structure_loads",
    "environment_noise",
  ],
  production_hall: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "technology_brief",
    "fire_safety",
    "geotechnics",
    "utilities_media",
    "stormwater",
    "environment_noise",
  ],
  factory_industrial: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "technology_brief",
    "fire_safety",
    "geotechnics",
    "utilities_media",
    "hazardous_environment",
    "environment_noise",
  ],
  public_utility: [
    "function_category",
    "planning_basis",
    "surveying_mdcp",
    "investor_brief",
    "fire_safety",
    "geotechnics",
    "utilities_media",
  ],
  extension_reconstruction: [
    "function_category",
    "conservation_constraints",
    "planning_basis",
    "existing_inventory",
    "fire_safety",
    "structural_existing",
    "installations_existing",
    "geotechnics",
    "road_access",
    "utilities_media",
  ],
  change_of_use: [
    "function_category",
    "conservation_constraints",
    "change_of_use_planning",
    "planning_basis",
    "existing_inventory",
    "fire_safety",
    "geotechnics",
  ],
  unknown: ["function_category", "conservation_constraints", "planning_basis", "surveying_mdcp"],
};

export function getOrderedIntakeGroups(projectType: ProjectTypeKey): IntakeDataGroup[] {
  const order = INTAKE_GROUP_ORDER_BY_TYPE[projectType] ?? INTAKE_GROUP_ORDER_BY_TYPE.unknown;
  return order
    .map((id) => GROUP_BY_ID.get(id))
    .filter((g): g is IntakeDataGroup => g !== undefined);
}

export function evaluateMissingIntakeGroups(ctx: IntakeEvalContext): IntakeDataGroup[] {
  const groups = getOrderedIntakeGroups(ctx.projectType);
  return groups.filter((g) => g.isRelevant(ctx) && !g.isSatisfied(ctx));
}

/** Pick applicable questions from a group (context-aware subset). */
export function pickQuestionsForGroup(
  group: IntakeDataGroup,
  ctx: IntakeEvalContext
): ClarifyingQuestionInput[] {
  const planning = planningStatus(ctx);

  if (group.id === "planning_basis") {
    const out: ClarifyingQuestionInput[] = [];
    if (planning === "unknown") {
      out.push(group.questions.find((q) => q.id === "cq-planning-status")!);
    }
    if (
      planning === "mpzp_exists" &&
      !hasSignal(ctx.signals, "hasMpzpExcerpt", true) &&
      !hasSignal(ctx.signals, "hasPartialPlanningParams", true)
    ) {
      const excerpt = group.questions.find((q) => q.id === "cq-mpzp-excerpt");
      const params = group.questions.find((q) => q.id === "cq-planning-params");
      if (excerpt) out.push(excerpt);
      if (params) out.push(params);
    }
    if (planning === "no_mpzp" || planning === "wz_path" || hasSignal(ctx.signals, "locationNoMpzp", true)) {
      const wz = group.questions.find((q) => q.id === "cq-wz-feasibility");
      if (wz) out.push(wz);
    }
    return out.filter(Boolean);
  }

  if (group.id === "fire_safety") {
    if (ctx.projectType === "multi_family") {
      return group.questions.filter((q) => q.id === "cq-fire-accessibility");
    }
    if (ctx.projectType === "service" || ctx.projectType === "retail") {
      return group.questions.filter((q) => q.id === "cq-fire-sanitary-services");
    }
    if (isIndustrialType(ctx.projectType)) {
      return group.questions.filter((q) => q.id === "cq-fire-load-warehouse");
    }
    return [];
  }

  if (group.id === "utilities_media") {
    if (ctx.projectType === "single_family") {
      const out: ClarifyingQuestionInput[] = [];
      if (hasSignal(ctx.signals, "utilitiesUnclear", true)) {
        const util = group.questions.find((q) => q.id === "cq-utilities");
        if (util) out.push(util);
      }
      const storm = group.questions.find((q) => q.id === "cq-utilities-stormwater");
      if (storm) out.push(storm);
      return out;
    }
    if (isIndustrialType(ctx.projectType)) {
      return group.questions.filter((q) => q.id === "cq-warehouse-utilities");
    }
    if (hasSignal(ctx.signals, "utilitiesUnclear", true)) {
      return group.questions.filter((q) => q.id === "cq-utilities");
    }
    return [];
  }

  if (group.id === "pum_parking") {
    const out: ClarifyingQuestionInput[] = [];
    const pum = group.questions.find((q) => q.id === "cq-pum-parking");
    const parking = group.questions.find((q) => q.id === "cq-parking-multi");
    if (pum) out.push(pum);
    if (parking && !promptMatches(ctx.prompt, [/miejsc\s+postoj/i, /parking/i])) {
      out.push(parking);
    }
    return out;
  }

  return group.questions;
}

export function getIntakeQuestionsForMissingGroups(
  missingGroups: IntakeDataGroup[],
  ctx: IntakeEvalContext
): ClarifyingQuestionInput[] {
  const questions: ClarifyingQuestionInput[] = [];
  for (const group of missingGroups) {
    questions.push(...pickQuestionsForGroup(group, ctx));
  }
  return questions;
}

export function getIntakeGroupPriority(group: IntakeDataGroup): number {
  return group.priority;
}
