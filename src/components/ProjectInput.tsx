import { useState } from "react";
import type { StructuredProjectFields } from "../types/architecture";

interface ProjectInputProps {
  initialPrompt?: string;
  onSubmit: (prompt: string, structured: StructuredProjectFields) => void;
  onBack: () => void;
}

const INVESTMENT_TYPES = [
  "Budynek mieszkalny jednorodzinny",
  "Budynek mieszkalny wielorodzinny",
  "Budynek usługowy",
  "Obiekt użyteczności publicznej",
  "Inna inwestycja budowlana",
];

const PROJECT_STAGES = ["Koncepcja", "Etap wstępny", "Dokumentacja na PnB", "Realizacja"];

const PLANNING_OPTIONS = [
  "MPZP obowiązuje",
  "Brak MPZP",
  "Nieznany / do weryfikacji",
  "Ścieżka WZ",
];

const BUILDING_TYPES = [
  { value: "new", label: "Nowa zabudowa" },
  { value: "existing", label: "Istniejący budynek / rozbudowa" },
  { value: "mixed", label: "Mieszane" },
  { value: "unknown", label: "Nie określono" },
] as const;

const BUILDING_CATEGORIES = [
  "Dom jednorodzinny",
  "Budynek wielorodzinny",
  "Budynek usługowy",
  "Użyteczność publiczna",
  "Inny",
];

const DOC_OPTIONS = ["Wypis i wyrys MPZP", "MDCP", "PZT", "PAB", "Decyzja WZ", "Pozwolenie na budowę"];

const CONSTRAINT_OPTIONS = [
  "Obszar konserwatorski / zabytek",
  "Natura 2000 / ochrona środowiska",
  "Strefa zagrożenia powodziowego",
  "Inne ograniczenia",
];

export function ProjectInput({ initialPrompt = "", onSubmit, onBack }: ProjectInputProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [showStructured, setShowStructured] = useState(false);
  const [structured, setStructured] = useState<StructuredProjectFields>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !structured.investmentType) return;
    onSubmit(prompt.trim(), structured);
  };

  const toggleDoc = (doc: string) => {
    const current = structured.documentationAvailable ?? [];
    const next = current.includes(doc) ? current.filter((d) => d !== doc) : [...current, doc];
    setStructured({ ...structured, documentationAvailable: next });
  };

  const toggleConstraint = (c: string) => {
    const current = structured.specialConstraints ?? [];
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    setStructured({ ...structured, specialConstraints: next });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Opis projektu</h1>
        <button type="button" onClick={onBack} className="text-sm text-accent-blue hover:underline">
          ← Powrót
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <label htmlFor="prompt" className="mb-2 block text-sm font-medium text-graphite">
          Opis inwestycji (język naturalny)
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          placeholder="Opisz rodzaj inwestycji, status planistyczny, posiadaną dokumentację i ograniczenia..."
          className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowStructured(!showStructured)}
        className="text-sm font-medium text-accent-blue hover:underline"
      >
        {showStructured ? "Ukryj pola strukturalne" : "Pokaż pola strukturalne (opcjonalnie)"}
      </button>

      {showStructured && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm md:grid-cols-2">
          <Field label="Rodzaj inwestycji">
            <select
              value={structured.investmentType ?? ""}
              onChange={(e) => setStructured({ ...structured, investmentType: e.target.value })}
              className="field-input"
            >
              <option value="">— wybierz —</option>
              {INVESTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Etap projektu">
            <select
              value={structured.projectStage ?? ""}
              onChange={(e) => setStructured({ ...structured, projectStage: e.target.value })}
              className="field-input"
            >
              <option value="">— wybierz —</option>
              {PROJECT_STAGES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Status planistyczny">
            <select
              value={structured.planningStatus ?? ""}
              onChange={(e) => setStructured({ ...structured, planningStatus: e.target.value })}
              className="field-input"
            >
              <option value="">— wybierz —</option>
              {PLANNING_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Kategoria obiektu">
            <select
              value={structured.buildingCategory ?? ""}
              onChange={(e) => setStructured({ ...structured, buildingCategory: e.target.value })}
              className="field-input"
            >
              <option value="">— wybierz —</option>
              {BUILDING_CATEGORIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Istniejący / nowy">
            <select
              value={structured.buildingType ?? ""}
              onChange={(e) =>
                setStructured({
                  ...structured,
                  buildingType: e.target.value as StructuredProjectFields["buildingType"],
                })
              }
              className="field-input"
            >
              <option value="">— wybierz —</option>
              {BUILDING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Kontekst lokalizacji">
            <input
              type="text"
              value={structured.locationContext ?? ""}
              onChange={(e) => setStructured({ ...structured, locationContext: e.target.value })}
              className="field-input"
              placeholder="np. centrum miasta, strefa mieszkaniowa"
            />
          </Field>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-graphite">Posiadana dokumentacja</p>
            <div className="flex flex-wrap gap-2">
              {DOC_OPTIONS.map((doc) => (
                <label key={doc} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(structured.documentationAvailable ?? []).includes(doc)}
                    onChange={() => toggleDoc(doc)}
                  />
                  {doc}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-graphite">Ograniczenia szczególne</p>
            <div className="flex flex-wrap gap-2">
              {CONSTRAINT_OPTIONS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(structured.specialConstraints ?? []).includes(c)}
                    onChange={() => toggleConstraint(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-graphite"
      >
        Przeprowadź analizę wstępną
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-graphite">{label}</span>
      {children}
    </label>
  );
}
