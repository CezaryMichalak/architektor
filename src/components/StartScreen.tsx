import { SAMPLE_PROMPTS } from "../data/knowledgeBase";

interface StartScreenProps {
  onStart: () => void;
  onSampleSelect: (text: string) => void;
}

export function StartScreen({ onStart, onSampleSelect }: StartScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid-bg rounded-2xl border border-border bg-card p-8 shadow-sm md:p-12">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-blue">Architektor</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy md:text-4xl">
          Asystent procesu projektowego dla architektów
        </h1>
        <p className="mt-2 text-sm text-slate-muted">
          Professional project workflow assistant for architects.
        </p>
        <p className="mt-6 leading-relaxed text-graphite">
          Architektor analizuje opis inwestycji w języku naturalnym, identyfikuje braki formalne i
          dokumentacyjne oraz generuje uporządkowany plan działań projektowych — z uwzględnieniem
          polskich uwarunkowań planistycznych i budowlanych.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-8 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-graphite"
        >
          Rozpocznij analizę projektu
        </button>
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="mb-3 text-sm font-semibold text-navy">Przykładowe opisy</h2>
          <ul className="space-y-2">
            {SAMPLE_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => onSampleSelect(prompt)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-graphite transition hover:border-accent-blue/40 hover:bg-white"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
