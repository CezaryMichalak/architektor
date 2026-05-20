import type { ProjectSignal } from "../types/architecture";

const BASE_BY_STAGE: Record<string, number> = {
  concept: 12,
  preliminary: 22,
  building_permit_docs: 52,
  construction: 82,
  unknown: 18,
};

const STAGE_CEILING: Record<string, number> = {
  concept: 35,
  preliminary: 55,
  building_permit_docs: 78,
  construction: 95,
  unknown: 40,
};

/**
 * Project process advancement (0–95) from real stage and formal documentation only.
 * Does not increase when user answers clarification questions.
 */
export function calculateProjectProgress(signals: ProjectSignal[]): number {
  const stage = String(signals.find((s) => s.key === "projectStage")?.value ?? "concept");
  let progress = BASE_BY_STAGE[stage] ?? BASE_BY_STAGE.unknown;
  const ceiling = STAGE_CEILING[stage] ?? STAGE_CEILING.unknown;

  const planning = signals.find((s) => s.key === "planningStatus")?.value;
  const excerpt = signals.find((s) => s.key === "hasMpzpExcerpt")?.value;
  const mdcp = signals.find((s) => s.key === "hasMdcp")?.value;
  const pzt = signals.find((s) => s.key === "hasPzt")?.value;
  const pab = signals.find((s) => s.key === "hasPab")?.value;

  if (planning === "mpzp_exists") progress += 4;
  if (excerpt === true) progress += 8;
  else if (excerpt === false && planning === "mpzp_exists") progress += 2;

  if (mdcp === true) progress += 10;
  else if (mdcp === false) progress += 1;

  if (pzt === true) progress += 14;
  if (pab === true) progress += 10;

  if (planning === "unknown") progress = Math.min(progress, 22);

  if (stage === "concept") {
    progress = Math.max(20, Math.min(ceiling, progress));
    if (planning === "mpzp_exists" && excerpt === false && mdcp === false) {
      progress = Math.min(32, progress);
    }
  } else if (stage === "preliminary") {
    progress = Math.min(progress, ceiling);
    if (planning === "mpzp_exists" && excerpt === false && mdcp === false) {
      progress = Math.max(28, Math.min(48, progress));
    }
  } else {
    progress = Math.min(progress, ceiling);
  }

  return Math.max(5, Math.min(95, Math.round(progress)));
}
