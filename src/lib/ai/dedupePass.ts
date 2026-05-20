import { deduplicateActions } from "../deduplicateActions";
import type {
  LegalBasis,
  ProjectAnalysis,
  ProjectSignal,
  RiskItem,
  SpecialistRecommendation,
} from "../../types/architecture";
import type { ProjectTypeKey } from "../../types/projectType";
import { projectTypeFromSignals } from "./signalHelpers";

function normalizeSpecialistKey(s: SpecialistRecommendation): string {
  const d = s.discipline.toLowerCase();
  if (/geotechn/i.test(d) || s.id === "geotechnical") return "geotechnical";
  if (/geodet/i.test(d) || s.id === "surveyor") return "surveyor";
  if (/ppoż|pożar|fire/i.test(d) || s.id === "fire") return "fire";
  if (/ruch|drog|traffic/i.test(d) || s.id === "traffic") return "traffic";
  return s.id;
}

function dedupeSpecialists(specialists: SpecialistRecommendation[]): SpecialistRecommendation[] {
  const byKey = new Map<string, SpecialistRecommendation>();
  for (const s of specialists) {
    const key = normalizeSpecialistKey(s);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, s.id === key ? s : { ...s, id: key === "geotechnical" ? "geotechnical" : s.id });
      continue;
    }
    const preferCanonical =
      (key === "geotechnical" && s.id === "geotechnical") ||
      (existing.discipline.length < s.discipline.length && /geotechnik/i.test(s.discipline));
    if (preferCanonical || s.priority === "essential") {
      byKey.set(key, {
        ...s,
        id: key,
        discipline: key === "geotechnical" ? "Geotechnik" : s.discipline,
      });
    }
  }
  return [...byKey.values()];
}

function dedupeLegalBasis(items: LegalBasis[]): LegalBasis[] {
  const seen = new Map<string, LegalBasis>();
  for (const item of items) {
    const existing = seen.get(item.id);
    if (!existing || (item.verificationRequired && !existing.verificationRequired)) {
      seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

function normalizeRiskTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/geotechnik[aę]?/gi, "geotechnik")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeRisks(risks: RiskItem[], pt: ProjectTypeKey): RiskItem[] {
  const byKey = new Map<string, RiskItem>();
  for (const r of risks) {
    const key = r.id || normalizeRiskTitle(r.title);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, r);
      continue;
    }
    const score = (risk: RiskItem) =>
      (risk.description?.length ?? 0) +
      (risk.mitigation?.length ?? 0) +
      (/magazyn|hala|tir|płyt/i.test(risk.title) &&
      (pt === "warehouse" || pt === "warehouse_service_hall")
        ? 20
        : 0);
    if (score(r) > score(existing)) byKey.set(key, r);
  }
  return [...byKey.values()];
}

/** Final deduplication of specialists, legal basis, actions, and risks. */
export function applyDedupePass(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[]
): ProjectAnalysis {
  const pt = projectTypeFromSignals(signals);

  return {
    ...analysis,
    specialists: dedupeSpecialists(analysis.specialists),
    legalBasis: dedupeLegalBasis(analysis.legalBasis),
    recommendedActions: deduplicateActions(analysis.recommendedActions, pt).map((a, i) => ({
      ...a,
      order: i + 1,
    })),
    risks: dedupeRisks(analysis.risks, pt),
  };
}
