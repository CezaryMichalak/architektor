import type { ProjectAnalysis, ProjectSignal } from "../../types/architecture";
import { DISCLAIMER_PL } from "../../types/architecture";

function signalValue(signals: ProjectSignal[], key: string): string | boolean | number | undefined {
  return signals.find((s) => s.key === key)?.value;
}

function hasMpzp(signals: ProjectSignal[]): boolean {
  return signalValue(signals, "planningStatus") === "mpzp_exists";
}

function noMpzp(signals: ProjectSignal[]): boolean {
  const ps = signalValue(signals, "planningStatus");
  return ps === "no_mpzp" || ps === "wz_path";
}

function planningUnknown(signals: ProjectSignal[]): boolean {
  return signalValue(signals, "planningStatus") === "unknown";
}

function lacksMdcp(signals: ProjectSignal[]): boolean {
  return signalValue(signals, "hasMdcp") === false;
}

function isWzPrimaryAction(title: string, badge?: string): boolean {
  const t = title.toLowerCase();
  return badge === "WZ" || /warunki\s+zabudowy|\bwz\b|wniosek\s+o\s+wz/i.test(t);
}

/** Post-AI enforcement of planning, MDCP, confidence, and disclaimer rules. */
export function applySafetyPass(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[]
): ProjectAnalysis {
  let result = { ...analysis };
  const uncertain = new Set(result.uncertainInputs);
  const risks = [...result.risks];

  if (hasMpzp(signals)) {
    result.recommendedActions = result.recommendedActions.filter(
      (a) => !isWzPrimaryAction(a.title, a.badge)
    );
    result.missingDocuments = result.missingDocuments.filter(
      (d) => d.id !== "wz_decision" && d.abbreviation !== "WZ"
    );
    if (!uncertain.has("Ścieżka WZ — nie rekomendowana jako pierwsza przy obowiązującym MPZP")) {
      uncertain.add("Ścieżka WZ — nie rekomendowana jako pierwsza przy obowiązującym MPZP");
    }
  }

  if (noMpzp(signals) || planningUnknown(signals)) {
    const hasWzStep = result.recommendedActions.some((a) => isWzPrimaryAction(a.title, a.badge));
    if (!hasWzStep && noMpzp(signals)) {
      result.recommendedActions = [
        {
          id: "safety-wz-verify",
          order: 0,
          title: "Zweryfikować status planistyczny i ścieżkę WZ",
          description:
            "Przy braku MPZP należy potwierdzić aktualny status planistyczny terenu przed wyborem decyzji o warunkach zabudowy.",
          badge: "WZ",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
    if (planningUnknown(signals)) {
      uncertain.add("Status planistyczny terenu (MPZP / WZ / inne ustalenia)");
      if (result.confidenceLevel === "high") result.confidenceLevel = "medium";
      risks.push({
        id: "safety-unknown-planning",
        title: "Nieznany status planistyczny",
        description: "Do czasu weryfikacji nie należy przyjmować ostatecznej ścieżki formalnej.",
        level: "high",
        mitigation: "Weryfikacja w urzędzie gminy i rejestrach planów.",
        category: "planning",
      });
    }
  }

  if (lacksMdcp(signals)) {
    const hasMdcpDoc = result.missingDocuments.some((d) => d.id === "mdcp" || d.abbreviation === "MDCP");
    if (!hasMdcpDoc) {
      result.missingDocuments = [
        {
          id: "mdcp",
          name: "Mapa do celów projektowych",
          abbreviation: "MDCP",
          status: "missing",
          priority: "critical",
          reason: "Wymagana przed opracowaniem PZT — zlecić geodecie.",
        },
        ...result.missingDocuments,
      ];
    }
    const hasGeodeta = result.recommendedActions.some((a) =>
      /geodet|mdcp|mapa do celów/i.test(a.title)
    );
    if (!hasGeodeta) {
      result.recommendedActions = [
        {
          id: "safety-mdcp",
          order: 0,
          title: "Zlecić pomiad geodezyjny i MDCP",
          description: "Geodeta opracuje mapę do celów projektowych jako podstawę PZT.",
          badge: "MDCP",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
  }

  const missingCritical =
    planningUnknown(signals) ||
    (noMpzp(signals) && !result.clarifyingQuestionsAsked.length);
  if (missingCritical && result.confidenceLevel === "high") {
    result.confidenceLevel = "medium";
  }

  if (
    result.uncertainInputs.length >= 2 &&
    result.confidenceLevel === "high"
  ) {
    result.confidenceLevel = "medium";
  }

  if (result.uncertainInputs.length >= 4 || planningUnknown(signals)) {
    result.confidenceLevel = "low";
  }

  if (!result.disclaimer?.includes("analiza pomocnicza")) {
    result.disclaimer = DISCLAIMER_PL;
  }

  result.uncertainInputs = [...uncertain];
  result.risks = risks.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  const needsClarification =
    planningUnknown(signals) || result.uncertainInputs.length > 0;

  result.meta = {
    source: result.meta?.source ?? "ai",
    usedFallback: result.meta?.usedFallback ?? false,
    aiError: result.meta?.aiError,
    needsClarification,
    verifyLegalBasis:
      result.meta?.verifyLegalBasis === true ||
      result.legalBasis.some((l) => l.verificationRequired === true),
  };

  return result;
}
