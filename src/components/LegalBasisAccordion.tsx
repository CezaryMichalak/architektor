import { useState } from "react";
import type { LegalBasis } from "../types/architecture";

interface LegalBasisAccordionProps {
  items: LegalBasis[];
}

export function LegalBasisAccordion({ items }: LegalBasisAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-navy">Podstawy prawne i planistyczne</h2>
        <p className="text-sm text-slate-muted">Brak dopasowanych odniesień — uzupełnij dane projektu.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-navy">Podstawy prawne i planistyczne</h2>
      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-graphite hover:bg-surface"
              >
                {item.title}
                <span className="text-accent-blue">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-border bg-surface px-4 py-3 text-sm text-slate-muted">
                  <p>{item.description}</p>
                  {item.sourceRef && (
                    <p className="mt-2 text-xs text-slate-muted">Źródło: {item.sourceRef}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
