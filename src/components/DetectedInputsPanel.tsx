interface DetectedInputsPanelProps {
  detected: string[];
  uncertain: string[];
}

export function DetectedInputsPanel({ detected, uncertain }: DetectedInputsPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Wykryte dane wejściowe</h2>
      {detected.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {detected.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-muted">Brak jednoznacznie wykrytych danych — uzupełnij opis lub pola strukturalne.</p>
      )}
      {uncertain.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-medium text-slate-muted">Wymagające potwierdzenia</h3>
          <ul className="space-y-2">
            {uncertain.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium">?</span>
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
