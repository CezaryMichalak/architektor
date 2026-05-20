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

export function mapHttpStatusToErrorCode(status: number, openAiBody?: string): AnalysisErrorCode {
  if (status === 401) return "missing_api_key";
  if (status === 404 || status === 503) return "server_unavailable";
  if (status === 400 && openAiBody?.includes("model")) return "model_not_supported";
  return "ai_request_failed";
}
