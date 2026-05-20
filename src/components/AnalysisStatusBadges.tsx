import type { AnalysisMeta } from "../types/architecture";
import {
  ANALYSIS_ERROR_DEV_LABELS,
  ANALYSIS_ERROR_LABELS_PL,
} from "../lib/ai/analysisErrorCodes";

interface AnalysisStatusBadgesProps {
  meta?: AnalysisMeta;
  showAiError?: boolean;
}

function devTechnicalMessage(meta: AnalysisMeta): string | null {
  if (!meta.usedFallback || !meta.aiErrorCode) return null;
  const devLabel = ANALYSIS_ERROR_DEV_LABELS[meta.aiErrorCode];
  const plLabel = ANALYSIS_ERROR_LABELS_PL[meta.aiErrorCode];
  const detail = meta.aiError ? ` — ${meta.aiError}` : "";
  const reason = meta.fallbackReason ? ` [${meta.fallbackReason}]` : "";
  return `${devLabel} (${plLabel})${detail}${reason}`;
}

export function AnalysisStatusBadges({ meta, showAiError }: AnalysisStatusBadgesProps) {
  if (!meta) return null;

  const devMsg = import.meta.env.DEV ? devTechnicalMessage(meta) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {meta.source === "ai" && !meta.usedFallback && (
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Analiza AI
          </span>
        )}
        {meta.usedFallback && (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Fallback regułowy
          </span>
        )}
        {meta.needsClarification && (
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            Wymaga doprecyzowania
          </span>
        )}
        {meta.verifyLegalBasis && (
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
            Zweryfikuj podstawy prawne
          </span>
        )}
      </div>
      {showAiError && meta.usedFallback && (
        <>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nie udało się wykonać analizy AI. Pokazano analizę regułową. Spróbuj ponownie lub
            doprecyzuj dane wejściowe.
          </p>
          {devMsg && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-700">
              {devMsg}
            </p>
          )}
          {import.meta.env.DEV && meta.schemaValidationErrors && meta.schemaValidationErrors.length > 0 && (
            <ul className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-mono text-xs text-red-900">
              {meta.schemaValidationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
