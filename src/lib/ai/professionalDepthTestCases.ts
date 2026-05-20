import { extractProjectSignals } from "../extractProjectSignals";
import { generateClarifyingQuestions } from "../generateClarifyingQuestions";
import { mockAnalysis } from "../mockAnalysis";
import { classifyProjectType } from "../classifyProjectType";
import type { ProjectTypeKey } from "../../types/projectType";

export interface ProfessionalDepthExpectation {
  projectType: ProjectTypeKey;
  minQuestions?: number;
  maxQuestions?: number;
  mustIncludeQuestionIds?: string[];
  mustIncludeDocIds?: string[];
  mustIncludeSpecialistIds?: string[];
  mustIncludeActionKeywords?: string[];
}

export const PROFESSIONAL_DEPTH_TEST_CASES = [
  {
    id: "A",
    label: "Dom jednorodzinny, MPZP, brak MDCP",
    prompt: "Dom jednorodzinny, MPZP obowiązuje, brak MDCP.",
    expect: {
      projectType: "single_family",
      maxQuestions: 5,
      mustIncludeDocIds: ["mdcp"],
      mustIncludeSpecialistIds: ["surveyor"],
      mustIncludeActionKeywords: ["mdcp", "geotechniczn"],
    },
  },
  {
    id: "B",
    label: "Wielorodzinny — koncepcja, MPZP",
    prompt: "Budynek wielorodzinny na etapie koncepcji, MPZP dostępny.",
    expect: {
      projectType: "multi_family",
      minQuestions: 2,
      maxQuestions: 8,
      mustIncludeQuestionIds: ["cq-fire-accessibility", "cq-parking-multi"],
      mustIncludeSpecialistIds: ["fire", "geotechnical"],
    },
  },
  {
    id: "C",
    label: "Hala magazynowa, plac TIR, MPZP",
    prompt: "Hala magazynowa z placem manewrowym dla TIR, MPZP dostępny.",
    expect: {
      projectType: "warehouse",
      minQuestions: 3,
      maxQuestions: 10,
      mustIncludeQuestionIds: ["cq-storage-height", "cq-geotechnical"],
      mustIncludeDocIds: ["geotechnical_opinion"],
      mustIncludeSpecialistIds: ["geotechnical", "fire"],
      mustIncludeActionKeywords: ["magazyn", "geotechniczn"],
    },
  },
  {
    id: "D",
    label: "Fabryka — brak briefu technologicznego",
    prompt: "Fabryka z linią produkcyjną, brak szczegółowych wytycznych technologicznych.",
    expect: {
      projectType: "factory_industrial",
      minQuestions: 5,
      maxQuestions: 10,
      mustIncludeQuestionIds: ["cq-technology-brief"],
      mustIncludeDocIds: ["technology_brief"],
      mustIncludeSpecialistIds: ["technology", "geotechnical"],
    },
  },
  {
    id: "E",
    label: "Rozbudowa budynku usługowego",
    prompt: "Rozbudowa istniejącego budynku usługowego.",
    expect: {
      projectType: "extension_reconstruction",
      minQuestions: 3,
      maxQuestions: 8,
      mustIncludeQuestionIds: ["cq-existing-inventory"],
      mustIncludeDocIds: ["inventory"],
      mustIncludeSpecialistIds: ["structural"],
    },
  },
  {
    id: "F",
    label: "Zmiana użytkowania magazyn → usługi",
    prompt: "Zmiana sposobu użytkowania budynku magazynowego na usługowy.",
    expect: {
      projectType: "change_of_use",
      minQuestions: 2,
      maxQuestions: 8,
      mustIncludeQuestionIds: ["cq-new-function-planning"],
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  prompt: string;
  expect: ProfessionalDepthExpectation;
}>;

export interface ProfessionalDepthTestResult {
  id: string;
  label: string;
  passed: boolean;
  errors: string[];
  classifiedType: ProjectTypeKey;
  questionCount: number;
  questionIds: string[];
  docIds: string[];
  specialistIds: string[];
  actionTitles: string[];
}

function assertProfessionalCase(
  id: string,
  label: string,
  prompt: string,
  expect: ProfessionalDepthExpectation
): ProfessionalDepthTestResult {
  const signals = extractProjectSignals(prompt);
  const classification = classifyProjectType(signals, prompt);
  const questions = generateClarifyingQuestions(signals, prompt);
  const analysis = mockAnalysis(prompt, undefined, [], questions);
  const errors: string[] = [];

  if (classification.projectType !== expect.projectType) {
    errors.push(
      `Typ: oczekiwano ${expect.projectType}, otrzymano ${classification.projectType}`
    );
  }
  if (expect.minQuestions !== undefined && questions.length < expect.minQuestions) {
    errors.push(`Min pytań: ${expect.minQuestions}, otrzymano ${questions.length}`);
  }
  if (expect.maxQuestions !== undefined && questions.length > expect.maxQuestions) {
    errors.push(`Max pytań: ${expect.maxQuestions}, otrzymano ${questions.length}`);
  }

  const questionIds = questions.map((q) => q.id);
  for (const qid of expect.mustIncludeQuestionIds ?? []) {
    if (!questionIds.includes(qid)) errors.push(`Brak pytania: ${qid}`);
  }

  const docIds = analysis.missingDocuments.map((d) => d.id);
  for (const did of expect.mustIncludeDocIds ?? []) {
    if (!docIds.includes(did)) errors.push(`Brak dokumentu: ${did}`);
  }

  const specialistIds = analysis.specialists.map((s) => s.id);
  for (const sid of expect.mustIncludeSpecialistIds ?? []) {
    if (!specialistIds.includes(sid)) errors.push(`Brak specjalisty: ${sid}`);
  }

  const actionBlob = analysis.recommendedActions.map((a) => a.title.toLowerCase()).join(" ");
  for (const kw of expect.mustIncludeActionKeywords ?? []) {
    if (!actionBlob.includes(kw.toLowerCase())) {
      errors.push(`Brak słowa kluczowego w akcjach: ${kw}`);
    }
  }

  return {
    id,
    label,
    passed: errors.length === 0,
    errors,
    classifiedType: classification.projectType,
    questionCount: questions.length,
    questionIds,
    docIds,
    specialistIds,
    actionTitles: analysis.recommendedActions.map((a) => a.title),
  };
}

export function runProfessionalDepthTests(): ProfessionalDepthTestResult[] {
  return PROFESSIONAL_DEPTH_TEST_CASES.map((tc) =>
    assertProfessionalCase(tc.id, tc.label, tc.prompt, tc.expect)
  );
}

export function runProfessionalDepthTestsInConsole(): void {
  const results = runProfessionalDepthTests();
  console.group("Architektor — testy głębi profesjonalnej (A–F)");
  let failed = 0;
  for (const r of results) {
    const status = r.passed ? "OK" : "FAIL";
    if (!r.passed) failed += 1;
    console.log(
      `\n[${r.id}] ${status} — ${r.label}\n  typ: ${r.classifiedType}, pytań: ${r.questionCount}\n  pytania: ${r.questionIds.join(", ") || "(brak)"}\n  dokumenty: ${r.docIds.join(", ")}\n  specjaliści: ${r.specialistIds.join(", ")}`
    );
    if (r.errors.length) {
      for (const e of r.errors) console.warn(`  • ${e}`);
    }
  }
  console.log(`\nPodsumowanie: ${results.length - failed}/${results.length} zaliczonych`);
  console.groupEnd();
}

if (typeof window !== "undefined") {
  const w = window as unknown as {
    runProfessionalDepthTests?: typeof runProfessionalDepthTestsInConsole;
  };
  w.runProfessionalDepthTests = runProfessionalDepthTestsInConsole;
}
