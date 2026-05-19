import type { Plugin, ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { ARCHITEKTOR_SYSTEM_PROMPT } from "../src/lib/ai/architektorSystemPrompt";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* .env.local optional */
  }
}

async function callOpenAI(userPrompt: string): Promise<{ ok: true; analysis: unknown } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    return { ok: false, error: "Brak skonfigurowanego OPENAI_API_KEY w .env.local" };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `OpenAI API: ${res.status} ${errText.slice(0, 200)}` };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "Pusta odpowiedź modelu" };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    return { ok: true, analysis: parsed };
  } catch {
    return { ok: false, error: "Model zwrócił niepoprawny JSON" };
  }
}

function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
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

export function architektorApiPlugin(): Plugin {
  return {
    name: "architektor-api",
    configureServer(server: ViteDevServer) {
      loadEnvLocal();

      server.middlewares.use("/api/analyze", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const body = (await readJsonBody(req)) as { userPrompt?: string };
          if (!body.userPrompt) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Brak userPrompt" }));
            return;
          }

          const result = await callOpenAI(body.userPrompt);
          res.setHeader("Content-Type", "application/json");
          if (!result.ok) {
            res.statusCode = 502;
            res.end(JSON.stringify(result));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, analysis: result.analysis }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : "Błąd serwera",
            })
          );
        }
      });
    },
  };
}
