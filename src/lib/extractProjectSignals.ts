import type { ProjectSignal, StructuredProjectFields } from "../types/architecture";
import {
  addClassificationSignals,
  classifyProjectType,
} from "./classifyProjectType";
import { MISSING_UNCERTAIN_LABELS } from "./missingInputLabels";
import {
  OFFICE_PRIMARY_PATTERNS,
  SINGLE_FAMILY_PATTERNS,
  WAREHOUSE_PRIMARY_PATTERNS,
  WAREHOUSE_SERVICE_HALL_PATTERNS,
} from "./projectTypePatterns";

type TextPatternRule = {
  key: string;
  label: string;
  patterns: RegExp[];
  value: string | boolean;
};

/** Checked before positive rules for the same key — prevents substring false positives. */
const NEGATIVE_TEXT_PATTERNS: TextPatternRule[] = [
  {
    key: "hasMdcp",
    label: "MDCP",
    patterns: [
      /brak\s+mapy\s+do\s+celów\s+projektowych/i,
      /brak\s+mdcp/i,
      /nie\s+mam\s+mdcp/i,
      /nie\s+mam\s+mapy/i,
      /nie\s+posiadam\s+mapy/i,
      /nie\s+posiadam\s+mdcp/i,
      /nie\s+zamówion[oaeiy]?\s+.*map[aęy]\s+do\s+celów\s+projektowych/i,
      /nie\s+został[aoy]?\s+(jeszcze\s+)?zamówion[oaeiy]?\s+map[aęy]\s+do\s+celów\s+projektowych/i,
      /brak\s+mapy(?!\s+z\s+)/i,
    ],
    value: false,
  },
  {
    key: "hasMpzpExcerpt",
    label: "Wypis i wyrys z MPZP",
    patterns: [
      /nie\s+mam\s+(jeszcze\s+)?wypisu/i,
      /brak\s+wypisu/i,
      /bez\s+wypisu/i,
      /nie\s+posiadam\s+wypisu/i,
      /brak\s+wypisu\s+i\s+wyrysu/i,
    ],
    value: false,
  },
  {
    key: "planningStatus",
    label: "Status planistyczny",
    patterns: [/brak\s+mpzp/i, /nie\s+ma\s+mpzp/i, /bez\s+mpzp/i, /gmina\s+bez\s+mpzp/i],
    value: "no_mpzp",
  },
];

const TEXT_PATTERNS: TextPatternRule[] = [
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: SINGLE_FAMILY_PATTERNS,
    value: "single_family",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/wielorodzinny/i, /budynek\s+mieszkalny\s+wiel/i],
    value: "multi_family",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: WAREHOUSE_SERVICE_HALL_PATTERNS,
    value: "warehouse_service_hall",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: WAREHOUSE_PRIMARY_PATTERNS,
    value: "warehouse",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/hala\s+produkcyjn/i],
    value: "production_hall",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/budynek\s+usługow/i, /obiekt\s+usługow/i, /(?<!magazynowo[-\s])(?<!handl)usługow/i],
    value: "service",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: OFFICE_PRIMARY_PATTERNS,
    value: "office",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/handlow/i, /centrum\s+handlow/i, /sklep/i, /retail/i],
    value: "retail",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/fabryk/i, /zakład\s+produkcyjny/i, /linia\s+produkcyjn/i, /przemysłow/i],
    value: "factory_industrial",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/użyteczności\s+publicznej/i, /publiczn/i, /szkoł/i, /przedszkol/i],
    value: "public",
  },
  {
    key: "planningStatus",
    label: "Status planistyczny",
    patterns: [
      /działka\s+(jest\s+)?objęt[aąęeiy]+\s+mpzp/i,
      /działce\s+objęt[aąęeiy]+\s+mpzp/i,
      /na\s+działce\s+objęt[aąęeiy]+\s+mpzp/i,
      /objęt[aąęeiy]+\s+mpzp/i,
      /obowiązuje\s+mpzp/i,
      /mpzp\s+obowiązuje/i,
      /mpzp\s+dostępn/i,
      /jest\s+mpzp/i,
      /mamy\s+mpzp/i,
      /jest\s+plan\s+miejscowy/i,
    ],
    value: "mpzp_exists",
  },
  {
    key: "hasMpzpExcerpt",
    label: "Wypis i wyrys z MPZP",
    patterns: [
      /mam\s+wypis/i,
      /posiadam\s+wypis/i,
      /posiada\s+wypis/i,
      /wypis\s+i\s+wyrys/i,
      /wypis\s+.*wyrys/i,
    ],
    value: true,
  },
  {
    key: "hasMdcp",
    label: "MDCP",
    patterns: [
      /\b(mam|posiadam)\s+mdcp\b/i,
      /\b(mam|posiadam)\s+mapę\s+do\s+celów/i,
      /mdcp\s+dostępn/i,
      /mapa\s+do\s+celów\s+projektowych\s+(jest\s+)?dostępn/i,
    ],
    value: true,
  },
  {
    key: "hasPzt",
    label: "PZT",
    patterns: [/mam\s+pzt/i, /posiadam\s+pzt/i, /projekt\s+zagospodarowania/i],
    value: true,
  },
  {
    key: "hasPzt",
    label: "PZT",
    patterns: [/brak\s+pzt/i, /nie\s+mam\s+pzt/i],
    value: false,
  },
  {
    key: "buildingType",
    label: "Typ budynku",
    patterns: [/istniejący/i, /rozbudow/i, /przebudow/i, /modernizac/i, /nadbudow/i],
    value: "existing",
  },
  {
    key: "buildingType",
    label: "Typ budynku",
    patterns: [/nowy\s+budynek/i, /nowa\s+zabudow/i, /budowa\s+od\s+podstaw/i],
    value: "new",
  },
  {
    key: "changeOfUse",
    label: "Zmiana użytkowania",
    patterns: [
      /zmiana\s+(sposobu\s+)?użytkowania/i,
      /zmiany\s+(sposobu\s+)?użytkowania/i,
      /zmianę\s+(sposobu\s+)?użytkowania/i,
    ],
    value: true,
  },
  {
    key: "hasGeotechnicalOpinion",
    label: "Opinia geotechniczna",
    patterns: [/opinia\s+geotechniczn/i, /mam\s+geotechn/i, /badania\s+geotechniczn/i],
    value: true,
  },
  {
    key: "hasGeotechnicalOpinion",
    label: "Opinia geotechniczna",
    patterns: [
      /brak\s+opinii\s+geotechniczn/i,
      /brak\s+rozpoznania\s+geotechnicznego/i,
      /bez\s+geotechn/i,
      /nie\s+wykonano\s+badań\s+geotechnicznych/i,
      /nie\s+wykonano\s+.*geotechn/i,
    ],
    value: false,
  },
  {
    key: "hasInvestorBrief",
    label: "Brief inwestora",
    patterns: [/brief\s+(projektowy|inwestora)/i, /wytyczne\s+inwestora/i, /mam\s+wytyczne/i],
    value: true,
  },
  {
    key: "hasInvestorBrief",
    label: "Brief inwestora",
    patterns: [
      /brak\s+wytycznych/i,
      /brak\s+brief/i,
      /bez\s+szczegółowych\s+wytycznych/i,
      /nie\s+przekazał\s+pełnych\s+wytycznych/i,
      /brak\s+pełnych\s+wytycznych\s+technologiczno[-\s]?logistyczn/i,
      /nie\s+mam\s+wytycznych/i,
      /nie\s+posiadam\s+wytycznych/i,
    ],
    value: false,
  },
  {
    key: "investorBriefStage",
    label: "Etap briefu inwestora",
    patterns: [/brief\s+niepełn/i, /częściow[yae]\s+wytyczn/i, /niepełn[yae]\s+wytyczn/i],
    value: "partial",
  },
  {
    key: "hasTechnologyBrief",
    label: "Brief technologiczny",
    patterns: [/brief\s+technologiczn/i, /wytyczne\s+technologiczn/i, /linia\s+produkcyjn/i],
    value: true,
  },
  {
    key: "hasTechnologyBrief",
    label: "Brief technologiczny",
    patterns: [/brak\s+szczegółowych\s+wytycznych\s+technologiczn/i, /brak\s+briefu\s+technologiczn/i],
    value: false,
  },
  {
    key: "hasConservationConstraint",
    label: "Ochrona konserwatorska",
    patterns: [
      /konserwator/i,
      /zabytek/i,
      /obszar\s+chroniony/i,
      /zabytkow/i,
      /ochrony\s+konserwatorskiej/i,
      /strefie\s+ochrony/i,
    ],
    value: true,
  },
  {
    key: "hasEnvironmentalConstraint",
    label: "Ochrona środowiska",
    patterns: [/natura\s+2000/i, /park\s+krajobrazowy/i, /ochrona\s+środowiska/i],
    value: true,
  },
  {
    key: "locationNoMpzp",
    label: "Brak MPZP w gminie",
    patterns: [/gmina\s+bez\s+mpzp/i, /brak\s+mpzp\s+w\s+gminie/i],
    value: true,
  },
  {
    key: "projectStage",
    label: "Etap projektu",
    patterns: [/koncepcj/i, /etapie\s+koncepcji/i],
    value: "concept",
  },
  {
    key: "projectStage",
    label: "Etap projektu",
    patterns: [/dokumentacja\s+na\s+pnb/i, /pozwolenie\s+na\s+budowę/i, /\bpnb\b/i],
    value: "building_permit_docs",
  },
  {
    key: "projectStage",
    label: "Etap projektu",
    patterns: [/realizacj/i, /w\s+budowie/i],
    value: "construction",
  },
  {
    key: "hasPartialPlanningParams",
    label: "Parametry planistyczne",
    patterns: [/parametr/i, /intensywność/i, /wysokość\s+zabudowy/i, /linia\s+zabudowy/i],
    value: true,
  },
];

function addSignal(
  signals: ProjectSignal[],
  key: string,
  label: string,
  value: string | boolean | number,
  source: ProjectSignal["source"],
  confidence: ProjectSignal["confidence"] = "medium"
): void {
  const existing = signals.findIndex((s) => s.key === key);
  const entry: ProjectSignal = { key, label, value, source, confidence };
  if (existing >= 0) {
    if (source === "structured" || source === "clarification") {
      signals[existing] = entry;
    }
    return;
  }
  signals.push(entry);
}

function mapStructuredPlanning(status?: string): string | undefined {
  if (!status) return undefined;
  const m: Record<string, string> = {
    "MPZP obowiązuje": "mpzp_exists",
    "Brak MPZP": "no_mpzp",
    "Nieznany / do weryfikacji": "unknown",
    "Ścieżka WZ": "wz_path",
  };
  return m[status] ?? status;
}

function mapStructuredStage(stage?: string): string | undefined {
  if (!stage) return undefined;
  const m: Record<string, string> = {
    Koncepcja: "concept",
    "Etap wstępny": "preliminary",
    "Dokumentacja na PnB": "building_permit_docs",
    Realizacja: "construction",
  };
  return m[stage] ?? stage;
}

function mapBuildingCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  const m: Record<string, string> = {
    "Dom jednorodzinny": "single_family",
    "Budynek wielorodzinny": "multi_family",
    "Budynek usługowy": "service",
    "Budynek biurowy": "office",
    "Obiekt handlowy": "retail",
    "Hala magazynowa": "warehouse",
    "Hala magazynowo-usługowa": "warehouse_service_hall",
    "Hala produkcyjna": "production_hall",
    "Zakład / fabryka": "factory_industrial",
    "Użyteczność publiczna": "public_utility",
    Inny: "other",
  };
  return m[cat] ?? cat;
}

function inferUnclearInfrastructure(prompt: string, signals: ProjectSignal[]): void {
  const planning = signals.find((s) => s.key === "planningStatus")?.value;
  const cat = signals.find((s) => s.key === "buildingCategory")?.value;
  const needsInfra =
    planning === "no_mpzp" ||
    planning === "wz_path" ||
    planning === "unknown" ||
    cat === "multi_family" ||
    cat === "service" ||
    cat === "services" ||
    cat === "office" ||
    cat === "retail" ||
    cat === "commercial" ||
    cat === "warehouse" ||
    cat === "warehouse_service_hall" ||
    cat === "production_hall" ||
    cat === "factory_industrial" ||
    cat === "industrial" ||
    cat === "public" ||
    cat === "public_utility";

  if (!needsInfra && planning === "mpzp_exists") {
    const mentionsUtilities = /przyłąc|media|woda|kanalizac|energia|gaz|sieć|warunki\s+przyłączenia/i.test(
      prompt
    );
    const utilitiesUnknown =
      cat === "single_family" && !mentionsUtilities;
    addSignal(signals, "roadAccessUnclear", "Dostęp drogowy", false, "inferred", "high");
    addSignal(
      signals,
      "utilitiesUnclear",
      "Przyłącza mediów",
      utilitiesUnknown,
      "inferred",
      utilitiesUnknown ? "medium" : "high"
    );
    return;
  }

  const mentionsRoad = /droga|zjazd|serwitut|dostęp\s+do\s+drogi/i.test(prompt);
  const mentionsUtilities = /przyłąc|media|woda|kanalizac|energia|gaz|sieć/i.test(prompt);
  const roadClear =
    mentionsRoad &&
    /(bezpośredni|serwitut|ustalone|jest\s+dostęp)/i.test(prompt) &&
    !/nie\s+wiem|do\s+ustalenia|nieustalone/i.test(prompt);
  const utilitiesClear =
    mentionsUtilities &&
    /(wszystkie|ustalone|są\s+przyłącza|mamy\s+przyłącza)/i.test(prompt) &&
    !/nie\s+wiem|do\s+uzgodnienia|brak/i.test(prompt);

  addSignal(
    signals,
    "roadAccessUnclear",
    "Dostęp drogowy",
    needsInfra ? !roadClear : false,
    "inferred",
    needsInfra ? "medium" : "high"
  );
  addSignal(
    signals,
    "utilitiesUnclear",
    "Przyłącza mediów",
    needsInfra ? !utilitiesClear : false,
    "inferred",
    needsInfra ? "medium" : "high"
  );
}

export function extractProjectSignals(
  prompt: string,
  structured?: StructuredProjectFields
): ProjectSignal[] {
  const signals: ProjectSignal[] = [];
  const text = prompt.trim().toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  addSignal(signals, "promptWordCount", "Długość opisu", wordCount, "inferred", "high");

  const applyTextRule = (rule: TextPatternRule, force = false) => {
    if (!rule.patterns.some((p) => p.test(prompt))) return;
    const existing = signals.find((s) => s.key === rule.key);
    const isNegative =
      rule.value === false || rule.value === "no_mpzp";
    if (force || isNegative || !existing) {
      addSignal(signals, rule.key, rule.label, rule.value, "text", isNegative ? "high" : "medium");
    }
  };

  for (const rule of NEGATIVE_TEXT_PATTERNS) {
    applyTextRule(rule, true);
  }
  for (const rule of TEXT_PATTERNS) {
    const blocked =
      rule.key === "hasMdcp" &&
      rule.value === true &&
      signals.some((s) => s.key === "hasMdcp" && s.value === false);
    if (!blocked) applyTextRule(rule);
  }

  if (structured?.investmentType) {
    addSignal(signals, "investmentType", "Rodzaj inwestycji", structured.investmentType, "structured", "high");
  }
  if (structured?.projectStage) {
    const stage = mapStructuredStage(structured.projectStage);
    addSignal(signals, "projectStage", "Etap projektu", stage ?? structured.projectStage, "structured", "high");
  }
  if (structured?.planningStatus) {
    const ps = mapStructuredPlanning(structured.planningStatus);
    addSignal(signals, "planningStatus", "Status planistyczny", ps ?? structured.planningStatus, "structured", "high");
  }
  if (structured?.buildingType) {
    addSignal(signals, "buildingType", "Typ zabudowy", structured.buildingType, "structured", "high");
  }
  if (structured?.buildingCategory) {
    const cat = mapBuildingCategory(structured.buildingCategory);
    addSignal(signals, "buildingCategory", "Kategoria obiektu", cat ?? structured.buildingCategory, "structured", "high");
  }
  if (structured?.locationContext) {
    addSignal(signals, "locationContext", "Kontekst lokalizacji", structured.locationContext, "structured", "medium");
  }
  if (structured?.specialConstraints?.length) {
    for (const c of structured.specialConstraints) {
      if (/konserw|zabytek/i.test(c)) {
        addSignal(signals, "hasConservationConstraint", "Ochrona konserwatorska", true, "structured", "high");
      }
      if (/środow|natura/i.test(c)) {
        addSignal(signals, "hasEnvironmentalConstraint", "Ochrona środowiska", true, "structured", "high");
      }
    }
    addSignal(
      signals,
      "specialConstraints",
      "Ograniczenia szczególne",
      structured.specialConstraints.join("; "),
      "structured",
      "high"
    );
  }
  if (structured?.documentationAvailable?.length) {
    for (const d of structured.documentationAvailable) {
      if (/wypis|wyrys|mpzp/i.test(d) && !/brak/i.test(d)) {
        addSignal(signals, "hasMpzpExcerpt", "Wypis i wyrys", true, "structured", "high");
      }
      if (/mdcp|mapa do celów/i.test(d) && !/brak/i.test(d)) {
        if (!signals.some((s) => s.key === "hasMdcp" && s.value === false)) {
          addSignal(signals, "hasMdcp", "MDCP", true, "structured", "high");
        }
      }
      if (/pzt/i.test(d) && !/brak/i.test(d)) addSignal(signals, "hasPzt", "PZT", true, "structured", "high");
      if (/pab/i.test(d) && !/brak/i.test(d)) addSignal(signals, "hasPab", "PAB", true, "structured", "high");
    }
  }

  if (signals.find((s) => s.key === "hasMdcp" && s.value === false)) {
    addSignal(signals, "mdcpStatus", "Status MDCP", "declared_missing", "text", "high");
  }

  const planning = signals.find((s) => s.key === "planningStatus")?.value;
  const hasClearPlanning =
    planning === "mpzp_exists" || planning === "no_mpzp" || planning === "wz_path";
  if (!hasClearPlanning && text.length > 15) {
    const mentionsMpzp = /mpzp/i.test(prompt);
    const deniesMpzp = /brak\s+mpzp|nie\s+ma\s+mpzp|bez\s+mpzp|gmina\s+bez\s+mpzp/i.test(prompt);
    if (mentionsMpzp && !deniesMpzp) {
      addSignal(signals, "planningStatus", "Status planistyczny", "mpzp_exists", "inferred", "medium");
    } else {
      addSignal(signals, "planningStatus", "Status planistyczny", "unknown", "inferred", "low");
    }
  }
  const planningIdx = signals.findIndex((s) => s.key === "planningStatus");
  if (planningIdx >= 0) {
    const best =
      signals.find((s) => s.key === "planningStatus" && s.value === "mpzp_exists") ??
      signals.find((s) => s.key === "planningStatus" && s.value === "no_mpzp") ??
      signals.find((s) => s.key === "planningStatus");
    if (best) {
      for (let i = signals.length - 1; i >= 0; i--) {
        if (signals[i].key === "planningStatus" && signals[i] !== best) signals.splice(i, 1);
      }
    }
  }

  if (!signals.find((s) => s.key === "projectStage")) {
    addSignal(signals, "projectStageUnclear", "Etap projektu", true, "inferred", "low");
  } else {
    addSignal(signals, "projectStageUnclear", "Etap projektu", false, "inferred", "high");
  }

  const cat = signals.find((s) => s.key === "buildingCategory")?.value;
  if (cat === "single_family" && !signals.find((s) => s.key === "formalPathConfirmed")) {
    addSignal(signals, "formalPathUnclear", "Tryb formalny", true, "inferred", "low");
  } else if (cat && cat !== "single_family") {
    addSignal(signals, "formalPathUnclear", "Tryb formalny", false, "inferred", "medium");
  }

  if (signals.find((s) => s.key === "planningStatus" && s.value === "mpzp_exists")) {
    const wzMention = /warunki\s+zabudowy|\bwz\b/i.test(prompt);
    if (!wzMention) {
      addSignal(signals, "avoidWzPrimary", "Ścieżka WZ", true, "inferred", "high");
    }
  }

  inferUnclearInfrastructure(prompt, signals);

  if (structured?.investorBriefStage) {
    addSignal(
      signals,
      "investorBriefStage",
      "Etap briefu inwestora",
      structured.investorBriefStage,
      "structured",
      "high"
    );
  }

  const hasBriefPositive = signals.some((s) => s.key === "hasInvestorBrief" && s.value === true);
  const hasBriefNegative = signals.some((s) => s.key === "hasInvestorBrief" && s.value === false);
  const briefPartial = signals.some(
    (s) => s.key === "investorBriefStage" && s.value === "partial"
  );
  let investorBriefStatus: string;
  if (hasBriefPositive && !hasBriefNegative) {
    investorBriefStatus = "available";
  } else if (briefPartial) {
    investorBriefStatus = "partial";
  } else if (hasBriefNegative) {
    investorBriefStatus = "missing";
  } else {
    investorBriefStatus = "unknown";
  }
  addSignal(
    signals,
    "investorBriefStatus",
    "Status briefu inwestora",
    investorBriefStatus,
    hasBriefNegative || briefPartial ? "text" : "inferred",
    hasBriefNegative ? "high" : "medium"
  );
  if (structured?.geotechnicalStatus) {
    addSignal(
      signals,
      "geotechnicalStatus",
      "Status geotechniki",
      structured.geotechnicalStatus,
      "structured",
      "high"
    );
  }
  if (structured?.projectSubtype) {
    addSignal(
      signals,
      "projectSubtype",
      "Typ inwestycji",
      structured.projectSubtype,
      "structured",
      "high"
    );
  }

  const classification = classifyProjectType(signals, prompt, structured);
  return addClassificationSignals(signals, classification);
}

export { classifyProjectType } from "./classifyProjectType";

export function signalsToDetectedLabels(signals: ProjectSignal[]): string[] {
  const labels: string[] = [];
  const map: Record<string, (v: string | boolean | number) => string | null> = {
    projectTypeLabel: (v) => String(v),
    buildingCategory: (v) => {
      const m: Record<string, string> = {
        single_family: "Dom jednorodzinny",
        multi_family: "Budynek wielorodzinny",
        service: "Budynek usługowy",
        services: "Budynek usługowy",
        office: "Budynek biurowy",
        retail: "Obiekt handlowy",
        commercial: "Obiekt handlowy",
        warehouse: "Hala magazynowa",
        warehouse_service_hall: "Hala magazynowo-usługowa",
        production_hall: "Hala produkcyjna",
        factory_industrial: "Zakład / fabryka przemysłowa",
        industrial: "Obiekt przemysłowy",
        public: "Obiekt użyteczności publicznej",
        public_utility: "Obiekt użyteczności publicznej",
      };
      return m[String(v)] ?? String(v);
    },
    projectSubtype: (v) => {
      const m: Record<string, string> = {
        single_family: "Typ: budynek jednorodzinny",
        multi_family: "Typ: budynek wielorodzinny",
        service: "Typ: budynek usługowy",
        office: "Typ: biurowy",
        retail: "Typ: handlowy",
        warehouse: "Typ: magazyn / hala magazynowa",
        warehouse_service_hall: "Typ: hala magazynowo-usługowa",
        production_hall: "Typ: hala produkcyjna",
        factory_industrial: "Typ: fabryka / zakład",
        public_utility: "Typ: użyteczność publiczna",
        extension_reconstruction: "Typ: rozbudowa / przebudowa",
        change_of_use: "Typ: zmiana użytkowania",
      };
      return m[String(v)] ?? `Typ inwestycji: ${String(v)}`;
    },
    planningStatus: (v) => {
      const m: Record<string, string> = {
        mpzp_exists: "Obowiązuje MPZP — do analizy wypis/wyrys i parametry zabudowy",
        no_mpzp: "Brak MPZP — potencjalna ścieżka WZ",
        unknown: "Status planistyczny do weryfikacji",
      };
      return m[String(v)] ?? String(v);
    },
    hasMpzpExcerpt: (v) =>
      v === true ? "Wypis i wyrys dostępny" : v === false ? "Brak wypisu i wyrysu z MPZP" : null,
    hasMdcp: (v) => (v === true ? "MDCP dostępna" : v === false ? "Brak MDCP / mapa niezamówiona" : null),
    hasGeotechnicalOpinion: (v) =>
      v === true
        ? "Rozpoznanie geotechniczne dostępne"
        : v === false
          ? "Brak rozpoznania geotechnicznego"
          : null,
    utilitiesUnclear: (v) => (v === true ? MISSING_UNCERTAIN_LABELS.utilities : null),
    hasPzt: (v) => (v === true ? "PZT w opracowaniu lub gotowy" : v === false ? "Brak PZT" : null),
    buildingType: (v) => {
      const m: Record<string, string> = {
        new: "Nowa zabudowa",
        existing: "Istniejący budynek / rozbudowa",
        mixed: "Zabudowa mieszana",
      };
      return m[String(v)] ?? null;
    },
    hasConservationConstraint: (v) => (v === true ? "Ograniczenia konserwatorskie" : null),
    hasEnvironmentalConstraint: (v) => (v === true ? "Ograniczenia środowiskowe" : null),
  };

  for (const s of signals) {
    const fn = map[s.key];
    if (fn) {
      const label = fn(s.value);
      if (label) labels.push(label);
    }
  }
  return [...new Set(labels)];
}
