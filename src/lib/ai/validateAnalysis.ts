import type { ProjectAnalysis } from "../../types/architecture";
import { collectProjectAnalysisErrors, parseProjectAnalysisJson } from "./projectAnalysisSchema";

export interface ValidationResult {
  ok: boolean;
  analysis?: ProjectAnalysis;
  errors: string[];
  /** All schema errors (dev); UI uses first 3 via errors. */
  allErrors?: string[];
}

const UI_ERROR_LIMIT = 3;

function logDevValidationErrors(allErrors: string[]): void {
  if (!import.meta.env.DEV) return;
  const missing = allErrors.filter((e) => e.includes("missing"));
  const wrongType = allErrors.filter((e) => e.includes("wrong type") || e.includes("must be"));
  const invalidEnum = allErrors.filter((e) => e.includes("invalid enum"));
  const invalidArray = allErrors.filter((e) => /\[\d+\]/.test(e));
  console.warn("[architektor-ai] schema validation failed", {
    total: allErrors.length,
    missingFields: missing.slice(0, 10),
    wrongTypes: wrongType.slice(0, 10),
    invalidEnums: invalidEnum.slice(0, 10),
    invalidArrayItems: invalidArray.slice(0, 10),
    firstErrors: allErrors.slice(0, UI_ERROR_LIMIT),
  });
}

export function validateAnalysis(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (raw === null || raw === undefined) {
    return { ok: false, errors: ["Brak danych analizy"] };
  }

  const allErrors = collectProjectAnalysisErrors(raw);
  if (allErrors.length > 0) {
    logDevValidationErrors(allErrors);
    const uiErrors = [
      "Odpowiedź AI nie spełnia wymaganego schematu ProjectAnalysis",
      ...allErrors.slice(0, UI_ERROR_LIMIT),
    ];
    return { ok: false, errors: uiErrors, allErrors };
  }

  const parsed = parseProjectAnalysisJson(raw);
  if (!parsed) {
    return {
      ok: false,
      errors: ["Odpowiedź AI nie spełnia wymaganego schematu ProjectAnalysis"],
    };
  }

  if (parsed.recommendedActions.length === 0 && parsed.missingDocuments.length === 0) {
    errors.push("Analiza musi zawierać co najmniej dokumenty lub kroki działania");
  }

  if (!parsed.immediateNextStep.trim()) {
    errors.push("Brak immediateNextStep");
  }

  if (!parsed.disclaimer.trim()) {
    errors.push("Brak disclaimer");
  }

  if (errors.length > 0) {
    if (import.meta.env.DEV) {
      console.warn("[architektor-ai] post-parse validation failed", errors);
    }
    return { ok: false, errors: errors.slice(0, UI_ERROR_LIMIT + 1), allErrors: errors };
  }

  if (import.meta.env.DEV) {
    console.log("[architektor-ai] schema validation passed");
  }

  return { ok: true, analysis: parsed, errors: [] };
}
