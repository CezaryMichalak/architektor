import type { InvestorBriefStatus } from "../types/projectType";
import type { ProjectTypeKey } from "../types/projectType";
import type { RequiredDocument, LegalBasis } from "../types/architecture";

export const INVESTOR_BRIEF_STAGE_LABEL =
  "Wytyczne inwestora / brief projektowy";

const LEGAL_BASIS: LegalBasis = {
  id: "investor-brief-practice",
  title: "Brief projektowy jako dokument wejściowy",
  description:
    "Standard profesjonalnej koordynacji projektowej — zebrane wytyczne inwestora stanowią dokument wejściowy do prac koncepcyjnych, przed rozwinięciem PZT/PAB.",
  scope: "coordination",
  verificationRequired: false,
};

export interface InvestorBriefEvaluation {
  status: InvestorBriefStatus;
  stageLabel: string;
  checklist: string[];
  document: RequiredDocument | null;
  legalBasis: LegalBasis[];
  recommendedAction: string | null;
}

const RESIDENTIAL_CHECKLIST = [
  "Program funkcjonalny (powierzchnie, liczba kondygnacji)",
  "Standard wykończenia i budżet orientacyjny",
  "Preferencje architektoniczne i układ dzienny",
  "Wymagania dot. garażu, tarasu, ogrzewania",
  "Termin realizacji i etapy inwestycji",
];

const INDUSTRIAL_CHECKLIST = [
  "Proces technologiczny / logistyka (jeśli dotyczy)",
  "Wymiary hal, wysokości składowania, obciążenia posadzek",
  "Wymagania TIR / plac manewrowy / rampy",
  "Media i moce przyłączeniowe",
  "BHP, PPOŻ procesowy, substancje niebezpieczne",
  "Harmonogram faz inwestycji",
];

const PUBLIC_COMMERCIAL_CHECKLIST = [
  "Program funkcjonalno-użytkowy",
  "Natężenie użytkowników / klientów",
  "Wymagania dostępności",
  "Standard wykończenia i identyfikacja",
  "Parking i komunikacja",
  "Wymagania operatora / najemcy (retail, usługi)",
];

function briefDocument(status: InvestorBriefStatus): RequiredDocument {
  return {
    id: "investor_brief",
    name: INVESTOR_BRIEF_STAGE_LABEL,
    abbreviation: "BRIEF",
    status: status === "available" ? "available" : status === "partial" ? "partial" : "missing",
    priority: status === "missing" ? "high" : "medium",
    reason:
      "Dokument wejściowy do prac koncepcyjnych — bez briefu ryzyko przeprojektowania i niezgodności z oczekiwaniami inwestora.",
    relatedStage: "concept",
  };
}

export function evaluateInvestorBrief(
  projectType: ProjectTypeKey,
  hasBrief?: boolean,
  hasPartialBrief?: boolean
): InvestorBriefEvaluation {
  const residential: ProjectTypeKey[] = ["single_family", "multi_family"];
  const industrial: ProjectTypeKey[] = [
    "warehouse",
    "warehouse_service_hall",
    "production_hall",
    "factory_industrial",
  ];
  const publicCommercial: ProjectTypeKey[] = [
    "service",
    "office",
    "retail",
    "public_utility",
  ];

  let checklist: string[] = [];
  if (residential.includes(projectType)) checklist = RESIDENTIAL_CHECKLIST;
  else if (industrial.includes(projectType)) checklist = INDUSTRIAL_CHECKLIST;
  else if (publicCommercial.includes(projectType)) checklist = PUBLIC_COMMERCIAL_CHECKLIST;
  else if (projectType === "extension_reconstruction" || projectType === "change_of_use") {
    checklist = [
      ...RESIDENTIAL_CHECKLIST.slice(0, 2),
      "Zakres robót względem istniejącego budynku",
      "Nowa funkcja / program po zmianie",
    ];
  } else checklist = ["Program funkcjonalny", "Założenia inwestycyjne", "Harmonogram"];

  const status: InvestorBriefStatus = hasBrief
    ? "available"
    : hasPartialBrief
      ? "partial"
      : projectType === "unknown"
        ? "unknown"
        : "missing";

  const needsBrief = projectType !== "unknown" && status !== "available";

  return {
    status,
    stageLabel: INVESTOR_BRIEF_STAGE_LABEL,
    checklist,
    document: needsBrief ? briefDocument(status) : null,
    legalBasis: [LEGAL_BASIS],
    recommendedAction: needsBrief
      ? "Zebrać wytyczne inwestora / brief projektowy przed rozwinięciem koncepcji PZT/PAB"
      : null,
  };
}
