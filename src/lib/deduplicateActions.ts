import type { ActionStep } from "../types/architecture";
import type { ProjectTypeKey } from "../types/projectType";

type ActionPurpose =
  | "mpzp"
  | "mdcp"
  | "geotech"
  | "brief"
  | "wz"
  | "pzt"
  | "coordination"
  | "fire"
  | "traffic"
  | "structure"
  | "utilities"
  | "formal";

const PURPOSE_PATTERNS: Array<{ purpose: ActionPurpose; patterns: RegExp[] }> = [
  {
    purpose: "mpzp",
    patterns: [/wypis|wyrys|mpzp/i],
  },
  {
    purpose: "mdcp",
    patterns: [/mdcp|geodet|pomiar\s+geodezyj/i, /mapa\s+do\s+celów/i],
  },
  {
    purpose: "geotech",
    patterns: [/geotechniczn|opinia\s+geotechniczn/i, /rozpoznanie\s+geotechniczn/i],
  },
  {
    purpose: "brief",
    patterns: [/brief|wytyczne\s+inwestora|program\s+powierzchni/i, /brief\s+technologiczn/i],
  },
  {
    purpose: "wz",
    patterns: [/warunki\s+zabudowy|\bwz\b|wniosek\s+o\s+wz/i],
  },
  {
    purpose: "pzt",
    patterns: [/pzt|pab|koncepcj[aę]\s+zagospodarowania/i, /dokumentacj[aę]\s+pzt/i],
  },
  {
    purpose: "coordination",
    patterns: [/koordynacj[aę]\s+branż|uzgodnienia\s+branż|wczesn[aą]\s+koordynacj/i],
  },
  {
    purpose: "fire",
    patterns: [/ppoż|przeciwpożar|drogi\s+pożarow/i, /obciążenie\s+pożarow/i],
  },
  {
    purpose: "traffic",
    patterns: [/\btir\b|plac\s+manewrow|zjazd|ruch\s+ciężar|komunikacj/i],
  },
  {
    purpose: "structure",
    patterns: [/konstrukcj|posadzk|fundament|płyt[aę]\s+fundamentow/i],
  },
  {
    purpose: "utilities",
    patterns: [/przyłąc|media|wod[aę]\s+opadow|odwodnien/i],
  },
  {
    purpose: "formal",
    patterns: [/tryb\s+formaln|pozwolenie\s+na\s+budowę|zgłoszenie\s+robót|ścieżk[aę]\s+formaln/i],
  },
];

const TYPE_SPECIFIC_HINTS: Partial<Record<ProjectTypeKey, RegExp[]>> = {
  warehouse_service_hall: [
    /technologiczno[-\s]?logistyczn/i,
    /wysokiego\s+składowania/i,
    /magazynowo/i,
    /tir/i,
  ],
  warehouse: [/magazyn|składowan|tir|regał/i],
  production_hall: [/technologiczn|produkcyjn/i],
  factory_industrial: [/fabryk|procesow|substancj/i],
  office: [/biurow|hvac|parking/i],
};

function purposeOf(title: string): ActionPurpose | null {
  const t = title.toLowerCase();
  for (const { purpose, patterns } of PURPOSE_PATTERNS) {
    if (patterns.some((p) => p.test(t))) return purpose;
  }
  return null;
}

function specificityScore(action: ActionStep, projectType?: ProjectTypeKey): number {
  const t = action.title.toLowerCase();
  let score = t.length;
  if (action.badge) score += 8;
  if (action.description && action.description.length > action.title.length + 20) {
    score += 5;
  }
  const hints = projectType ? TYPE_SPECIFIC_HINTS[projectType] : undefined;
  if (hints?.some((p) => p.test(t))) score += 25;
  if (/doprecyzować|zweryfikować|ustalić|określić/i.test(t)) score += 3;
  return score;
}

/**
 * Merge recommended actions: same purpose → keep more specific; type-specific over generic.
 */
export function deduplicateActions(
  actions: ActionStep[],
  projectType?: ProjectTypeKey
): ActionStep[] {
  const byPurpose = new Map<ActionPurpose, ActionStep>();
  const ungrouped: ActionStep[] = [];

  for (const action of actions) {
    const purpose = purposeOf(action.title);
    if (!purpose) {
      ungrouped.push(action);
      continue;
    }
    const existing = byPurpose.get(purpose);
    if (
      !existing ||
      specificityScore(action, projectType) > specificityScore(existing, projectType)
    ) {
      byPurpose.set(purpose, action);
    }
  }

  const merged = [...byPurpose.values(), ...ungrouped];
  merged.sort((a, b) => a.order - b.order);

  return merged.map((a, i) => ({ ...a, order: i + 1 }));
}
