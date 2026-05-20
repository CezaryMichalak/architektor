import { getProjectTypeEntry } from "../data/projectTypeMatrix";
import type { ActionStep, ProjectSignal } from "../types/architecture";
import type { ProjectTypeKey } from "../types/projectType";
import { describeActionStep } from "./actionDescriptions";
import { classifyProjectType } from "./classifyProjectType";

function signalValue(
  signals: ProjectSignal[],
  key: string
): string | boolean | number | undefined {
  return signals.find((s) => s.key === key)?.value;
}

function hasSignal(signals: ProjectSignal[], key: string, value?: string | boolean): boolean {
  const v = signalValue(signals, key);
  if (v === undefined) return false;
  if (value === undefined) return true;
  return String(v) === String(value);
}

/**
 * Build type-specific numbered action plan (replaces generic 10-step list).
 */
export function buildTypeSpecificActionPlan(
  signals: ProjectSignal[],
  prompt: string,
  startOrder = 1
): ActionStep[] {
  const classification = classifyProjectType(signals, prompt);
  const pt: ProjectTypeKey =
    (String(signalValue(signals, "projectSubtype") ?? "") as ProjectTypeKey) ||
    classification.projectType;
  const entry = getProjectTypeEntry(pt);
  const steps: ActionStep[] = [];
  let order = startOrder;

  const planning = signalValue(signals, "planningStatus");
  const hasMpzp = planning === "mpzp_exists";
  const noMpzp = planning === "no_mpzp" || planning === "wz_path";

  for (const title of entry.actionPlanTemplate) {
    const id = `type-action-${pt}-${order}`;
    let skip = false;

    if (/wypis|mpzp/i.test(title) && hasMpzp && hasSignal(signals, "hasMpzpExcerpt", true)) {
      skip = true;
    }
    if (/wz|warunki zabudowy/i.test(title) && hasMpzp) skip = true;
    if (/mdcp|geodet/i.test(title) && hasSignal(signals, "hasMdcp", true)) skip = true;
    if (/geotechniczn/i.test(title) && hasSignal(signals, "hasGeotechnicalOpinion", true)) {
      skip = true;
    }
    if (/brief inwestora|wytyczne inwestora/i.test(title) && hasSignal(signals, "hasInvestorBrief", true)) {
      skip = true;
    }
    if (/brief technologiczn/i.test(title) && hasSignal(signals, "hasTechnologyBrief", true)) {
      skip = true;
    }
    if (
      /brief technologiczno[-\s]?logistyczn/i.test(title) &&
      hasSignal(signals, "hasTechnologyBrief", true)
    ) {
      skip = true;
    }

    if (!skip) {
      steps.push({
        id,
        order: order++,
        title,
        description: describeActionStep(title),
        badge:
          pt === "warehouse" || pt === "warehouse_service_hall"
            ? "LOG"
            : pt === "factory_industrial"
              ? "TECH"
              : undefined,
      });
    }
  }

  if (noMpzp && !steps.some((s) => /warunki|wz/i.test(s.title))) {
    steps.unshift({
      id: `type-action-${pt}-wz`,
      order: 0,
      title: "Potwierdzić ścieżkę decyzji o warunkach zabudowy (WZ)",
      description: "Przy braku MPZP — formalna podstawa parametrów zabudowy.",
      badge: "WZ",
    });
  }

  if (!hasSignal(signals, "hasMdcp", true) && !steps.some((s) => /mdcp|geodet/i.test(s.title))) {
    steps.push({
      id: `type-action-${pt}-mdcp`,
      order: order++,
      title: "Zlecić pomiad geodezyjny i MDCP",
      description: "Mapa do celów projektowych — podstawa PZT.",
      badge: "MDCP",
    });
  }

  return steps
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i + 1 }));
}
