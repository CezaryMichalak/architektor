import type { SpecialistRecommendation } from "../types/architecture";

interface ConsultantTimelineProps {
  specialists: SpecialistRecommendation[];
}

const priorityLabels: Record<SpecialistRecommendation["priority"], string> = {
  essential: "Niezbędny",
  recommended: "Zalecany",
  conditional: "Warunkowy",
};

export function ConsultantTimeline({ specialists }: ConsultantTimelineProps) {
  if (specialists.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-navy">Harmonogram konsultantów</h2>
      <p className="mb-4 text-sm text-slate-muted">
        Wyłącznie specjaliści istotni dla tej inwestycji — z uzasadnieniem zakresu i terminu.
      </p>
      <div className="space-y-4">
        {specialists.map((spec, index) => (
          <article
            key={spec.id}
            className="grid gap-3 border-l-4 border-accent-green/50 pl-4 sm:grid-cols-[auto_1fr]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-graphite">{spec.discipline}</h3>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-muted">
                  {priorityLabels[spec.priority]}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-accent-blue">{spec.role}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-muted">Kiedy</dt>
                  <dd>{spec.whenNeeded}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-muted">Wejście</dt>
                  <dd>{spec.inputRequired}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-muted">Wynik</dt>
                  <dd>{spec.outputDeliverable}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-muted">Uzasadnienie</dt>
                  <dd className="text-slate-muted">{spec.reason}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
