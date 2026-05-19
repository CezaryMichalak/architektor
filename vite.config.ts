import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { architektorApiPlugin } from "./server/viteApiPlugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), architektorApiPlugin()],
});
