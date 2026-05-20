import { calculateProjectProgress } from "../calculateProjectProgress";
import { evaluateGeotechnicalNeeds } from "../../data/geotechnicalRules";
import { MISSING_UNCERTAIN_LABELS } from "../missingInputLabels";
import { evaluateInvestorBrief, INVESTOR_BRIEF_STAGE_LABEL } from "../../data/investorBriefRules";
import { getProjectTypeEntry } from "../../data/projectTypeMatrix";
import type { ProjectAnalysis, ProjectSignal } from "../../types/architecture";
import type { InvestorBriefStatus } from "../../types/projectType";
import {
  hasSignal,
  investorBriefIsIncomplete,
  isWarehouseLikeType,
  projectTypeFromSignals,
  signalValue,
} from "./signalHelpers";

const COMPLETE_BRIEF_PHRASES = [
  /posiadam\s+kompletny\s+brief/i,
  /mam\s+kompletny\s+brief/i,
  /kompletny\s+brief\s+inwestora/i,
];

const PLANNING_SETTLED_PHRASES = [
  /posiadam\s+ustalenia\s+planistyczne/i,
  /mam\s+ustalenia\s+planistyczne/i,
  /ustalenia\s+planistyczne\s+—\s+kompletne/i,
];

const MPZP_PARTIAL_DETECTED =
  "Obowiązuje MPZP — brak wypisu/wyrysu lub brak pełnej analizy parametrów planistycznych";

function filterDetectedInputs(inputs: string[], removePatterns: RegExp[]): string[] {
  return inputs.filter((line) => !removePatterns.some((p) => p.test(line)));
}

function ensureDetectedInput(inputs: string[], label: string): string[] {
  if (inputs.some((d) => d.includes(label) || label.includes(d))) return inputs;
  return [...inputs, label];
}

const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 } as const;

/** Set maximum confidence (never increases above ceiling). */
function setConfidenceCeiling(
  analysis: ProjectAnalysis,
  ceiling: "low" | "medium" | "high"
): ProjectAnalysis {
  if (CONFIDENCE_RANK[analysis.confidenceLevel] > CONFIDENCE_RANK[ceiling]) {
    return { ...analysis, confidenceLevel: ceiling };
  }
  return analysis;
}

/** Align AI output with rule-based signals — remove contradictions, fix brief/MPZP/MDCP/geo/confidence. */
export function applyConsistencyPass(
  analysis: ProjectAnalysis,
  signals: ProjectSignal[],
  prompt: string
): ProjectAnalysis {
  let result = { ...analysis };
  const pt = projectTypeFromSignals(signals);
  const entry = getProjectTypeEntry(pt);
  let detected = [...result.detectedInputs];
  const uncertain = new Set(result.uncertainInputs);

  // A. Investor brief
  const briefIncomplete = investorBriefIsIncomplete(signals, prompt);
  if (briefIncomplete) {
    detected = filterDetectedInputs(detected, COMPLETE_BRIEF_PHRASES);
    const briefStatus: InvestorBriefStatus = hasSignal(signals, "investorBriefStage", "partial")
      ? "partial"
      : "missing";
    result.investorBriefStage = briefStatus;

    const briefEval = evaluateInvestorBrief(
      pt,
      false,
      briefStatus === "partial"
    );
    result.investorBriefChecklist = briefEval.checklist;

    if (briefEval.document && !result.missingDocuments.some((d) => d.id === "investor_brief")) {
      result.missingDocuments = [briefEval.document, ...result.missingDocuments];
    }

    const briefLabel =
      briefStatus === "partial" ? "Brief inwestora — niepełny" : "Brak / do zebrania — brief inwestora";
    detected = detected.filter(
      (d) => !/posiadam.*brief|kompletny\s+brief/i.test(d)
    );
    detected = ensureDetectedInput(detected, briefLabel);

    uncertain.add(INVESTOR_BRIEF_STAGE_LABEL);
  }

  // B. MPZP without excerpt — no “complete planning” claims
  const mpzpExists = signalValue(signals, "planningStatus") === "mpzp_exists";
  const hasExcerpt = hasSignal(signals, "hasMpzpExcerpt", true);
  if (mpzpExists && !hasExcerpt) {
    detected = filterDetectedInputs(detected, PLANNING_SETTLED_PHRASES);
    detected = ensureDetectedInput(detected, MPZP_PARTIAL_DETECTED);
    if (!result.missingDocuments.some((d) => d.id === "mpzp_excerpt")) {
      result.missingDocuments = [
        {
          id: "mpzp_excerpt",
          name: "Wypis i wyrys z MPZP",
          abbreviation: "MPZP",
          status: "missing",
          priority: "critical",
          reason: "Wymagane do weryfikacji parametrów zabudowy i lokalizacji obiektu na działce.",
        },
        ...result.missingDocuments,
      ];
    }
    uncertain.add("Parametry planistyczne z MPZP — do analizy po pozyskaniu wypisu i wyrysu");
  } else if (mpzpExists && hasExcerpt) {
    detected = filterDetectedInputs(
      detected,
      [/obowiązuje\s+mpzp\s+—\s+brak\s+wypisu/i]
    );
  }

  // C. MDCP missing
  if (hasSignal(signals, "hasMdcp", false)) {
    detected = ensureDetectedInput(detected, "Brak MDCP / mapa niezamówiona");
    if (!result.missingDocuments.some((d) => d.id === "mdcp")) {
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
    const hasMdcpAction = result.recommendedActions.some((a) =>
      /mdcp|geodet|mapa do celów/i.test(a.title)
    );
    if (!hasMdcpAction) {
      result.recommendedActions = [
        {
          id: "consistency-mdcp",
          order: 0,
          title: "Zamówić MDCP",
          description: "Geodeta opracuje mapę do celów projektowych jako podstawę PZT.",
          badge: "MDCP",
        },
        ...result.recommendedActions.map((a, i) => ({ ...a, order: i + 1 })),
      ];
    }
    uncertain.add(MISSING_UNCERTAIN_LABELS.mdcp);
  }

  // D. Geotechnics for new industrial / hall / warehouse
  const isIndustrial = isWarehouseLikeType(pt);
  const isNew =
    hasSignal(signals, "buildingType", "new") ||
    (!hasSignal(signals, "buildingType", "existing") && !hasSignal(signals, "isExtensionProject", true));
  const isExtension =
    hasSignal(signals, "buildingType", "existing") || hasSignal(signals, "isExtensionProject", true);

  const geo = evaluateGeotechnicalNeeds({
    projectType: pt,
    isNewBuilding: isNew,
    isIndustrial,
    isExtension,
    hasGeotechnicalOpinion: hasSignal(signals, "hasGeotechnicalOpinion", true),
  });

  if (
    (geo.status === "required_before_structure" || isIndustrial) &&
    !hasSignal(signals, "hasGeotechnicalOpinion", true)
  ) {
    for (const doc of geo.documents) {
      if (!result.missingDocuments.some((d) => d.id === doc.id)) {
        result.missingDocuments = [doc, ...result.missingDocuments];
      }
    }
    result.geotechnicalStatus = geo.status;

    const hasGeoRisk = result.risks.some((r) => r.id === "r-geotech-missing" || /fundament|płyt/i.test(r.title));
    if (!hasGeoRisk && isIndustrial) {
      result.risks = [
        ...result.risks,
        {
          id: "consistency-geo-slab",
          title: "Ryzyko błędnej płyty fundamentowej / posadzki przemysłowej",
          description:
            "Brak opinii geotechnicznej przed zamrożeniem rozwiązań konstrukcyjnych hali i ramp.",
          level: "high",
          mitigation: "Zlecić geotechnikowi rozpoznanie przed projektem fundamentów.",
          category: "structure",
        },
      ];
    }
    uncertain.add("Opinia geotechniczna — wymagana przed konstrukcją");
  }

  // Sync project type label with classification
  if (pt !== "unknown") {
    result.projectSubtype = pt;
    result.projectType = entry.labelPl;
  }

  // E. Confidence cap when critical inputs missing
  const missingBrief = briefIncomplete;
  const missingMdcp = hasSignal(signals, "hasMdcp", false);
  const missingGeo =
    !hasSignal(signals, "hasGeotechnicalOpinion", true) &&
    (geo.status === "required_before_structure" || isIndustrial);
  const planningUnknown = signalValue(signals, "planningStatus") === "unknown";
  const mpzpWithoutExcerpt = mpzpExists && !hasExcerpt;

  if (planningUnknown || pt === "unknown") {
    result = setConfidenceCeiling(result, "low");
  } else if (missingBrief || missingMdcp || missingGeo || mpzpWithoutExcerpt) {
    result = setConfidenceCeiling(result, "medium");
  }

  result.detectedInputs = [...new Set(detected)];
  result.uncertainInputs = [...uncertain];

  result.advancementPercentage = calculateProjectProgress(signals);

  result.meta = {
    ...result.meta,
    source: result.meta?.source ?? "ai",
    usedFallback: result.meta?.usedFallback ?? false,
    needsClarification:
      result.uncertainInputs.length > 0 ||
      briefIncomplete ||
      (mpzpExists && !hasExcerpt) ||
      pt === "unknown",
    verifyLegalBasis:
      result.meta?.verifyLegalBasis === true ||
      result.legalBasis.some((l) => l.verificationRequired === true),
  };

  return result;
}
