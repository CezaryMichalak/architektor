import fs from "node:fs";
import path from "node:path";

/** Load .env.local into process.env (does not overwrite existing vars). */
export function loadEnvLocal(cwd = process.cwd()): void {
  const envPath = path.resolve(cwd, ".env.local");
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
    /* optional */
  }
}

export function isOpenAiKeyConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key !== "your-openai-api-key-here" && key.length > 10);
}
