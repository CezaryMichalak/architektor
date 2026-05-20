import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ARCHITEKTOR_SYSTEM_PROMPT } from "../src/lib/ai/architektorSystemPrompt";
import type { AnalysisErrorCode } from "../src/lib/ai/analysisErrorCodes";
import { mapHttpStatusToErrorCode } from "../src/lib/ai/analysisErrorCodes";
import { isOpenAiKeyConfigured, loadEnvLocal } from "./loadEnv";

const IS_DEV = process.env.NODE_ENV !== "production";

function devLog(...args: unknown[]): void {
  if (IS_DEV) console.log("[architektor-api]", ...args);
}

export interface AnalyzeApiSuccess {
  ok: true;
  analysis: unknown;
}

export interface AnalyzeApiFailure {
  ok: false;
  error: string;
  errorCode: AnalysisErrorCode;
  fallbackReason: string;
  details?: string;
}

type AnalyzeApiResult = AnalyzeApiSuccess | AnalyzeApiFailure;

async function callOpenAI(userPrompt: string): Promise<AnalyzeApiResult> {
  loadEnvLocal();

  const apiKeyPresent = isOpenAiKeyConfigured();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  devLog("API key present:", apiKeyPresent, "| model:", model);

  if (!apiKeyPresent) {
    return {
      ok: false,
      error: "Brak skonfigurowanego OPENAI_API_KEY w .env.local",
      errorCode: "missing_api_key",
      fallbackReason: "missing_api_key",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY!;

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
        // json_object + client-side normalizeAiAnalysisPayload → ProjectAnalysis schema
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ARCHITEKTOR_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd połączenia z OpenAI";
    devLog("fetch error:", message);
    return {
      ok: false,
      error: message,
      errorCode: "network_error",
      fallbackReason: "network_error",
      details: message,
    };
  }

  devLog("OpenAI HTTP status:", res.status);

  if (!res.ok) {
    const errText = await res.text();
    const errorCode = mapHttpStatusToErrorCode(res.status, errText);
    devLog("OpenAI error body (truncated):", errText.slice(0, 300));
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
    devLog("OpenAI payload error:", msg);
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
    return {
      ok: false,
      error: "Pusta odpowiedź modelu",
      errorCode: "invalid_model_response",
      fallbackReason: "empty_model_content",
    };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    devLog("OpenAI JSON parsed OK, keys:", typeof parsed === "object" && parsed ? Object.keys(parsed as object).join(", ") : "n/a");
    return { ok: true, analysis: parsed };
  } catch (parseErr) {
    const message = parseErr instanceof Error ? parseErr.message : "JSON parse error";
    devLog("JSON parse failed:", message, "| content preview:", content.slice(0, 120));
    return {
      ok: false,
      error: "Model zwrócił niepoprawny JSON",
      errorCode: "invalid_model_response",
      fallbackReason: "json_parse_error",
      details: message,
    };
  }
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function architektorApiPlugin(): Plugin {
  return {
    name: "architektor-api",
    configureServer(server: ViteDevServer) {
      loadEnvLocal();
      devLog("Vite API plugin active — POST /api/analyze");

      server.middlewares.use("/api/analyze", async (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const body = (await readJsonBody(req)) as { userPrompt?: string };
          if (!body.userPrompt) {
            sendJson(res, 400, {
              ok: false,
              error: "Brak userPrompt",
              errorCode: "invalid_model_response",
              fallbackReason: "missing_user_prompt",
            });
            return;
          }

          const result = await callOpenAI(body.userPrompt);
          if (!result.ok) {
            devLog("fallbackReason:", result.fallbackReason, "| errorCode:", result.errorCode);
            sendJson(res, 502, result);
            return;
          }

          devLog("analyze success");
          sendJson(res, 200, { ok: true, analysis: result.analysis });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Błąd serwera";
          devLog("server exception:", message);
          sendJson(res, 500, {
            ok: false,
            error: message,
            errorCode: "server_unavailable",
            fallbackReason: "server_exception",
            details: message,
          });
        }
      });
    },
  };
}
