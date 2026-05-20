import { evaluateGeotechnicalNeeds } from "../../data/geotechnicalRules";
import { evaluateInvestorBrief } from "../../data/investorBriefRules";
import { getProjectTypeEntry } from "../../data/projectTypeMatrix";
import {
  KNOWLEDGE_BASE_LEGAL,
  getLegalSourceById,
  legalSourceToBasis,
} from "../../data/knowledgeBase";
import { SPECIALIST_MATRIX } from "../../data/specialistMatrix";
import type {
  ActionStep,
  LegalBasis,
  ProjectAnalysis,
  ProjectSignal,
  SpecialistRecommendation,
} from "../../types/architecture";
import { describeActionStep } from "../actionDescriptions";
import type { ProjectTypeKey } from "../../types/projectType";
import {
  hasSignal,
  isWarehouseLikeType,
  projectTypeFromSignals,
  signalValue,
} from "./signalHelpers";

const WAREHOUSE_LEGAL_IDS = [
  "mpzp-lokalna",
  "prawo-budowlane",
  "rozporzadzenie-projekt-budowlany",
  "przepisy-geodezyjne",
  "przepisy-ppoz",
  "przepisy-srodowisko",
] as const;

function ensureSpecialist(
  specialists: SpecialistRecommendation[],
  id: string
): SpecialistRecommendation[] {
  if (specialists.some((s) => s.id === id)) return specialists;
  const fromMatrix = SPECIALIST_MATRIX.find((s) => s.id === id);
  return fromMatrix ? [...specialists, fromMatrix] : specialists;
}

function basisFromId(id: string): LegalBasis | null {
  const source = getLegalSourceById(id);
  if (source) return legalSourceToBasis(source);
  const kb = KNOWLEDGE_BASE_LEGAL.find((l) => l.id === id);
  return kb ? { ...kb, verificationRequired: kb.verificationRequired ?? false } : null;
}

function mergeActions(
  existing: ActionStep[],
  templateTitles: string[],
  pt: ProjectTypeKey,
  signals: ProjectSignal[]
): ActionStep[] {
  const merged = [...existing];
  let order = merged.length > 0 ? Math.max(...merged.map((a) => a.order)) + 1 : 1;

  for (const title of templateTitles) {
    const duplicate = merged.some(
      (a) =>
        a.title.toLowerCase() === title.toLowerCase() ||
        (title.length > 12 && a.title.toLowerCase().includes(title.slice(0, 18).toLowerCase()))
    );
    if (duplicate) continue;

    if (/wypis|mpzp/i.test(title) && hasSignal(signals, "hasMpzpExcerpt", true)) continue;
    if (/mdcp|geodet/i.test(title) && hasSignal(signals, "hasMdcp", true)) continue;
    if (/geotechniczn/i.test(title) && hasSignal(signals, "hasGeotechnicalOpinion", true)) continue;

    merged.push({
      id: `enrich-${pt}-${order}`,
      order: order++,
      title,
      description: describeActionStep(title),
      badge: pt === "warehouse" || pt === "warehouse_service_hall" ? "LOG" : undefined,
    });
  }

  return merged;
}

/** Enrich warehouse / hall analyses with type-specific docs, actions, specialists, and legal basis. */
export function applyDomainEnrichmentPass(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[],
  _prompt: string
): ProjectAnalysis {
  const pt = projectTypeFromSignals(signals);
  if (!isWarehouseLikeType(pt)) return analysis;

  const entry = getProjectTypeEntry(pt);
  let result = { ...analysis };

  result.projectSubtype = pt;
  result.projectType = entry.labelPl;

  // Actions — target 8–10 warehouse-specific steps from matrix template
  const enrichedActions = mergeActions(result.recommendedActions, entry.actionPlanTemplate, pt, signals);
  if (enrichedActions.length < 8) {
    const extras = entry.actionPlanTemplate.filter(
      (t) => !enrichedActions.some((a) => a.title.includes(t.slice(0, 20)))
    );
    for (const title of extras.slice(0, 10 - enrichedActions.length)) {
      enrichedActions.push({
        id: `enrich-fill-${enrichedActions.length}`,
        order: enrichedActions.length + 1,
        title,
        description: describeActionStep(title),
        badge: "LOG",
      });
    }
  }
  result.recommendedActions = enrichedActions.sort((a, b) => a.order - b.order);

  // Specialists typical for warehouse halls
  let specs = result.specialists;
  for (const id of entry.typicalSpecialists) {
    specs = ensureSpecialist(specs, id);
  }
  if (pt === "warehouse" || pt === "warehouse_service_hall") {
    specs = ensureSpecialist(specs, "traffic");
    specs = ensureSpecialist(specs, "fire");
    specs = ensureSpecialist(specs, "geotechnical");
  }
  result.specialists = specs;

  // Legal basis — MPZP, Prawo budowlane, rozporządzenie projektu, geodezja, geotechnika, WT, ppoż, środowisko
  const legalIds: string[] = [...WAREHOUSE_LEGAL_IDS];
  if (signalValue(signals, "planningStatus") === "no_mpzp") {
    legalIds.push("decyzja-wz");
  }
  const wtBasis = KNOWLEDGE_BASE_LEGAL.find((l) => l.scope === "technical_regulation");
  const legal: LegalBasis[] = [...result.legalBasis];
  for (const id of legalIds) {
    const b = basisFromId(id);
    if (b && !legal.some((l) => l.id === b.id)) legal.push(b);
  }
  if (wtBasis && !legal.some((l) => l.id === "rozporzadzenie-warunki-techniczne")) {
    const wt = basisFromId("rozporzadzenie-warunki-techniczne");
    if (wt) legal.push(wt);
  }
  const geo = evaluateGeotechnicalNeeds({
    projectType: pt,
    isNewBuilding: true,
    isIndustrial: true,
    isExtension: false,
    hasGeotechnicalOpinion: hasSignal(signals, "hasGeotechnicalOpinion", true),
  });
  for (const lb of geo.legalBasis) {
    if (!legal.some((l) => l.id === lb.id)) legal.push(lb);
  }
  const brief = evaluateInvestorBrief(
    pt,
    hasSignal(signals, "hasInvestorBrief", true),
    hasSignal(signals, "investorBriefStage", "partial")
  );
  for (const lb of brief.legalBasis) {
    if (!legal.some((l) => l.id === lb.id)) legal.push(lb);
  }
  result.legalBasis = legal;

  // Risks from geotechnical rules if thin
  if (result.risks.length < 2 && geo.risks.length) {
    result.risks = [...result.risks, ...geo.risks.filter((r) => !result.risks.some((x) => x.id === r.id))];
  }

  // Key concerns as uncertain if not covered
  for (const concern of entry.keyConcerns.slice(0, 3)) {
    if (!result.uncertainInputs.some((u) => u.toLowerCase().includes(concern.slice(0, 12).toLowerCase()))) {
      result.uncertainInputs = [...result.uncertainInputs, `${concern} — do doprecyzowania`];
    }
  }

  return result;
}
