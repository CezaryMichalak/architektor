import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleAnalyzeRequest,
  missingUserPromptFailure,
  serverExceptionFailure,
  type AnalyzeApiResult,
} from "../server/analyzeHandler";

function sendJson(res: VercelResponse, status: number, body: AnalyzeApiResult): void {
  res.status(status).json(body);
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

  console.log("[architektor-api] Vercel /api/analyze request received");
  console.log(
    "[architektor-api] API key present:",
    Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10)
  );

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
      userPrompt?: string;
    };

    if (!body?.userPrompt) {
      sendJson(res, 400, missingUserPromptFailure());
      return;
    }

    const result = await handleAnalyzeRequest(body.userPrompt);

    if (!result.ok) {
      const status =
        result.fallbackReason === "missing_openai_api_key" ? 200 : 502;
      sendJson(res, status, result);
      return;
    }

    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd serwera";
    console.log("[architektor-api] server exception:", message);
    sendJson(res, 500, serverExceptionFailure(message));
  }
}
