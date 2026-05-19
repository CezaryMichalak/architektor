import type { RiskItem } from "../types/architecture";

interface RiskRegisterProps {
  risks: RiskItem[];
}

const levelStyles: Record<RiskItem["level"], string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const levelLabels: Record<RiskItem["level"], string> = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
};

export function RiskRegister({ risks }: RiskRegisterProps) {
  if (risks.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-navy">Rejestr ryzyk</h2>
        <p className="text-sm text-slate-muted">Nie zidentyfikowano istotnych ryzyk przy obecnym poziomie danych.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Rejestr ryzyk</h2>
      <ul className="space-y-3">
        {risks.map((risk) => (
          <li key={risk.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-graphite">{risk.title}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelStyles[risk.level]}`}>
                {levelLabels[risk.level]}
              </span>
              <span className="text-xs text-slate-muted">{risk.category}</span>
            </div>
            <p className="mt-2 text-sm text-slate-muted">{risk.description}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Mitigacja: </span>
              {risk.mitigation}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
