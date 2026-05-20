import { evaluateGeotechnicalNeeds } from "../../data/geotechnicalRules";
import { evaluateInvestorBrief, INVESTOR_BRIEF_STAGE_LABEL } from "../../data/investorBriefRules";
import { getProjectTypeEntry } from "../../data/projectTypeMatrix";
import { SPECIALIST_MATRIX } from "../../data/specialistMatrix";
import type { ProjectAnalysis, ProjectSignal, SpecialistRecommendation } from "../../types/architecture";
import { DISCLAIMER_PL } from "../../types/architecture";
import type { ProjectTypeKey } from "../../types/projectType";

function signalValue(signals: ProjectSignal[], key: string): string | boolean | number | undefined {
  return signals.find((s) => s.key === key)?.value;
}

function hasSignal(signals: ProjectSignal[], key: string, value?: string | boolean): boolean {
  const v = signalValue(signals, key);
  if (v === undefined) return false;
  if (value === undefined) return true;
  return String(v) === String(value);
}

function projectType(signals: ProjectSignal[]): ProjectTypeKey {
  return (String(signalValue(signals, "projectSubtype") ?? "unknown") as ProjectTypeKey) || "unknown";
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

function ensureSpecialist(
  specialists: SpecialistRecommendation[],
  id: string
): SpecialistRecommendation[] {
  if (specialists.some((s) => s.id === id)) return specialists;
  const fromMatrix = SPECIALIST_MATRIX.find((s) => s.id === id);
  return fromMatrix ? [...specialists, fromMatrix] : specialists;
}

/** Post-AI enforcement of planning, MDCP, geotechnics, investor brief, and type-specific rules. */
export function applySafetyPass(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[]
): ProjectAnalysis {
  let result = { ...analysis };
  const uncertain = new Set(result.uncertainInputs);
  const risks = [...result.risks];
  const pt = projectType(signals);
  const entry = getProjectTypeEntry(pt);

  if (hasMpzp(signals)) {
    result.recommendedActions = result.recommendedActions.filter(
      (a) => !isWzPrimaryAction(a.title, a.badge)
    );
    result.missingDocuments = result.missingDocuments.filter(
      (d) => d.id !== "wz_decision" && d.abbreviation !== "WZ"
    );
    uncertain.delete("Ścieżka WZ — nie rekomendowana jako pierwsza przy obowiązującym MPZP");
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

  const isIndustrial = [
    "warehouse",
    "warehouse_service_hall",
    "production_hall",
    "factory_industrial",
  ].includes(pt);
  const isNew =
    hasSignal(signals, "buildingType", "new") ||
    (!hasSignal(signals, "buildingType", "existing") && !hasSignal(signals, "isExtensionProject", true));
  const isExtension =
    hasSignal(signals, "buildingType", "existing") ||
    hasSignal(signals, "isExtensionProject", true) ||
    pt === "extension_reconstruction";

  const geo = evaluateGeotechnicalNeeds({
    projectType: pt,
    isNewBuilding: isNew,
    isIndustrial,
    isExtension,
    hasGeotechnicalOpinion: hasSignal(signals, "hasGeotechnicalOpinion", true),
  });

  if (
    geo.status === "required_before_structure" ||
    isIndustrial ||
    isNew ||
    isExtension
  ) {
    for (const doc of geo.documents) {
      if (!result.missingDocuments.some((d) => d.id === doc.id)) {
        result.missingDocuments = [doc, ...result.missingDocuments];
      }
    }
    let specs = result.specialists;
    for (const sp of geo.specialists) {
      specs = ensureSpecialist(specs, sp.id);
    }
    result.specialists = specs;

    const hasGeoAction = result.recommendedActions.some((a) =>
      /geotechniczn|opinia geotechniczn/i.test(a.title)
    );
    if (!hasGeoAction && !hasSignal(signals, "hasGeotechnicalOpinion", true)) {
      result.recommendedActions = [
        {
          id: "safety-geotechnical",
          order: 0,
          title: "Zlecić rozpoznanie geotechniczne i opinię geotechniczną",
          description:
            "Przed projektem fundamentów i konstrukcji — standard profesjonalnej koordynacji.",
          badge: "GEO",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
    result.geotechnicalStatus = geo.status;
  }

  const brief = evaluateInvestorBrief(
    pt,
    hasSignal(signals, "hasInvestorBrief", true),
    hasSignal(signals, "investorBriefStage", "partial")
  );
  result.investorBriefStage = brief.status;
  result.investorBriefChecklist = brief.checklist;

  if (brief.status === "missing" || brief.status === "partial") {
    if (brief.document && !result.missingDocuments.some((d) => d.id === "investor_brief")) {
      result.missingDocuments = [brief.document, ...result.missingDocuments];
    }
    const hasBriefAction = result.recommendedActions.some((a) =>
      /brief|wytyczne inwestora/i.test(a.title)
    );
    if (!hasBriefAction && brief.recommendedAction) {
      result.recommendedActions = [
        {
          id: "safety-investor-brief",
          order: 0,
          title: brief.recommendedAction,
          description: INVESTOR_BRIEF_STAGE_LABEL,
          badge: "BRIEF",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
  }

  if (isExtension) {
    const hasInventory = result.missingDocuments.some((d) => d.id === "inventory");
    if (!hasInventory) {
      result.missingDocuments.push({
        id: "inventory",
        name: "Inwentaryzacja budowlana",
        abbreviation: "INV",
        status: "missing",
        priority: "high",
        reason: "Wymagana przy rozbudowie / przebudowie istniejącego budynku.",
      });
    }
    result.specialists = ensureSpecialist(result.specialists, "structural");
    const hasInvAction = result.recommendedActions.some((a) => /inwentaryzac/i.test(a.title));
    if (!hasInvAction) {
      result.recommendedActions = [
        {
          id: "safety-inventory",
          order: 0,
          title: "Zlecić inwentaryzację i ocenę konstrukcyjną istniejącego budynku",
          description: "Dokument wejściowy do rozbudowy / przebudowy.",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
  }

  if (isIndustrial) {
    result.specialists = ensureSpecialist(result.specialists, "geotechnical");
    result.specialists = ensureSpecialist(result.specialists, "fire");
    result.specialists = ensureSpecialist(result.specialists, "installations");
    if (pt === "factory_industrial" || pt === "production_hall") {
      result.specialists = ensureSpecialist(result.specialists, "technology");
      if (!hasSignal(signals, "hasTechnologyBrief", true)) {
        const hasTechDoc = result.missingDocuments.some((d) => d.id === "technology_brief");
        if (!hasTechDoc) {
          result.missingDocuments.push({
            id: "technology_brief",
            name: "Brief technologiczny / wytyczne procesowe",
            abbreviation: "TECH",
            status: "missing",
            priority: "critical",
            reason: "Brak szczegółowych wytycznych technologicznych blokuje koncepcję hali.",
          });
        }
        uncertain.add("Brief technologiczny — do zebrania przed koncepcją");
      }
    }
  }

  if (pt === "multi_family") {
    result.specialists = ensureSpecialist(result.specialists, "fire");
    result.specialists = ensureSpecialist(result.specialists, "accessibility");
    const hasParking = result.recommendedActions.some((a) =>
      /parking|miejsc postojow|drogi pożarow/i.test(a.title)
    );
    if (!hasParking) {
      uncertain.add("Parking, drogi pożarowe i dostępność — do ustalenia na PZT");
    }
  }

  if (pt === "unknown") {
    uncertain.add("KRYTYCZNE: funkcja obiektu nieznana — wymaga doprecyzowania przed planem działań");
    if (result.confidenceLevel === "high") result.confidenceLevel = "low";
  }

  result.projectSubtype = pt !== "unknown" ? pt : result.projectSubtype;
  if (!result.projectType || result.projectType.includes("do doprecyzowania")) {
    result.projectType = entry.labelPl;
  }

  const missingCritical =
    planningUnknown(signals) ||
    (noMpzp(signals) && !result.clarifyingQuestionsAsked.length);
  if (missingCritical && result.confidenceLevel === "high") {
    result.confidenceLevel = "medium";
  }

  if (result.uncertainInputs.length >= 2 && result.confidenceLevel === "high") {
    result.confidenceLevel = "medium";
  }

  if (result.uncertainInputs.length >= 4 || planningUnknown(signals) || pt === "unknown") {
    result.confidenceLevel = "low";
  }

  if (!result.disclaimer?.includes("analiza pomocnicza")) {
    result.disclaimer = DISCLAIMER_PL;
  }

  result.uncertainInputs = [...uncertain];
  result.risks = risks.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
  const needsClarification =
    planningUnknown(signals) || result.uncertainInputs.length > 0 || pt === "unknown";

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
