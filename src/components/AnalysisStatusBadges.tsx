import type { AnalysisMeta } from "../types/architecture";

interface AnalysisStatusBadgesProps {
  meta?: AnalysisMeta;
  showAiError?: boolean;
}

export function AnalysisStatusBadges({ meta, showAiError }: AnalysisStatusBadgesProps) {
  if (!meta) return null;

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
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nie udało się wykonać analizy AI. Pokazano analizę regułową. Spróbuj ponownie lub
          doprecyzuj dane wejściowe.
        </p>
      )}
    </div>
  );
}
