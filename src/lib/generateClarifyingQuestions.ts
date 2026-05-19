import { ARCHITECTURE_RULES } from "../data/architectureRules";
import type { ClarifyingQuestion, ProjectSignal } from "../types/architecture";

function mergeQuestions(questions: ClarifyingQuestion[]): ClarifyingQuestion[] {
  const byId = new Map<string, ClarifyingQuestion>();
  for (const q of questions) {
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
  return [...byId.values()];
}

export function generateClarifyingQuestions(
  signals: ProjectSignal[],
  maxQuestions = 8
): ClarifyingQuestion[] {
  const seen = new Set<string>();
  const triggered: ClarifyingQuestion[] = [];

  for (const rule of ARCHITECTURE_RULES) {
    if (rule.condition(signals)) {
      for (const q of rule.clarificationTriggers) {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          triggered.push(q);
        }
      }
    }
  }

  const planningUnknown = signals.find((s) => s.key === "planningStatus")?.value === "unknown";
  const hasMpzp = signals.find((s) => s.key === "planningStatus")?.value === "mpzp_exists";
  const noMdcp = signals.find((s) => s.key === "hasMdcp")?.value === false;

  if (hasMpzp && !triggered.find((q) => q.id === "cq-building-scope")) {
    triggered.push({
      id: "cq-building-program",
      question: "Jaki jest planowany metraż i liczba kondygnacji nadziemnych?",
      reason: "Wpływa na zgodność z parametrami MPZP i zakresem dokumentacji.",
      requiredForFinalPlan: false,
      relatedArea: "technical",
    });
  }

  if (planningUnknown && !triggered.find((q) => q.id === "cq-planning-status")) {
    triggered.push({
      id: "cq-planning-status-fallback",
      question: "Czy weryfikowałeś już status planistyczny działki w urzędzie gminy?",
      reason: "Bez tego nie można wybrać właściwej ścieżki formalnej.",
      options: ["Tak — MPZP", "Tak — brak MPZP", "Nie — wymaga sprawdzenia"],
      requiredForFinalPlan: true,
      relatedArea: "planning",
    });
  }

  if (noMdcp && !triggered.find((q) => q.id === "cq-road-access")) {
    triggered.push({
      id: "cq-plot-boundaries",
      question: "Czy granice działki są oznaczone i dostępne do pomiaru geodezyjnego?",
      reason: "Warunek rozpoczęcia prac nad MDCP.",
      options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
      requiredForFinalPlan: false,
      relatedArea: "documentation",
    });
  }

  const required = mergeQuestions(triggered).filter((q) => q.requiredForFinalPlan);
  const optional = mergeQuestions(triggered).filter((q) => !q.requiredForFinalPlan);
  const merged = [...required, ...optional];

  const min = 3;
  const count = Math.max(min, Math.min(maxQuestions, merged.length));
  return merged.slice(0, count);
}

export function needsClarification(
  signals: ProjectSignal[],
  promptLength: number
): boolean {
  const questions = generateClarifyingQuestions(signals);
  const requiredCount = questions.filter((q) => q.requiredForFinalPlan).length;
  const lowConfidence =
    signals.filter((s) => s.confidence === "low").length >= 2 ||
    signals.find((s) => s.key === "planningStatus")?.value === "unknown";

  if (requiredCount >= 2) return true;
  if (lowConfidence && questions.length >= 3) return true;
  if (promptLength < 40 && questions.length >= 4) return true;

  const hasMpzpNoExcerpt =
    signals.find((s) => s.key === "planningStatus")?.value === "mpzp_exists" &&
    signals.find((s) => s.key === "hasMpzpExcerpt")?.value === false;

  if (hasMpzpNoExcerpt && questions.length >= 3) return true;

  return false;
}
