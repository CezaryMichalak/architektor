import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { architektorApiPlugin } from "./server/viteApiPlugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), architektorApiPlugin()],
  // Analiza AI: POST /api/analyze obsługiwane przez architektorApiPlugin (klucz tylko na serwerze Node).
  // Osobny backend na :3005 — wyłącz plugin i odkomentuj:
  // server: { proxy: { "/api": "http://localhost:3005" } },
});
