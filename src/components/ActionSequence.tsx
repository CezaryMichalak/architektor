import type { ActionStep } from "../types/architecture";

interface ActionSequenceProps {
  actions: ActionStep[];
}

export function ActionSequence({ actions }: ActionSequenceProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Sekwencja działań</h2>
      <ol className="relative space-y-4 border-l-2 border-accent-blue/30 pl-6">
        {actions.map((action) => (
          <li key={action.id} className="relative">
            <span className="absolute -left-[1.65rem] flex h-6 w-6 items-center justify-center rounded-full bg-accent-blue text-xs font-bold text-white">
              {action.order}
            </span>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-graphite">{action.title}</h3>
                {action.badge && (
                  <span className="rounded bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue">
                    {action.badge}
                  </span>
                )}
                {action.timeframe && (
                  <span className="text-xs text-slate-muted">{action.timeframe}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-muted">{action.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
