import type { ProjectAnalysis } from "../../types/architecture";
import { parseProjectAnalysisJson } from "./projectAnalysisSchema";

export interface ValidationResult {
  ok: boolean;
  analysis?: ProjectAnalysis;
  errors: string[];
}

export function validateAnalysis(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (raw === null || raw === undefined) {
    return { ok: false, errors: ["Brak danych analizy"] };
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
    return { ok: false, errors };
  }

  return { ok: true, analysis: parsed, errors: [] };
}
