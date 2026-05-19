import type { ConfidenceLevel } from "../types/architecture";

interface ProjectStatusCardProps {
  projectType: string;
  projectStage: string;
  advancementPercentage: number;
  confidenceLevel: ConfidenceLevel;
}

const confidenceLabels: Record<ConfidenceLevel, string> = {
  low: "Niska pewność analizy",
  medium: "Średnia pewność analizy",
  high: "Wysoka pewność analizy",
};

const confidenceColors: Record<ConfidenceLevel, string> = {
  low: "bg-amber-100 text-amber-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-emerald-100 text-emerald-800",
};

export function ProjectStatusCard({
  projectType,
  projectStage,
  advancementPercentage,
  confidenceLevel,
}: ProjectStatusCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Status projektu</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-muted">Typ inwestycji</dt>
          <dd className="mt-1 text-base font-medium">{projectType}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-muted">Etap procesu</dt>
          <dd className="mt-1 text-base font-medium">{projectStage}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-muted">Zaawansowanie procesu</span>
          <span className="font-semibold text-accent-blue">{advancementPercentage}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent-blue transition-all duration-500"
            style={{ width: `${advancementPercentage}%` }}
          />
        </div>
      </div>
      <div className="mt-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${confidenceColors[confidenceLevel]}`}
        >
          {confidenceLabels[confidenceLevel]}
        </span>
      </div>
    </section>
  );
}
