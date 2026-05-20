import { runHybridFinalAnalysis, runPreliminaryAnalysis } from "../hybridAnalysis";
import { runClarificationTestsInConsole } from "./clarificationTestCases";

export const ANALYSIS_TEST_CASES = [
  {
    id: "mpzp-no-mdcp",
    label: "MPZP obowiązuje, brak MDCP",
    prompt:
      "Dom jednorodzinny, jest MPZP, nie mam jeszcze wypisu i wyrysu, brak mapy do celów projektowych.",
  },
  {
    id: "no-mpzp",
    label: "Brak MPZP",
    prompt: "Nowy budynek usługowy, brak MPZP w gminie, działka rolna.",
  },
  {
    id: "unknown-planning",
    label: "Nieznany status planistyczny",
    prompt: "Rozbudowa budynku — status planistyczny nieznany, wymaga weryfikacji w urzędzie.",
  },
  {
    id: "extension-existing",
    label: "Rozbudowa istniejącego budynku",
    prompt: "Rozbudowa istniejącego budynku mieszkalnego o część usługową, MPZP obowiązuje.",
  },
  {
    id: "service-building",
    label: "Budynek usługowy",
    prompt: "Budynek usługowy w centrum miasta, MPZP, wypis i wyrys posiadane, brak PZT.",
  },
  {
    id: "conservation-env",
    label: "Ochrona konserwatorska i środowiskowa",
    prompt:
      "Budynek wielorodzinny w obszarze konserwatorskim i strefie Natura 2000, MPZP, mam MDCP.",
  },
] as const;

/** Run rule-based preliminary checks in console (dev). */
export function runAnalysisTestCasesInConsole(): void {
  console.group("Architektor — przypadki testowe (wstępna analiza regułowa)");
  for (const tc of ANALYSIS_TEST_CASES) {
    const pre = runPreliminaryAnalysis(tc.prompt);
    console.log(`\n[${tc.id}] ${tc.label}`);
    console.log("  Wykryte:", pre.detectedInputs);
    console.log("  Niepewne:", pre.uncertainInputs);
    console.log("  Braki krytyczne:", pre.missingCriticalInputs);
    console.log("  Można plan końcowy:", pre.canGenerateFinalPlan);
  }
  console.groupEnd();
}

export async function runHybridTestCase(id: string): Promise<void> {
  const tc = ANALYSIS_TEST_CASES.find((c) => c.id === id);
  if (!tc) {
    console.error("Nieznany przypadek:", id);
    return;
  }
  const result = await runHybridFinalAnalysis(tc.prompt);
  console.log(`[${tc.id}] source=${result.meta.source} fallback=${result.meta.usedFallback}`);
  console.log(result.analysis.projectType, result.analysis.confidenceLevel);
}

if (typeof window !== "undefined") {
  const w = window as unknown as {
    architektorTests?: typeof runAnalysisTestCasesInConsole;
    runClarificationTests?: typeof runClarificationTestsInConsole;
  };
  w.architektorTests = runAnalysisTestCasesInConsole;
  w.runClarificationTests = runClarificationTestsInConsole;
}
