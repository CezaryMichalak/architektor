import type { ProjectSignal } from "../types/architecture";

const BASE_BY_STAGE: Record<string, number> = {
  concept: 8,
  preliminary: 18,
  building_permit_docs: 40,
  construction: 78,
  unknown: 15,
};

export function calculateProjectProgress(signals: ProjectSignal[]): number {
  const stage = String(signals.find((s) => s.key === "projectStage")?.value ?? "preliminary");
  let progress = BASE_BY_STAGE[stage] ?? 15;

  const planning = signals.find((s) => s.key === "planningStatus")?.value;
  const excerpt = signals.find((s) => s.key === "hasMpzpExcerpt")?.value;
  const mdcp = signals.find((s) => s.key === "hasMdcp")?.value;
  const pzt = signals.find((s) => s.key === "hasPzt")?.value;
  const pab = signals.find((s) => s.key === "hasPab")?.value;

  if (planning === "mpzp_exists") progress += 6;
  if (excerpt === true) progress += 14;
  else if (excerpt === false && planning === "mpzp_exists") progress += 3;

  if (mdcp === true) progress += 16;
  else if (mdcp === false) progress += 2;

  if (pzt === true) progress += 18;
  if (pab === true) progress += 12;

  if (planning === "unknown") progress = Math.min(progress, 18);

  if (planning === "mpzp_exists" && excerpt === false && mdcp === false) {
    progress = Math.max(25, Math.min(35, progress));
  }

  return Math.max(5, Math.min(95, Math.round(progress)));
}
