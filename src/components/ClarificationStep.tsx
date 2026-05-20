import { useState } from "react";
import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ProjectSignal,
} from "../types/architecture";
import { signalsToDetectedLabels } from "../lib/extractProjectSignals";
import { InfoTooltip } from "./InfoTooltip";

interface ClarificationStepProps {
  questions: ClarifyingQuestion[];
  signals: ProjectSignal[];
  detectedLabels: string[];
  onSubmit: (answers: ClarificationAnswer[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

const areaLabels: Record<ClarifyingQuestion["relatedArea"], string> = {
  planning: "Planowanie",
  documentation: "Dokumentacja",
  formal_path: "Ścieżka formalna",
  specialists: "Specjaliści",
  existing_building: "Istniejący obiekt",
  technical: "Techniczne",
  constraints: "Ograniczenia",
};

const priorityLabels: Record<ClarifyingQuestion["priority"], string> = {
  critical: "Krytyczne",
  important: "Ważne",
  optional: "Opcjonalne",
};

const priorityBadgeClass: Record<ClarifyingQuestion["priority"], string> = {
  critical: "bg-red-100 text-red-800 ring-1 ring-red-200",
  important: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  optional: "bg-surface text-slate-muted ring-1 ring-border",
};

const areaTooltipFallbacks: Record<ClarifyingQuestion["relatedArea"], string> = {
  planning:
    "Informacja wpływa na ustalenie ścieżki planistycznej, w tym MPZP/WZ oraz zakres analizy uwarunkowań.",
  documentation:
    "Informacja pozwala określić kompletność dokumentów wejściowych wymaganych do dalszych prac projektowych.",
  formal_path:
    "Informacja może determinować ścieżkę formalną, w tym PnB, zgłoszenie albo konieczność dodatkowych uzgodnień.",
  specialists:
    "Informacja pomaga ustalić, których projektantów branżowych lub rzeczoznawców należy zaangażować na danym etapie.",
  existing_building:
    "Informacja jest istotna dla oceny zakresu inwentaryzacji, weryfikacji konstrukcji oraz ryzyk technicznych obiektu istniejącego.",
  technical:
    "Informacja wpływa na zakres koordynacji technicznej, warunki przyłączenia, obsługę komunikacyjną lub rozwiązania instalacyjne.",
  constraints:
    "Informacja pozwala zidentyfikować ograniczenia formalne, środowiskowe, konserwatorskie lub techniczne wpływające na projekt.",
};

function getQuestionTooltipContent(question: ClarifyingQuestion): string {
  const reason = question.reason?.trim();
  if (reason) return reason;
  return areaTooltipFallbacks[question.relatedArea];
}

export function ClarificationStep({
  questions,
  signals,
  detectedLabels,
  onSubmit,
  onSkip,
  onBack,
}: ClarificationStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const detected = detectedLabels.length > 0 ? detectedLabels : signalsToDetectedLabels(signals);
  const missingHints = [
    !signals.find((s) => s.key === "hasMpzpExcerpt" && s.value === true) &&
      signals.find((s) => s.key === "planningStatus")?.value === "mpzp_exists" &&
      "Wypis i wyrys z MPZP",
    !signals.find((s) => s.key === "hasMdcp" && s.value === true) && "MDCP",
    signals.find((s) => s.key === "planningStatus")?.value === "unknown" && "Status planistyczny",
  ].filter(Boolean) as string[];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: ClarificationAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
      skipped: !answers[q.id],
    }));
    onSubmit(result);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Doprecyzowanie danych</h1>
        <button type="button" onClick={onBack} className="text-sm text-accent-blue hover:underline">
          ← Powrót
        </button>
      </div>

      <p className="text-sm text-slate-muted">
        Analiza wstępna wykazała luki informacyjne. Odpowiedzi pozwolą wygenerować precyzyjniejszy plan
        procesu projektowego.
      </p>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-accent-green">Wykryte</h2>
          <ul className="space-y-1 text-sm">
            {detected.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">Brakuje / niepewne</h2>
          <ul className="space-y-1 text-sm text-amber-900">
            {missingHints.length > 0 ? (
              missingHints.map((m) => <li key={m}>• {m}</li>)
            ) : (
              <li>• Szczegóły techniczne i formalne</li>
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        {questions.map((q, index) => (
          <fieldset
            key={q.id}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <legend className="sr-only">{q.question}</legend>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <span className="shrink-0 rounded bg-navy px-2 py-0.5 text-xs font-medium text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 text-sm font-medium text-graphite">{q.question}</span>
              </div>
              <InfoTooltip content={getQuestionTooltipContent(q)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass[q.priority]}`}
              >
                {priorityLabels[q.priority]}
              </span>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-muted">
                {areaLabels[q.relatedArea]}
              </span>
              {q.priority === "critical" && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  wymagane do planu
                </span>
              )}
              {q.priority === "important" && q.requiredForFinalPlan && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  zalecane
                </span>
              )}
            </div>
            {q.options ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                      answers[q.id] === opt
                        ? "border-accent-blue bg-accent-blue/10"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                      className="sr-only"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                rows={2}
                className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Twoja odpowiedź..."
              />
            )}
          </fieldset>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-graphite"
        >
          Generuj plan końcowy
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-graphite hover:bg-surface"
        >
          Pomiń — dane wystarczające
        </button>
      </div>
    </form>
  );
}
