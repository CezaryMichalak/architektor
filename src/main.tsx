import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./lib/ai/clarificationTestCases.ts";
import "./lib/ai/professionalDepthTestCases.ts";
import "./lib/signalExtractionTestCases.ts";
import "./lib/consistencyEnrichmentTestCases.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
