/** Re-export for Vite dev; Vercel uses api/_lib/analyzeHandler.ts */
export {
  handleAnalyzeRequest,
  missingUserPromptFailure,
  serverExceptionFailure,
  type AnalyzeApiResult,
  type AnalyzeApiSuccess,
  type AnalyzeApiFailure,
} from "../api/_lib/analyzeHandler.js";
