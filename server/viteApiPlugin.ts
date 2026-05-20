import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  handleAnalyzeRequest,
  missingUserPromptFailure,
  serverExceptionFailure,
  type AnalyzeApiResult,
} from "./analyzeHandler";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
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

function sendJson(res: ServerResponse, status: number, body: AnalyzeApiResult): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function architektorApiPlugin(): Plugin {
  return {
    name: "architektor-api",
    configureServer(server: ViteDevServer) {
      console.log("[architektor-api] Vite API plugin active — POST /api/analyze");

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
          sendJson(res, 500, serverExceptionFailure(message));
        }
      });
    },
  };
}
