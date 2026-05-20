import { extractProjectSignals } from "../extractProjectSignals";
import { generateClarifyingQuestions, getComplexityTier } from "../generateClarifyingQuestions";

export interface ClarificationTestExpectation {
  minCount?: number;
  maxCount?: number;
  mustIncludeAreas?: string[];
  mustIncludeIds?: string[];
  mustNotIncludeIds?: string[];
}

/** Generic phrasing that should not appear in professional clarification copy. */
const BANNED_QUESTION_SUBSTRINGS = [
  "czy masz dokumenty",
  "czy potrzebujesz branżyst",
  "czy masz wszystkie dokumenty",
] as const;

export const CLARIFICATION_TEST_CASES = [
  {
    id: "A",
    label: "Dom jednorodzinny — kompletne dane wejściowe",
    prompt: "Dom jednorodzinny, jest MPZP, mam wypis i wyrys, mam MDCP.",
    expect: {
      maxCount: 2,
      mustNotIncludeIds: ["cq-planning-status", "cq-mpzp-excerpt", "cq-mdcp-status"],
    },
  },
  {
    id: "B",
    label: "MPZP bez wypisu i MDCP",
    prompt: "Dom jednorodzinny, jest MPZP, brak wypisu i wyrysu, brak MDCP.",
    expect: {
      minCount: 1,
      maxCount: 6,
      mustNotIncludeIds: ["cq-planning-status", "cq-mdcp-status"],
      mustIncludeIds: ["cq-mpzp-excerpt"],
    },
  },
  {
    id: "C",
    label: "Brak MPZP — ścieżka WZ",
    prompt: "Budynek jednorodzinny, brak MPZP.",
    expect: {
      minCount: 2,
      maxCount: 8,
      mustIncludeIds: ["cq-wz-feasibility", "cq-road-access", "cq-utilities"],
      mustNotIncludeIds: ["cq-planning-status", "cq-mpzp-excerpt"],
    },
  },
  {
    id: "D",
    label: "Rozbudowa budynku usługowego",
    prompt: "Rozbudowa istniejącego budynku usługowego.",
    expect: {
      minCount: 3,
      maxCount: 10,
      mustIncludeAreas: ["existing_building", "specialists", "planning"],
      mustIncludeIds: ["cq-existing-inventory", "cq-building-scope"],
    },
  },
  {
    id: "E",
    label: "Wielorodzinny — koncepcja, MPZP",
    prompt: "Budynek wielorodzinny na etapie koncepcji, MPZP dostępny.",
    expect: {
      minCount: 2,
      maxCount: 9,
      mustIncludeIds: ["cq-planning-params", "cq-fire-accessibility", "cq-road-access"],
    },
  },
  {
    id: "F",
    label: "Nadbudowa w strefie konserwatorskiej",
    prompt: "Nadbudowa budynku w strefie ochrony konserwatorskiej.",
    expect: {
      minCount: 3,
      maxCount: 10,
      mustIncludeAreas: ["constraints", "existing_building", "planning"],
      mustIncludeIds: ["cq-conservation-scope", "cq-existing-inventory"],
    },
  },
  {
    id: "G",
    label: "Hala magazynowo-usługowa — wiele luk w danych",
    prompt: "Hala magazynowo-usługowa, MPZP obowiązuje, brak wypisu i wyrysu, brak MDCP.",
    expect: {
      minCount: 6,
      maxCount: 12,
      mustIncludeIds: [
        "cq-mpzp-excerpt",
        "cq-storage-height",
        "cq-docks-tir",
        "cq-geotechnical",
        "cq-fire-load-warehouse",
        "cq-warehouse-utilities",
      ],
    },
  },
  {
    id: "H",
    label: "Hala magazynowa — kompletny opis wejściowy",
    prompt:
      "Hala magazynowa, MPZP obowiązuje, mam wypis i wyrys z parametrami intensywności, MDCP dostępna, brief technologiczno-logistyczny od inwestora, wysokie składowanie na regałach, towary ogólne, obciążenie pożarowe ustalone ze strefami PPOŻ i drogą pożarową, 6 doków i plac manewrowy TIR, opinia geotechniczna wykonana, przyłącza mediów i zapotrzebowanie 800 kW, wody opadowe z dachu do retencji, obciążenia posadzki pod regały ustalone.",
    expect: {
      maxCount: 2,
      mustNotIncludeIds: [
        "cq-storage-height",
        "cq-docks-tir",
        "cq-mdcp-status",
        "cq-mpzp-excerpt",
        "cq-geotechnical",
      ],
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  prompt: string;
  expect: ClarificationTestExpectation;
}>;

export interface ClarificationTestResult {
  id: string;
  label: string;
  passed: boolean;
  errors: string[];
  questionCount: number;
  complexity: ReturnType<typeof getComplexityTier>;
  questionIds: string[];
  areas: string[];
}

function assertCase(
  id: string,
  label: string,
  prompt: string,
  expect: ClarificationTestExpectation
): ClarificationTestResult {
  const signals = extractProjectSignals(prompt);
  const questions = generateClarifyingQuestions(signals, prompt);
  const errors: string[] = [];
  const questionIds = questions.map((q) => q.id);
  const areas = [...new Set(questions.map((q) => q.relatedArea))];

  if (expect.minCount !== undefined && questions.length < expect.minCount) {
    errors.push(`Oczekiwano min. ${expect.minCount} pytań, otrzymano ${questions.length}`);
  }
  if (expect.maxCount !== undefined && questions.length > expect.maxCount) {
    errors.push(`Oczekiwano max. ${expect.maxCount} pytań, otrzymano ${questions.length}`);
  }
  for (const mustId of expect.mustIncludeIds ?? []) {
    if (!questionIds.includes(mustId)) {
      errors.push(`Brak wymaganego pytania: ${mustId}`);
    }
  }
  for (const bannedId of expect.mustNotIncludeIds ?? []) {
    if (questionIds.includes(bannedId)) {
      errors.push(`Niedozwolone pytanie: ${bannedId}`);
    }
  }
  for (const area of expect.mustIncludeAreas ?? []) {
    if (!areas.includes(area as (typeof areas)[number])) {
      errors.push(`Brak obszaru: ${area}`);
    }
  }
  for (const q of questions) {
    const lower = `${q.question} ${q.reason}`.toLowerCase();
    for (const banned of BANNED_QUESTION_SUBSTRINGS) {
      if (lower.includes(banned)) {
        errors.push(`Zbyt ogólne sformułowanie („${banned}”) w pytaniu ${q.id}`);
      }
    }
  }

  return {
    id,
    label,
    passed: errors.length === 0,
    errors,
    questionCount: questions.length,
    complexity: getComplexityTier(signals),
    questionIds,
    areas,
  };
}

export function runClarificationTests(): ClarificationTestResult[] {
  return CLARIFICATION_TEST_CASES.map((tc) =>
    assertCase(tc.id, tc.label, tc.prompt, tc.expect)
  );
}

/** Dev console runner */
export function runClarificationTestsInConsole(): void {
  const results = runClarificationTests();
  console.group("Architektor — testy pytań doprecyzowujących (A–F)");
  let failed = 0;
  for (const r of results) {
    const status = r.passed ? "OK" : "FAIL";
    if (!r.passed) failed += 1;
    console.log(
      `\n[${r.id}] ${status} — ${r.label}\n  złożoność: ${r.complexity}, pytań: ${r.questionCount}\n  id: ${r.questionIds.join(", ") || "(brak)"}`
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
    runClarificationTests?: typeof runClarificationTestsInConsole;
    architektorClarificationTests?: typeof runClarificationTestsInConsole;
  };
  w.runClarificationTests = runClarificationTestsInConsole;
  w.architektorClarificationTests = runClarificationTestsInConsole;
}
