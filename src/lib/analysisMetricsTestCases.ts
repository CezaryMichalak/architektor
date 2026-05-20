import type { ClarificationAnswer } from "../types/architecture";
import { calculateAnalysisCompleteness } from "./calculateAnalysisCompleteness";
import { calculateProjectProgress } from "./calculateProjectProgress";
import { extractProjectSignals } from "./extractProjectSignals";
import { applyClarificationAnswers, mockAnalysis } from "./mockAnalysis";
import { generateClarifyingQuestions } from "./generateClarifyingQuestions";

export interface MetricsTestExpectation {
  minAdvancement?: number;
  maxAdvancement?: number;
  minCompleteness?: number;
  maxCompleteness?: number;
  minCompletenessAfterAnswers?: number;
  maxAdvancementAfterAnswers?: number;
}

export const ANALYSIS_METRICS_TEST_CASES = [
  {
    id: "M1",
    label: "Koncepcja — advancement niski, completeness rośnie z odpowiedziami",
    prompt: "Dom jednorodzinny na etapie koncepcji, MPZP obowiązuje, brak MDCP.",
    answers: [
      { questionId: "cq-mpzp-excerpt", answer: "Tak — posiadam", skipped: false },
      { questionId: "cq-mdcp-status", answer: "Nie — do zamówienia", skipped: false },
    ] as ClarificationAnswer[],
    expect: {
      minAdvancement: 20,
      maxAdvancement: 35,
      maxCompleteness: 58,
      minCompletenessAfterAnswers: 62,
      maxAdvancementAfterAnswers: 35,
    },
  },
  {
    id: "SF1-M",
    label: "SF1 — kompletność rośnie, zaawansowanie koncepcji niskie",
    prompt:
      "Projekt dotyczy budowy domu jednorodzinnego wolnostojącego z garażem dwustanowiskowym. Działka jest objęta MPZP, inwestor posiada wypis i wyrys z planu, ale nie zamówiono jeszcze mapy do celów projektowych. Nie wykonano badań geotechnicznych.",
    answers: [
      { questionId: "cq-mdcp-status", answer: "Nie — do zamówienia", skipped: false },
      { questionId: "cq-geotechnical", answer: "Nie — do zlecenia", skipped: false },
    ] as ClarificationAnswer[],
    expect: {
      minAdvancement: 20,
      maxAdvancement: 35,
      minCompletenessAfterAnswers: 55,
      maxAdvancementAfterAnswers: 35,
    },
  },
  {
    id: "S7-M",
    label: "S7 hala magazynowa — completeness < 70 wymaga doprecyzowania",
    prompt:
      "hala magazynowo-usługowa z częścią biurowo-socjalną, wysokie składowanie, ruch samochodów ciężarowych",
    answers: [
      { questionId: "cq-storage-height", answer: "Ustalone", skipped: false },
      { questionId: "cq-docks-tir", answer: "Tak", skipped: false },
      { questionId: "cq-fire-load-warehouse", answer: "Częściowo", skipped: false },
    ] as ClarificationAnswer[],
    expect: {
      maxCompleteness: 68,
      minCompletenessAfterAnswers: 70,
      maxAdvancement: 40,
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  prompt: string;
  answers: ClarificationAnswer[];
  expect: MetricsTestExpectation;
}>;

export interface MetricsTestResult {
  id: string;
  label: string;
  passed: boolean;
  errors: string[];
  advancement: number;
  completeness: number;
  advancementAfter: number;
  completenessAfter: number;
}

export function runAnalysisMetricsTests(): MetricsTestResult[] {
  return ANALYSIS_METRICS_TEST_CASES.map((tc) => {
    const signals = extractProjectSignals(tc.prompt);
    const questions = generateClarifyingQuestions(signals, tc.prompt);
    const advancement = calculateProjectProgress(signals);
    const completeness = calculateAnalysisCompleteness(signals, tc.prompt, [], questions);

    const updatedSignals = applyClarificationAnswers(signals, tc.answers);
    const advancementAfter = calculateProjectProgress(updatedSignals);
    const completenessAfter = calculateAnalysisCompleteness(
      updatedSignals,
      tc.prompt,
      tc.answers,
      questions
    );

    const analysis = mockAnalysis(tc.prompt);
    const analysisAfter = mockAnalysis(tc.prompt, undefined, tc.answers, questions);

    const errors: string[] = [];
    const e: MetricsTestExpectation = tc.expect;

    if (e.minAdvancement !== undefined && advancement < e.minAdvancement) {
      errors.push(`advancement ${advancement}% < ${e.minAdvancement}%`);
    }
    if (e.maxAdvancement !== undefined && advancement > e.maxAdvancement) {
      errors.push(`advancement ${advancement}% > ${e.maxAdvancement}%`);
    }
    if (e.minCompleteness !== undefined && completeness < e.minCompleteness) {
      errors.push(`completeness ${completeness}% < ${e.minCompleteness}%`);
    }
    if (e.maxCompleteness !== undefined && completeness > e.maxCompleteness) {
      errors.push(`completeness ${completeness}% > ${e.maxCompleteness}%`);
    }
    if (
      e.minCompletenessAfterAnswers !== undefined &&
      completenessAfter < e.minCompletenessAfterAnswers
    ) {
      errors.push(
        `completeness po odpowiedziach ${completenessAfter}% < ${e.minCompletenessAfterAnswers}%`
      );
    }
    if (
      e.maxAdvancementAfterAnswers !== undefined &&
      advancementAfter > e.maxAdvancementAfterAnswers
    ) {
      errors.push(
        `advancement po odpowiedziach ${advancementAfter}% > ${e.maxAdvancementAfterAnswers}%`
      );
    }

    if (analysis.advancementPercentage !== advancement) {
      errors.push("mockAnalysis advancement niezgodny z calculateProjectProgress");
    }
    if (
      e.maxAdvancementAfterAnswers !== undefined &&
      analysisAfter.advancementPercentage > e.maxAdvancementAfterAnswers
    ) {
      errors.push(
        `mockAnalysis advancement po odpowiedziach ${analysisAfter.advancementPercentage}% za wysoki`
      );
    }
    if (
      analysisAfter.analysisCompletenessPercentage <
      analysis.analysisCompletenessPercentage
    ) {
      errors.push("completeness nie wzrosła po odpowiedziach w mockAnalysis");
    }

    return {
      id: tc.id,
      label: tc.label,
      passed: errors.length === 0,
      errors,
      advancement,
      completeness,
      advancementAfter,
      completenessAfter,
    };
  });
}

export function runAnalysisMetricsTestsInConsole(): void {
  const results = runAnalysisMetricsTests();
  console.group("Architektor — testy metryk (M1, SF1-M, S7-M)");
  let failed = 0;
  for (const r of results) {
    if (!r.passed) failed += 1;
    console.log(
      `\n[${r.id}] ${r.passed ? "OK" : "FAIL"} — ${r.label}\n  advancement: ${r.advancement}% → ${r.advancementAfter}%\n  completeness: ${r.completeness}% → ${r.completenessAfter}%`
    );
    for (const e of r.errors) console.warn(`  • ${e}`);
  }
  console.log(`\nPodsumowanie: ${results.length - failed}/${results.length} zaliczonych`);
  console.groupEnd();
}

declare global {
  interface Window {
    runAnalysisMetricsTests?: typeof runAnalysisMetricsTestsInConsole;
  }
}

if (typeof window !== "undefined") {
  window.runAnalysisMetricsTests = runAnalysisMetricsTestsInConsole;
}
