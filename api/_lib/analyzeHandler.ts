import OpenAI from "openai";
import type { AnalysisErrorCode } from "./analysisErrorCodes.js";
import { mapHttpStatusToErrorCode } from "./analysisErrorCodes.js";
import { ARCHITEKTOR_SYSTEM_PROMPT } from "./systemPrompt.js";
import { isOpenAiKeyConfigured, loadEnvLocal } from "./loadEnv.js";

const IS_DEV = process.env.NODE_ENV !== "production";

function apiLog(...args: unknown[]): void {
  console.log("[api/analyze]", ...args);
}

export interface AnalyzeApiSuccess {
  ok: true;
  analysis: unknown;
  meta: { source: "ai"; usedFallback: false };
}

export interface AnalyzeApiFailure {
  ok: false;
  useFallback: true;
  error: string;
  message: string;
  errorCode: AnalysisErrorCode;
  fallbackReason: string;
  details?: string;
}

export type AnalyzeApiResult = AnalyzeApiSuccess | AnalyzeApiFailure;

interface OpenAiCallFailure {
  ok: false;
  error: string;
  errorCode: AnalysisErrorCode;
  fallbackReason: string;
  details?: string;
}

type OpenAiCallResult = { ok: true; analysis: unknown } | OpenAiCallFailure;

function mapToApiFailure(result: OpenAiCallFailure): AnalyzeApiFailure {
  const fallbackReason = mapFallbackReason(result.errorCode, result.fallbackReason);
  apiLog("returning fallback response | fallbackReason:", fallbackReason, "| errorCode:", result.errorCode);
  return {
    ok: false,
    useFallback: true,
    error: result.error,
    message: result.error,
    errorCode: result.errorCode,
    fallbackReason,
    details: result.details,
  };
}

function mapFallbackReason(errorCode: AnalysisErrorCode, internalReason: string): string {
  if (errorCode === "missing_api_key") return "missing_openai_api_key";
  if (errorCode === "invalid_json_schema") return "schema_validation_failed";
  if (
    errorCode === "ai_request_failed" ||
    errorCode === "network_error" ||
    errorCode === "invalid_model_response" ||
    errorCode === "model_not_supported" ||
    errorCode === "sdk_error"
  ) {
    return "openai_request_failed";
  }
  return internalReason;
}

async function callOpenAI(userPrompt: string): Promise<OpenAiCallResult> {
  if (IS_DEV) {
    loadEnvLocal();
  }

  const apiKeyPresent = isOpenAiKeyConfigured();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  apiLog("OPENAI_API_KEY present:", apiKeyPresent);
  apiLog("model:", model);

  if (!apiKeyPresent) {
    apiLog("AI pipeline skipped — missing OPENAI_API_KEY");
    return {
      ok: false,
      error: "Brak skonfigurowanego OPENAI_API_KEY",
      errorCode: "missing_api_key",
      fallbackReason: "missing_api_key",
    };
  }

  apiLog("AI pipeline started");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITEKTOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      apiLog("AI pipeline failed — empty model content");
      return {
        ok: false,
        error: "Pusta odpowiedź modelu",
        errorCode: "invalid_model_response",
        fallbackReason: "empty_model_content",
      };
    }

    try {
      const parsed = JSON.parse(content) as unknown;
      apiLog("AI pipeline succeeded");
      return { ok: true, analysis: parsed };
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : "JSON parse error";
      apiLog("AI pipeline failed — JSON parse:", message);
      return {
        ok: false,
        error: "Model zwrócił niepoprawny JSON",
        errorCode: "invalid_model_response",
        fallbackReason: "json_parse_error",
        details: message,
      };
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : "Błąd OpenAI";
    apiLog("AI pipeline failed |", name, message);

    if (err instanceof OpenAI.APIError) {
      const errorCode = mapHttpStatusToErrorCode(err.status ?? 500, message);
      return {
        ok: false,
        error: message,
        errorCode,
        fallbackReason: errorCode,
        details: err.code ?? message,
      };
    }

    return {
      ok: false,
      error: message,
      errorCode: "network_error",
      fallbackReason: "network_error",
      details: message,
    };
  }
}

export async function handleAnalyzeRequest(userPrompt: string): Promise<AnalyzeApiResult> {
  const result = await callOpenAI(userPrompt);
  if (!result.ok) {
    return mapToApiFailure(result);
  }
  return {
    ok: true,
    analysis: result.analysis,
    meta: { source: "ai", usedFallback: false },
  };
}

export function missingUserPromptFailure(): AnalyzeApiFailure {
  return {
    ok: false,
    useFallback: true,
    error: "Brak userPrompt",
    message: "Brak userPrompt",
    errorCode: "invalid_model_response",
    fallbackReason: "missing_user_prompt",
  };
}

export function serverExceptionFailure(message: string): AnalyzeApiFailure {
  return {
    ok: false,
    useFallback: true,
    error: message,
    message,
    errorCode: "server_unavailable",
    fallbackReason: "server_exception",
    details: message,
  };
}
