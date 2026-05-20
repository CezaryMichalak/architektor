import { ARCHITEKTOR_SYSTEM_PROMPT } from "../src/lib/ai/architektorSystemPrompt";
import type { AnalysisErrorCode } from "../src/lib/ai/analysisErrorCodes";
import { mapHttpStatusToErrorCode } from "../src/lib/ai/analysisErrorCodes";
import { isOpenAiKeyConfigured, loadEnvLocal } from "./loadEnv";

const IS_DEV = process.env.NODE_ENV !== "production";

function apiLog(...args: unknown[]): void {
  if (IS_DEV) console.log("[architektor-api]", ...args);
}

export interface AnalyzeApiSuccess {
  ok: true;
  analysis: unknown;
}

export interface AnalyzeApiFailure {
  ok: false;
  useFallback: true;
  error: string;
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
  apiLog("useFallback:", true, "| fallbackReason:", fallbackReason, "| errorCode:", result.errorCode);
  return {
    ok: false,
    useFallback: true,
    error: result.error,
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
  loadEnvLocal();

  const apiKeyPresent = isOpenAiKeyConfigured();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  apiLog("request received | API key present:", apiKeyPresent, "| model:", model);

  if (!apiKeyPresent) {
    apiLog("AI skipped — missing OPENAI_API_KEY");
    return {
      ok: false,
      error: "Brak skonfigurowanego OPENAI_API_KEY",
      errorCode: "missing_api_key",
      fallbackReason: "missing_api_key",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY!;

  apiLog("AI request started");
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ARCHITEKTOR_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd połączenia z OpenAI";
    apiLog("AI request failed (network):", message);
    return {
      ok: false,
      error: message,
      errorCode: "network_error",
      fallbackReason: "network_error",
      details: message,
    };
  }

  apiLog("OpenAI HTTP status:", res.status);

  if (!res.ok) {
    const errText = await res.text();
    const errorCode = mapHttpStatusToErrorCode(res.status, errText);
    apiLog("AI request failed | errorCode:", errorCode);
    return {
      ok: false,
      error: `OpenAI API: ${res.status}`,
      errorCode,
      fallbackReason: errorCode,
      details: errText.slice(0, 500),
    };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string; code?: string };
  };

  if (data.error) {
    const msg = data.error.message ?? "OpenAI error";
    const errorCode: AnalysisErrorCode = /model/i.test(msg)
      ? "model_not_supported"
      : "ai_request_failed";
    apiLog("AI request failed (payload error):", msg);
    return {
      ok: false,
      error: msg,
      errorCode,
      fallbackReason: errorCode,
      details: msg,
    };
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    apiLog("AI request failed — empty model content");
    return {
      ok: false,
      error: "Pusta odpowiedź modelu",
      errorCode: "invalid_model_response",
      fallbackReason: "empty_model_content",
    };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    apiLog(
      "AI request succeeded | schema pass: pending (client) | keys:",
      typeof parsed === "object" && parsed ? Object.keys(parsed as object).join(", ") : "n/a"
    );
    return { ok: true, analysis: parsed };
  } catch (parseErr) {
    const message = parseErr instanceof Error ? parseErr.message : "JSON parse error";
    apiLog("AI request failed — JSON parse:", message);
    return {
      ok: false,
      error: "Model zwrócił niepoprawny JSON",
      errorCode: "invalid_model_response",
      fallbackReason: "json_parse_error",
      details: message,
    };
  }
}

export async function handleAnalyzeRequest(userPrompt: string): Promise<AnalyzeApiResult> {
  const result = await callOpenAI(userPrompt);
  if (!result.ok) {
    return mapToApiFailure(result);
  }
  apiLog("analyze success");
  return { ok: true, analysis: result.analysis };
}

export function missingUserPromptFailure(): AnalyzeApiFailure {
  return {
    ok: false,
    useFallback: true,
    error: "Brak userPrompt",
    errorCode: "invalid_model_response",
    fallbackReason: "missing_user_prompt",
  };
}

export function serverExceptionFailure(message: string): AnalyzeApiFailure {
  return {
    ok: false,
    useFallback: true,
    error: message,
    errorCode: "server_unavailable",
    fallbackReason: "server_exception",
    details: message,
  };
}
