import type { ProjectSignal, StructuredProjectFields } from "../types/architecture";

const TEXT_PATTERNS: Array<{
  key: string;
  label: string;
  patterns: RegExp[];
  value: string | boolean;
}> = [
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/dom\s+jednorodzinny/i, /budynek\s+jednorodzinny/i, /jednorodzinny/i],
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
    patterns: [/usługow/i, /handlow/i, /biurow/i],
    value: "services",
  },
  {
    key: "buildingCategory",
    label: "Kategoria obiektu",
    patterns: [/użyteczności\s+publicznej/i, /publiczn/i],
    value: "public",
  },
  {
    key: "planningStatus",
    label: "Status planistyczny",
    patterns: [/jest\s+mpzp/i, /obowiązuje\s+mpzp/i, /mamy\s+mpzp/i, /\bmpzp\b/i],
    value: "mpzp_exists",
  },
  {
    key: "planningStatus",
    label: "Status planistyczny",
    patterns: [/brak\s+mpzp/i, /nie\s+ma\s+mpzp/i, /bez\s+mpzp/i],
    value: "no_mpzp",
  },
  {
    key: "hasMpzpExcerpt",
    label: "Wypis i wyrys z MPZP",
    patterns: [/mam\s+wypis/i, /posiadam\s+wypis/i, /wypis\s+i\s+wyrys/i],
    value: true,
  },
  {
    key: "hasMpzpExcerpt",
    label: "Wypis i wyrys z MPZP",
    patterns: [
      /nie\s+mam\s+(jeszcze\s+)?wypisu/i,
      /brak\s+wypisu/i,
      /bez\s+wypisu/i,
      /nie\s+posiadam\s+wypisu/i,
    ],
    value: false,
  },
  {
    key: "hasMdcp",
    label: "MDCP",
    patterns: [/mam\s+mdcp/i, /posiadam\s+mapę\s+do\s+celów/i, /mapa\s+do\s+celów\s+projektowych/i],
    value: true,
  },
  {
    key: "hasMdcp",
    label: "MDCP",
    patterns: [/brak\s+mapy\s+do\s+celów/i, /nie\s+mam\s+mdcp/i, /brak\s+mdcp/i],
    value: false,
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
    patterns: [/istniejący/i, /rozbudow/i, /przebudow/i, /modernizac/i],
    value: "existing",
  },
  {
    key: "buildingType",
    label: "Typ budynku",
    patterns: [/nowy\s+budynek/i, /nowa\s+zabudow/i, /budowa\s+od\s+podstaw/i],
    value: "new",
  },
  {
    key: "hasConservationConstraint",
    label: "Ochrona konserwatorska",
    patterns: [/konserwator/i, /zabytek/i, /obszar\s+chroniony/i, /zabytkow/i],
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
    "Budynek usługowy": "services",
    "Użyteczność publiczna": "public",
    Inny: "other",
  };
  return m[cat] ?? cat;
}

export function extractProjectSignals(
  prompt: string,
  structured?: StructuredProjectFields
): ProjectSignal[] {
  const signals: ProjectSignal[] = [];
  const text = prompt.trim().toLowerCase();

  for (const rule of TEXT_PATTERNS) {
    if (rule.patterns.some((p) => p.test(prompt))) {
      const existing = signals.find((s) => s.key === rule.key);
      if (!existing || rule.value === false || rule.value === "no_mpzp") {
        addSignal(signals, rule.key, rule.label, rule.value, "text", "medium");
      }
    }
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
      if (/wypis|wyrys|mpzp/i.test(d)) addSignal(signals, "hasMpzpExcerpt", "Wypis i wyrys", true, "structured", "high");
      if (/mdcp|mapa do celów/i.test(d)) addSignal(signals, "hasMdcp", "MDCP", true, "structured", "high");
      if (/pzt/i.test(d)) addSignal(signals, "hasPzt", "PZT", true, "structured", "high");
      if (/pab/i.test(d)) addSignal(signals, "hasPab", "PAB", true, "structured", "high");
    }
  }

  if (!signals.find((s) => s.key === "planningStatus") && text.length > 20) {
    addSignal(signals, "planningStatus", "Status planistyczny", "unknown", "inferred", "low");
  }
  if (!signals.find((s) => s.key === "formalPathUnclear")) {
    addSignal(signals, "formalPathUnclear", "Tryb formalny", true, "inferred", "low");
  }
  if (signals.find((s) => s.key === "planningStatus" && s.value === "mpzp_exists")) {
    const wzMention = /warunki\s+zabudowy|\bwz\b/i.test(prompt);
    if (!wzMention) {
      addSignal(signals, "avoidWzPrimary", "Ścieżka WZ", true, "inferred", "high");
    }
  }

  return signals;
}

export function signalsToDetectedLabels(signals: ProjectSignal[]): string[] {
  const labels: string[] = [];
  const map: Record<string, (v: string | boolean | number) => string | null> = {
    buildingCategory: (v) => {
      const m: Record<string, string> = {
        single_family: "Budynek mieszkalny jednorodzinny",
        multi_family: "Budynek wielorodzinny",
        services: "Budynek usługowy",
        public: "Obiekt użyteczności publicznej",
      };
      return m[String(v)] ?? String(v);
    },
    planningStatus: (v) => {
      const m: Record<string, string> = {
        mpzp_exists: "Obowiązuje MPZP",
        no_mpzp: "Brak MPZP — potencjalna ścieżka WZ",
        unknown: "Status planistyczny do weryfikacji",
      };
      return m[String(v)] ?? String(v);
    },
    hasMpzpExcerpt: (v) => (v === true ? "Posiadany wypis i wyrys z MPZP" : v === false ? "Brak wypisu i wyrysu z MPZP" : null),
    hasMdcp: (v) => (v === true ? "MDCP dostępna" : v === false ? "Brak MDCP" : null),
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
