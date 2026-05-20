import { applyPostAiPasses } from "./ai/applyPostAiPasses";
import { extractProjectSignals } from "./extractProjectSignals";
import { mockAnalysis } from "./mockAnalysis";
import { classifyProjectType } from "./classifyProjectType";
import type { ProjectAnalysis } from "../types/architecture";

export const WAREHOUSE_HALL_FULL_PROMPT =
  "Hala magazynowo-usługowa na działce objętej MPZP. Inwestor nie przekazał pełnych wytycznych technologiczno-logistycznych. Nie mam wypisu i wyrysu. Nie została jeszcze zamówiona mapa do celów projektowych. Regały wysokiego składowania, plac manewrowy dla samochodów ciężarowych TIR.";

/** Simulates contradictory AI output before post-passes. */
function contradictoryWarehouseAiStub(signals: ReturnType<typeof extractProjectSignals>): ProjectAnalysis {
  const base = mockAnalysis(WAREHOUSE_HALL_FULL_PROMPT);
  return {
    ...base,
    confidenceLevel: "high",
    detectedInputs: [
      "Posiadam kompletny brief inwestora",
      "Posiadam ustalenia planistyczne",
      "Obowiązuje MPZP",
    ],
    missingDocuments: base.missingDocuments.filter((d) => d.id !== "investor_brief"),
    specialists: [
      ...base.specialists,
      {
        id: "geo-alt",
        discipline: "Geotechnika",
        role: "Badania gruntu",
        whenNeeded: "Przed fundamentami",
        inputRequired: "MDCP",
        outputDeliverable: "Opinia",
        priority: "essential",
        reason: "Duplikat geotechniki.",
      },
    ],
    projectSubtype: String(signals.find((s) => s.key === "projectSubtype")?.value ?? "warehouse_service_hall"),
  };
}

export interface ConsistencyEnrichmentExpectation {
  projectTypeLabel?: string;
  projectSubtype?: string;
  confidenceLevel?: "low" | "medium" | "high";
  detectedMustNotInclude?: readonly string[];
  detectedMustInclude?: readonly string[];
  minActions?: number;
  maxActions?: number;
  mustIncludeSpecialistIds?: readonly string[];
  mustIncludeDocIds?: readonly string[];
  investorBriefStage?: string;
}

export const CONSISTENCY_ENRICHMENT_TEST_CASES = [
  {
    id: "CE1",
    label: "Hala magazynowo-usługowa — pełny prompt (mock + passes)",
    prompt: WAREHOUSE_HALL_FULL_PROMPT,
    useContradictoryStub: false,
    expect: {
      projectTypeLabel: "Hala magazynowo-usługowa",
      projectSubtype: "warehouse_service_hall",
      confidenceLevel: "medium",
      detectedMustNotInclude: [
        "Posiadam kompletny brief",
        "Posiadam ustalenia planistyczne",
      ],
      detectedMustInclude: [
        "Brak MDCP",
        "MPZP",
      ],
      minActions: 8,
      maxActions: 14,
      mustIncludeSpecialistIds: ["traffic", "fire", "geotechnical"],
      mustIncludeDocIds: ["investor_brief", "mdcp", "mpzp_excerpt"],
      investorBriefStage: "missing",
    },
  },
  {
    id: "CE2",
    label: "Kontradykcyjny stub AI — passes korygują",
    prompt: WAREHOUSE_HALL_FULL_PROMPT,
    useContradictoryStub: true,
    expect: {
      confidenceLevel: "medium",
      detectedMustNotInclude: ["Posiadam kompletny brief", "Posiadam ustalenia planistyczne"],
      mustIncludeSpecialistIds: ["geotechnical"],
      mustIncludeDocIds: ["investor_brief"],
    },
  },
] as const;

export interface ConsistencyEnrichmentTestResult {
  id: string;
  label: string;
  passed: boolean;
  errors: string[];
  projectType: string;
  confidenceLevel: string;
  actionCount: number;
  specialistIds: string[];
  detected: string[];
}

function assertConsistencyCase(
  id: string,
  label: string,
  prompt: string,
  useContradictoryStub: boolean,
  expect: ConsistencyEnrichmentExpectation
): ConsistencyEnrichmentTestResult {
  const signals = extractProjectSignals(prompt);
  const classification = classifyProjectType(signals, prompt);
  const raw = useContradictoryStub
    ? contradictoryWarehouseAiStub(signals)
    : mockAnalysis(prompt);
  const analysis = applyPostAiPasses(raw, signals, prompt);
  const errors: string[] = [];

  if (expect.projectSubtype && classification.projectType !== expect.projectSubtype) {
    errors.push(`Subtype: oczekiwano ${expect.projectSubtype}, jest ${classification.projectType}`);
  }
  if (expect.projectTypeLabel && !analysis.projectType.includes(expect.projectTypeLabel)) {
    errors.push(`projectType: oczekiwano zawiera „${expect.projectTypeLabel}”, jest „${analysis.projectType}”`);
  }
  if (expect.confidenceLevel && analysis.confidenceLevel !== expect.confidenceLevel) {
    errors.push(`confidence: oczekiwano ${expect.confidenceLevel}, jest ${analysis.confidenceLevel}`);
  }
  if (expect.investorBriefStage && analysis.investorBriefStage !== expect.investorBriefStage) {
    errors.push(
      `investorBriefStage: oczekiwano ${expect.investorBriefStage}, jest ${analysis.investorBriefStage}`
    );
  }

  const detectedBlob = analysis.detectedInputs.join(" | ");
  for (const frag of expect.detectedMustNotInclude ?? []) {
    if (detectedBlob.toLowerCase().includes(frag.toLowerCase())) {
      errors.push(`Nie powinno być w detected: ${frag}`);
    }
  }
  for (const frag of expect.detectedMustInclude ?? []) {
    if (!detectedBlob.includes(frag)) errors.push(`Brak w detected: ${frag}`);
  }

  if (expect.minActions !== undefined && analysis.recommendedActions.length < expect.minActions) {
    errors.push(`Za mało akcji: ${analysis.recommendedActions.length} < ${expect.minActions}`);
  }
  if (expect.maxActions !== undefined && analysis.recommendedActions.length > expect.maxActions) {
    errors.push(`Za dużo akcji: ${analysis.recommendedActions.length} > ${expect.maxActions}`);
  }

  const specialistIds = analysis.specialists.map((s) => s.id);
  const geoCount = analysis.specialists.filter((s) => /geotechn/i.test(s.discipline)).length;
  if (geoCount > 1) errors.push(`Duplikat geotechniki: ${geoCount} wpisów`);

  for (const sid of expect.mustIncludeSpecialistIds ?? []) {
    if (!specialistIds.includes(sid)) errors.push(`Brak specjalisty: ${sid}`);
  }

  const docIds = analysis.missingDocuments.map((d) => d.id);
  for (const did of expect.mustIncludeDocIds ?? []) {
    if (!docIds.includes(did)) errors.push(`Brak dokumentu: ${did}`);
  }

  return {
    id,
    label,
    passed: errors.length === 0,
    errors,
    projectType: analysis.projectType,
    confidenceLevel: analysis.confidenceLevel,
    actionCount: analysis.recommendedActions.length,
    specialistIds,
    detected: analysis.detectedInputs,
  };
}

export function runConsistencyEnrichmentTests(): ConsistencyEnrichmentTestResult[] {
  return CONSISTENCY_ENRICHMENT_TEST_CASES.map((tc) =>
    assertConsistencyCase(tc.id, tc.label, tc.prompt, tc.useContradictoryStub, tc.expect)
  );
}

export function runConsistencyEnrichmentTestsInConsole(): void {
  const results = runConsistencyEnrichmentTests();
  console.group("Architektor — testy consistency + enrichment (CE1–CE2)");
  let failed = 0;
  for (const r of results) {
    const status = r.passed ? "OK" : "FAIL";
    if (!r.passed) failed += 1;
    console.log(
      `\n[${r.id}] ${status} — ${r.label}\n  typ: ${r.projectType}\n  confidence: ${r.confidenceLevel}\n  akcji: ${r.actionCount}\n  specjaliści: ${r.specialistIds.join(", ")}\n  detected: ${r.detected.join(" | ")}`
    );
    for (const e of r.errors) console.warn(`  • ${e}`);
  }
  console.log(`\nPodsumowanie: ${results.length - failed}/${results.length} zaliczonych`);
  console.groupEnd();
}

if (typeof window !== "undefined") {
  const w = window as unknown as {
    runConsistencyEnrichmentTests?: typeof runConsistencyEnrichmentTestsInConsole;
  };
  w.runConsistencyEnrichmentTests = runConsistencyEnrichmentTestsInConsole;
}
