import { extractProjectSignals, signalsToDetectedLabels } from "./extractProjectSignals";
import { classifyProjectType } from "./classifyProjectType";
import { mockAnalysis } from "./mockAnalysis";
import type { ProjectTypeKey } from "../types/projectType";

export interface SignalExtractionExpectation {
  hasMPZP?: boolean;
  planningStatus?: string;
  hasMDCP?: boolean;
  projectType?: ProjectTypeKey;
  detectedMustInclude?: string[];
  detectedMustNotInclude?: string[];
  minAdvancement?: number;
  maxAdvancement?: number;
  minCompleteness?: number;
  maxCompleteness?: number;
  confidenceLevel?: "low" | "medium" | "high";
}

export const SIGNAL_EXTRACTION_TEST_CASES = [
  {
    id: "S1",
    label: "MPZP + brak MDCP",
    prompt: "Dom jednorodzinny, MPZP obowiązuje, brak MDCP.",
    expect: {
      hasMPZP: true,
      planningStatus: "mpzp_exists",
      hasMDCP: false,
      projectType: "single_family",
      detectedMustInclude: ["Obowiązuje MPZP", "Brak MDCP"],
      detectedMustNotInclude: ["Status planistyczny do weryfikacji", "MDCP dostępna"],
    },
  },
  {
    id: "S2",
    label: "MPZP + nie zamówiono MDCP",
    prompt:
      "Hala magazynowo-usługowa, działka objęta MPZP, nie została jeszcze zamówiona mapa do celów projektowych.",
    expect: {
      hasMPZP: true,
      planningStatus: "mpzp_exists",
      hasMDCP: false,
      projectType: "warehouse_service_hall",
      detectedMustInclude: ["Obowiązuje MPZP", "Brak MDCP", "Hala magazynowo-usługowa"],
      detectedMustNotInclude: ["MDCP dostępna", "Status planistyczny do weryfikacji"],
      minAdvancement: 20,
      maxAdvancement: 40,
      maxCompleteness: 65,
      confidenceLevel: "medium",
    },
  },
  {
    id: "S3",
    label: "Hala wysokiego składowania TIR",
    prompt:
      "Hala magazynowa z regałami wysokiego składowania, plac manewrowy dla TIR, MPZP dostępny.",
    expect: {
      hasMPZP: true,
      projectType: "warehouse",
      detectedMustInclude: ["Obowiązuje MPZP", "Hala magazynowa"],
    },
  },
  {
    id: "S4",
    label: "Brak MPZP",
    prompt: "Budynek usługowy, brak MPZP w gminie.",
    expect: {
      hasMPZP: false,
      planningStatus: "no_mpzp",
      projectType: "service",
      detectedMustInclude: ["Brak MPZP"],
      detectedMustNotInclude: ["Obowiązuje MPZP"],
    },
  },
  {
    id: "S5",
    label: "Rozbudowa budynku usługowego",
    prompt: "Rozbudowa istniejącego budynku usługowego.",
    expect: {
      projectType: "extension_reconstruction",
    },
  },
  {
    id: "S6",
    label: "Fabryka bez briefu technologicznego",
    prompt: "Fabryka z linią produkcyjną, brak szczegółowych wytycznych technologicznych.",
    expect: {
      projectType: "factory_industrial",
    },
  },
  {
    id: "SF1",
    label: "Dom jednorodzinny wolnostojący — pełny opis",
    prompt:
      "Projekt dotyczy budowy domu jednorodzinnego wolnostojącego z garażem dwustanowiskowym. Działka jest objęta MPZP, inwestor posiada wypis i wyrys z planu, ale nie zamówiono jeszcze mapy do celów projektowych. Nie wykonano badań geotechnicznych.",
    expect: {
      hasMPZP: true,
      planningStatus: "mpzp_exists",
      hasMDCP: false,
      projectType: "single_family",
      detectedMustInclude: [
        "Dom jednorodzinny",
        "Obowiązuje MPZP",
        "Wypis i wyrys dostępny",
        "Brak MDCP",
        "Brak rozpoznania geotechnicznego",
      ],
      detectedMustNotInclude: ["Status planistyczny do weryfikacji", "MDCP dostępna", "unknown"],
    },
  },
  {
    id: "S7",
    label: "Hala magazynowo-usługowa z biurowo-socjalną — nie biuro",
    prompt:
      "hala magazynowo-usługowa z częścią biurowo-socjalną, wysokie składowanie, ruch samochodów ciężarowych",
    expect: {
      projectType: "warehouse_service_hall",
      detectedMustInclude: ["Hala magazynowo-usługowa"],
      detectedMustNotInclude: ["Budynek biurowy", "Typ: biurowy"],
      maxCompleteness: 68,
      maxAdvancement: 40,
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  prompt: string;
  expect: SignalExtractionExpectation;
}>;

export interface SignalExtractionTestResult {
  id: string;
  label: string;
  passed: boolean;
  errors: string[];
  signals: ReturnType<typeof extractProjectSignals>;
  detected: string[];
  projectType: ProjectTypeKey;
}

function signalBool(signals: ReturnType<typeof extractProjectSignals>, key: string): boolean | undefined {
  const v = signals.find((s) => s.key === key)?.value;
  if (v === true) return true;
  if (v === false) return false;
  return undefined;
}

function assertSignalCase(
  id: string,
  label: string,
  prompt: string,
  expect: SignalExtractionExpectation
): SignalExtractionTestResult {
  const signals = extractProjectSignals(prompt);
  const detected = signalsToDetectedLabels(signals);
  const classification = classifyProjectType(signals, prompt);
  const analysis = mockAnalysis(prompt);
  const errors: string[] = [];

  if (expect.hasMPZP === true && signals.find((s) => s.key === "planningStatus")?.value !== "mpzp_exists") {
    errors.push(`Oczekiwano MPZP (mpzp_exists), jest: ${String(signals.find((s) => s.key === "planningStatus")?.value)}`);
  }
  if (expect.planningStatus && signals.find((s) => s.key === "planningStatus")?.value !== expect.planningStatus) {
    errors.push(
      `planningStatus: oczekiwano ${expect.planningStatus}, jest ${String(signals.find((s) => s.key === "planningStatus")?.value)}`
    );
  }
  if (expect.hasMDCP === false && signalBool(signals, "hasMdcp") !== false) {
    errors.push(`hasMdcp powinno być false, jest: ${String(signalBool(signals, "hasMdcp"))}`);
  }
  if (expect.hasMDCP === true && signalBool(signals, "hasMdcp") !== true) {
    errors.push("hasMdcp powinno być true");
  }
  if (expect.projectType && classification.projectType !== expect.projectType) {
    errors.push(`Typ: oczekiwano ${expect.projectType}, jest ${classification.projectType}`);
  }
  for (const frag of expect.detectedMustInclude ?? []) {
    if (!detected.some((d) => d.includes(frag))) errors.push(`Brak w detected: ${frag}`);
  }
  for (const frag of expect.detectedMustNotInclude ?? []) {
    if (detected.some((d) => d.includes(frag))) errors.push(`Nie powinno być w detected: ${frag}`);
  }
  if (expect.minAdvancement !== undefined && analysis.advancementPercentage < expect.minAdvancement) {
    errors.push(`Za niski postęp: ${analysis.advancementPercentage}%`);
  }
  if (expect.maxAdvancement !== undefined && analysis.advancementPercentage > expect.maxAdvancement) {
    errors.push(`Za wysoki postęp: ${analysis.advancementPercentage}%`);
  }
  if (expect.confidenceLevel && analysis.confidenceLevel !== expect.confidenceLevel) {
    errors.push(`confidence: oczekiwano ${expect.confidenceLevel}, jest ${analysis.confidenceLevel}`);
  }
  if (
    expect.minCompleteness !== undefined &&
    analysis.analysisCompletenessPercentage < expect.minCompleteness
  ) {
    errors.push(
      `Za niska kompletność: ${analysis.analysisCompletenessPercentage}%`
    );
  }
  if (
    expect.maxCompleteness !== undefined &&
    analysis.analysisCompletenessPercentage > expect.maxCompleteness
  ) {
    errors.push(
      `Za wysoka kompletność: ${analysis.analysisCompletenessPercentage}%`
    );
  }

  return {
    id,
    label,
    passed: errors.length === 0,
    errors,
    signals,
    detected,
    projectType: classification.projectType,
  };
}

export function runSignalExtractionTests(): SignalExtractionTestResult[] {
  return SIGNAL_EXTRACTION_TEST_CASES.map((tc) =>
    assertSignalCase(tc.id, tc.label, tc.prompt, tc.expect)
  );
}

export function runSignalExtractionTestsInConsole(): void {
  const results = runSignalExtractionTests();
  console.group("Architektor — testy ekstrakcji sygnałów (S1–SF1, S7)");
  let failed = 0;
  for (const r of results) {
    const status = r.passed ? "OK" : "FAIL";
    if (!r.passed) failed += 1;
    console.log(
      `\n[${r.id}] ${status} — ${r.label}\n  typ: ${r.projectType}\n  detected: ${r.detected.join(" | ")}`
    );
    for (const e of r.errors) console.warn(`  • ${e}`);
  }
  console.log(`\nPodsumowanie: ${results.length - failed}/${results.length} zaliczonych`);
  console.groupEnd();
}

if (typeof window !== "undefined") {
  const w = window as unknown as {
    runSignalExtractionTests?: typeof runSignalExtractionTestsInConsole;
  };
  w.runSignalExtractionTests = runSignalExtractionTestsInConsole;
}
