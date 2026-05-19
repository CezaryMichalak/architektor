import type { RequiredDocument } from "../types/architecture";

interface MissingDocumentsCardProps {
  documents: RequiredDocument[];
}

const statusLabels: Record<RequiredDocument["status"], string> = {
  missing: "Brak",
  partial: "Częściowy",
  available: "Dostępny",
  uncertain: "Do ustalenia",
};

const priorityColors: Record<RequiredDocument["priority"], string> = {
  critical: "border-red-200 bg-red-50",
  high: "border-amber-200 bg-amber-50",
  medium: "border-border bg-surface",
};

export function MissingDocumentsCard({ documents }: MissingDocumentsCardProps) {
  if (documents.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-navy">Dokumenty i opracowania</h2>
        <p className="text-sm text-slate-muted">Na podstawie dostępnych danych nie zidentyfikowano krytycznych braków dokumentacyjnych.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Brakujące / wymagane dokumenty</h2>
      <ul className="space-y-3">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className={`rounded-lg border p-4 ${priorityColors[doc.priority]}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {doc.abbreviation && (
                <span className="rounded bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                  {doc.abbreviation}
                </span>
              )}
              <span className="font-medium text-graphite">{doc.name}</span>
              <span className="text-xs text-slate-muted">{statusLabels[doc.status]}</span>
            </div>
            <p className="mt-2 text-sm text-slate-muted">{doc.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
