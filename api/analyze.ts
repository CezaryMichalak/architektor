import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AnalyzeApiResult } from "./_lib/analyzeHandler.js";

const CRASH_FALLBACK: AnalyzeApiResult = {
  ok: false,
  useFallback: true,
  error: "Błąd serwera",
  message: "Błąd serwera",
  errorCode: "server_unavailable",
  fallbackReason: "server_exception",
};

function sendJson(res: VercelResponse, status: number, body: AnalyzeApiResult): void {
  res.status(status).json(body);
}

function parseBody(req: VercelRequest): { userPrompt?: string } {
  if (typeof req.body === "string") {
    return JSON.parse(req.body) as { userPrompt?: string };
  }
  return (req.body ?? {}) as { userPrompt?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  console.log("[api/analyze] request received");
  console.log("[api/analyze] method POST");

  try {
    const {
      handleAnalyzeRequest,
      missingUserPromptFailure,
      serverExceptionFailure,
    } = await import("./_lib/analyzeHandler.js");

    const keyPresent = Boolean(
      process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== "your-openai-api-key-here" &&
        process.env.OPENAI_API_KEY.length > 10
    );
    console.log("[api/analyze] OPENAI_API_KEY present:", keyPresent);

    let body: { userPrompt?: string };
    try {
      body = parseBody(req);
      console.log("[api/analyze] request body parsed");
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : "Invalid JSON body";
      console.log("[api/analyze] request body parse failed:", message);
      sendJson(res, 200, serverExceptionFailure(message));
      return;
    }

    if (!body?.userPrompt) {
      console.log("[api/analyze] returning fallback response — missing userPrompt");
      sendJson(res, 200, missingUserPromptFailure());
      return;
    }

    const result = await handleAnalyzeRequest(body.userPrompt);

    if (!result.ok) {
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 200, result);
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : "Błąd serwera";
    console.log("[api/analyze] AI pipeline failed |", name, message);
    console.log("[api/analyze] returning fallback response");

    try {
      const { serverExceptionFailure } = await import("./_lib/analyzeHandler.js");
      sendJson(res, 200, serverExceptionFailure(message));
    } catch {
      sendJson(res, 200, { ...CRASH_FALLBACK, error: message, message, details: message });
    }
  }
}
