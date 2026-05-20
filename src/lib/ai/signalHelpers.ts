import type { ProjectSignal } from "../../types/architecture";
import type { ProjectTypeKey } from "../../types/projectType";

export function signalValue(
  signals: ProjectSignal[],
  key: string
): string | boolean | number | undefined {
  return signals.find((s) => s.key === key)?.value;
}

export function hasSignal(
  signals: ProjectSignal[],
  key: string,
  value?: string | boolean
): boolean {
  const v = signalValue(signals, key);
  if (v === undefined) return false;
  if (value === undefined) return true;
  return String(v) === String(value);
}

export function projectTypeFromSignals(signals: ProjectSignal[]): ProjectTypeKey {
  return (String(signalValue(signals, "projectSubtype") ?? "unknown") as ProjectTypeKey) || "unknown";
}

export const INVESTOR_BRIEF_INCOMPLETE_PROMPT_PATTERNS = [
  /nie\s+przekazał\s+pełnych\s+wytycznych/i,
  /brak\s+briefu/i,
  /brak\s+pełnych\s+wytycznych\s+technologiczno[-\s]?logistyczn/i,
  /brak\s+wytycznych/i,
  /bez\s+szczegółowych\s+wytycznych/i,
  /brak\s+brief/i,
  /nie\s+mam\s+wytycznych/i,
  /nie\s+posiadam\s+wytycznych/i,
];

export function promptIndicatesIncompleteBrief(prompt: string): boolean {
  return INVESTOR_BRIEF_INCOMPLETE_PROMPT_PATTERNS.some((p) => p.test(prompt));
}

export function investorBriefIsIncomplete(signals: ProjectSignal[], prompt: string): boolean {
  const status = String(signalValue(signals, "investorBriefStatus") ?? "");
  if (status === "missing" || status === "partial" || status === "incomplete") return true;
  if (hasSignal(signals, "hasInvestorBrief", false)) return true;
  if (hasSignal(signals, "investorBriefStage", "partial")) return true;
  if (hasSignal(signals, "investorBriefStage", "missing")) return true;
  return promptIndicatesIncompleteBrief(prompt);
}

export const WAREHOUSE_PROJECT_TYPES: ProjectTypeKey[] = [
  "warehouse",
  "warehouse_service_hall",
  "production_hall",
];

export function isWarehouseLikeType(pt: ProjectTypeKey): boolean {
  return WAREHOUSE_PROJECT_TYPES.includes(pt) || pt === "factory_industrial";
}
