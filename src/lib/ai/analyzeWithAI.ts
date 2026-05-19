import type {
  ClarificationAnswer,
  ProjectAnalysis,
  ProjectSignal,
  StructuredProjectFields,
} from "../../types/architecture";
import { buildUserPrompt } from "./architektorSystemPrompt";

export interface AnalyzeWithAIRequest {
  projectDescription: string;
  structuredFields: StructuredProjectFields;
  clarificationAnswers?: ClarificationAnswer[];
  ruleBasedSignals: ProjectSignal[];
}

export interface AnalyzeWithAIResult {
  ok: boolean;
  analysis?: ProjectAnalysis;
  error?: string;
  statusCode?: number;
}

export async function analyzeWithAI(
  request: AnalyzeWithAIRequest
): Promise<AnalyzeWithAIResult> {
  const userPrompt = buildUserPrompt({
    projectDescription: request.projectDescription,
    structuredFields: request.structuredFields as Record<string, unknown>,
    clarificationAnswers: request.clarificationAnswers?.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
    })),
    ruleBasedSignals: request.ruleBasedSignals.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      confidence: s.confidence,
    })),
  });

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPrompt }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      analysis?: unknown;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? `Błąd API (${res.status})`,
        statusCode: res.status,
      };
    }

    return { ok: true, analysis: data.analysis as ProjectAnalysis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd połączenia z API";
    return { ok: false, error: message };
  }
}
