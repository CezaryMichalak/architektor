import type { GeotechnicalStatus } from "../types/projectType";
import type { ProjectTypeKey } from "../types/projectType";
import type { LegalBasis, RequiredDocument, RiskItem, SpecialistRecommendation } from "../types/architecture";

const LEGAL_NOTE =
  "Standard profesjonalnej praktyki projektowej — szczegółowe wymagania prawne do weryfikacji w aktualnych przepisach i lokalnej praktyce organu.";

export interface GeotechnicalRuleContext {
  projectType: ProjectTypeKey;
  isNewBuilding: boolean;
  isIndustrial: boolean;
  isExtension: boolean;
  hasGeotechnicalOpinion?: boolean;
}

export interface GeotechnicalRecommendation {
  status: GeotechnicalStatus;
  professionalNote: string;
  recommendBefore: string[];
  documents: RequiredDocument[];
  specialists: SpecialistRecommendation[];
  risks: RiskItem[];
  legalBasis: LegalBasis[];
}

const GEOTECH_SPECIALIST: SpecialistRecommendation = {
  id: "geotechnical",
  discipline: "Geotechnik",
  role: "Opinia geotechniczna i kategoria geotechniczna gruntu",
  whenNeeded:
    "Przed projektem fundamentów i konstrukcji — po zebraniu wytycznych inwestora i podstawy planistycznej",
  inputRequired: "MDCP, lokalizacja obiektu, zakres inwestycji, historia terenu (przemysł)",
  outputDeliverable: "Opinia geotechniczna, badania podłoża, kategoria geotechniczna",
  priority: "essential",
  reason:
    "Nośność i osiadanie podłoża warunkują fundamenty — bez opinii geotechnicznej nie należy projektować konstrukcji.",
};

function geotechDoc(status: "missing" | "partial" | "available" = "missing"): RequiredDocument {
  return {
    id: "geotechnical_opinion",
    name: "Opinia geotechniczna / rozpoznanie podłoża",
    abbreviation: "GEO",
    status,
    priority: "critical",
    reason:
      "Wymagana przed projektem fundamentów i konstrukcji nośnej — zalecana przed rozpoczęciem prac konstrukcyjnych.",
    relatedStage: "preliminary",
  };
}

export function evaluateGeotechnicalNeeds(ctx: GeotechnicalRuleContext): GeotechnicalRecommendation {
  const needsGeotech =
    ctx.isNewBuilding ||
    ctx.isExtension ||
    ctx.isIndustrial ||
    [
      "warehouse",
      "warehouse_service_hall",
      "production_hall",
      "factory_industrial",
      "multi_family",
      "public_utility",
    ].includes(ctx.projectType);

  const status: GeotechnicalStatus = ctx.hasGeotechnicalOpinion
    ? "available"
    : needsGeotech
      ? "required_before_structure"
      : "recommended";

  const risks: RiskItem[] = [];
  if (!ctx.hasGeotechnicalOpinion && needsGeotech) {
    risks.push({
      id: "r-geotech-missing",
      title: "Projekt fundamentów bez rozpoznania gruntu",
      description:
        "Brak opinii geotechnicznej może skutkować przeprojektowaniem fundamentów, płyt i konstrukcji.",
      level: "high",
      mitigation: "Zlecić geotechnikowi rozpoznanie przed zamrożeniem rozwiązań konstrukcyjnych.",
      category: "geotechnics",
    });
  }

  if (ctx.isIndustrial && !ctx.hasGeotechnicalOpinion) {
    risks.push({
      id: "r-contamination",
      title: "Potencjalne zanieczyszczenie gruntu (teren przemysłowy)",
      description:
        "Na terenach po działalności przemysłowej może być wymagana ocena stanu zanieczyszczenia — do weryfikacji.",
      level: "medium",
      mitigation: "Uwzględnić w zakresie geotechnika / środowiska — bez wskazywania konkretnych artykułów.",
      category: "geotechnics",
    });
  }

  const legalBasis: LegalBasis[] = [
    {
      id: "geo-practice",
      title: "Standard koordynacji geotechnicznej",
      description:
        "Opinia geotechniczna i ewentualne badania podłoża stanowią dokument wejściowy do projektu fundamentów — zgodnie ze standardem profesjonalnej koordynacji projektowej.",
      scope: "geotechnics",
      verificationRequired: true,
    },
  ];

  if (ctx.isIndustrial) {
    legalBasis.push({
      id: "geo-industrial",
      title: "Tereny przemysłowe — rozpoznanie podłoża i zanieczyszczeń",
      description:
        "Przy halach, magazynach i fabrykach należy rozważyć rozpoznanie geotechniczne z uwzględnieniem obciążeń posadzek, wód gruntowych i historii zagospodarowania — szczegóły prawne do weryfikacji.",
      scope: "geotechnics",
      verificationRequired: true,
    });
  }

  return {
    status,
    professionalNote: LEGAL_NOTE,
    recommendBefore: [
      "projekt fundamentów",
      "projekt konstrukcji nośnej",
      "płyta / posadzka przemysłowa",
    ],
    documents: needsGeotech && !ctx.hasGeotechnicalOpinion ? [geotechDoc()] : [],
    specialists: needsGeotech ? [GEOTECH_SPECIALIST] : [],
    risks,
    legalBasis,
  };
}

/** Topics surfaced in clarifying questions for geotechnics. */
export const GEOTECH_CLARIFICATION_TOPICS = [
  "Kategoria geotechniczna terenu",
  "Warunki wodno-gruntowe i poziom wód gruntowych",
  "Rodzaj fundamentów (ławy, płyta, pale)",
  "Obciążenia posadzki / płyty (magazyn, hala)",
  "Zanieczyszczenie gruntu — teren po przemysłe",
  "Nachylenie terenu / ryzyko osuwiska — do weryfikacji lokalnej",
  "Strefy zagrożenia powodziowego — do weryfikacji w dokumentach planistycznych",
] as const;
