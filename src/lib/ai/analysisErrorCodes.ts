/** Machine-readable codes returned by POST /api/analyze (never include secrets). */
export type AnalysisErrorCode =
  | "missing_api_key"
  | "ai_request_failed"
  | "invalid_json_schema"
  | "invalid_model_response"
  | "server_unavailable"
  | "sdk_error"
  | "model_not_supported"
  | "network_error";

export const ANALYSIS_ERROR_LABELS_PL: Record<AnalysisErrorCode, string> = {
  missing_api_key: "Brak klucza API (OPENAI_API_KEY)",
  ai_request_failed: "Żądanie AI nie powiodło się",
  invalid_json_schema: "Niepoprawny schemat JSON odpowiedzi",
  invalid_model_response: "Model zwrócił niepoprawną odpowiedź",
  server_unavailable: "Serwer analizy niedostępny",
  sdk_error: "Błąd SDK / połączenia",
  model_not_supported: "Model nieobsługiwany",
  network_error: "Błąd sieci — brak połączenia z API",
};

/** Dev-only technical labels shown in the UI when import.meta.env.DEV */
export const ANALYSIS_ERROR_DEV_LABELS: Record<AnalysisErrorCode, string> = {
  missing_api_key: "Missing API key",
  ai_request_failed: "AI request failed",
  invalid_json_schema: "Invalid JSON schema",
  invalid_model_response: "Invalid model response",
  server_unavailable: "Server unavailable",
  sdk_error: "SDK error",
  model_not_supported: "Model not supported",
  network_error: "Network error",
};

export function mapHttpStatusToErrorCode(status: number, openAiBody?: string): AnalysisErrorCode {
  if (status === 401) return "missing_api_key";
  if (status === 404 || status === 503) return "server_unavailable";
  if (status === 400 && openAiBody?.includes("model")) return "model_not_supported";
  return "ai_request_failed";
}
