import type {
  ClarificationAnswer,
  ProjectAnalysis,
  ProjectSignal,
  StructuredProjectFields,
} from "../../types/architecture";
import type { AnalysisErrorCode } from "./analysisErrorCodes";
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
  errorCode?: AnalysisErrorCode;
  fallbackReason?: string;
  statusCode?: number;
}

interface AnalyzeApiJson {
  ok?: boolean;
  analysis?: unknown;
  error?: string;
  errorCode?: AnalysisErrorCode;
  fallbackReason?: string;
  details?: string;
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

    let data: AnalyzeApiJson = {};
    try {
      data = (await res.json()) as AnalyzeApiJson;
    } catch {
      return {
        ok: false,
        error: `Błąd API (${res.status}) — niepoprawna odpowiedź serwera`,
        errorCode: res.status === 404 ? "server_unavailable" : "ai_request_failed",
        fallbackReason: "invalid_server_response",
        statusCode: res.status,
      };
    }

    if (!res.ok || !data.ok) {
      if (import.meta.env.DEV) {
        console.warn("[architektor-ai] request failed", {
          status: res.status,
          errorCode: data.errorCode,
          fallbackReason: data.fallbackReason,
          error: data.error,
        });
      }
      return {
        ok: false,
        error: data.error ?? `Błąd API (${res.status})`,
        errorCode: data.errorCode ?? (res.status === 404 ? "server_unavailable" : "ai_request_failed"),
        fallbackReason: data.fallbackReason,
        statusCode: res.status,
      };
    }

    if (import.meta.env.DEV) {
      console.log("[architektor-ai] success", { status: res.status });
    }

    return { ok: true, analysis: data.analysis as ProjectAnalysis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd połączenia z API";
    if (import.meta.env.DEV) {
      console.warn("[architektor-ai] network/sdk error", message);
    }
    return {
      ok: false,
      error: message,
      errorCode: "network_error",
      fallbackReason: "client_network_error",
    };
  }
}
