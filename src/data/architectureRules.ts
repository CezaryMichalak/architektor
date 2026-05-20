import type { ArchitectureRule, ProjectSignal } from "../types/architecture";
import { evaluateGeotechnicalNeeds } from "./geotechnicalRules";
import { evaluateInvestorBrief } from "./investorBriefRules";
import { KNOWLEDGE_BASE_LEGAL } from "./knowledgeBase";
import type { ProjectTypeKey } from "../types/projectType";

function hasSignal(signals: ProjectSignal[], key: string, value?: string | boolean): boolean {
  const s = signals.find((x) => x.key === key);
  if (!s) return false;
  if (value === undefined) return true;
  return String(s.value) === String(value);
}

function projectType(signals: ProjectSignal[]): ProjectTypeKey {
  const v = signals.find((x) => x.key === "projectSubtype")?.value;
  return (v ? String(v) : "unknown") as ProjectTypeKey;
}

function doc(
  id: string,
  name: string,
  abbreviation: string,
  status: "missing" | "partial" | "available" | "uncertain",
  priority: "critical" | "high" | "medium",
  reason: string
) {
  return { id, name, abbreviation, status, priority, reason };
}

export const ARCHITECTURE_RULES: ArchitectureRule[] = [
  {
    id: "rule-mpzp-excerpt",
    title: "MPZP obowiązuje — wypis i wyrys jako podstawa",
    condition: (s) =>
      hasSignal(s, "planningStatus", "mpzp_exists") &&
      !hasSignal(s, "hasMpzpExcerpt", true),
    professionalRecommendation:
      "Przy obowiązującym MPZP podstawą dalszej pracy są wypis i wyrys z planu. Nie należy traktować WZ jako ścieżki pierwszej kolejności — należy uzyskać ustalenia planistyczne z MPZP i zweryfikować parametry zabudowy.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[2]],
    requiredDocuments: [
      doc(
        "mpzp_excerpt",
        "Wypis i wyrys z MPZP",
        "MPZP",
        "missing",
        "critical",
        "Niezbędne do określenia przeznaczenia terenu i parametrów zabudowy."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-mpzp-params",
        title: "Projektowanie bez parametrów planistycznych",
        description:
          "Brak wypisu i wyrysu uniemożliwia wiarygodne ustalenie intensywności zabudowy i warunków lokalizacji.",
        level: "high",
        mitigation: "Priorytetowo uzyskać wypis i wyrys z właściwego organu.",
        category: "planning",
      },
    ],
    nextSteps: [
      {
        id: "ns-mpzp-1",
        order: 1,
        title: "Uzyskać wypis i wyrys z MPZP",
        description:
          "Złożyć wniosek do właściwego organu administracji architektoniczno-budowlanej lub urzędu wydającego dokumenty planistyczne.",
        badge: "MPZP",
        timeframe: "1–4 tygodnie",
      },
      {
        id: "ns-mpzp-2",
        order: 2,
        title: "Zweryfikować parametry zabudowy",
        description:
          "Na podstawie wypisu ustalić przeznaczenie, linię zabudowy, wskaźniki i ograniczenia lokalizacyjne.",
        badge: "MPZP",
      },
    ],
    projectStageImpact: 5,
    confidenceLevel: "high",
    clarificationTriggers: [
      {
        id: "cq-planning-params",
        question:
          "Czy znane są przeznaczenie terenu oraz parametry z obowiązującego MPZP (intensywność, wysokość, linia zabudowy, PBC) w stopniu umożliwiającym opracowanie PZT?",
        reason:
          "Bez tych ustaleń nie należy rozwijać koncepcji zabudowy — parametry planistyczne stanowią ramy formalne dla PZT/PAB i weryfikacji w organie AAB.",
        options: ["Tak, mam ustalenia", "Częściowo", "Nie — wymagam wypisu"],
        requiredForFinalPlan: true,
        priority: "important",
        relatedArea: "planning",
        triggerReason: "rule-mpzp-excerpt",
      },
    ],
  },
  {
    id: "rule-no-mpzp-wz",
    title: "Brak MPZP — ocena ścieżki WZ",
    condition: (s) =>
      hasSignal(s, "planningStatus", "no_mpzp") ||
      (hasSignal(s, "planningStatus", "unknown") && hasSignal(s, "locationNoMpzp", true)),
    professionalRecommendation:
      "Przy braku MPZP należy przeprowadzić analizę statusu planistycznego terenu i rozważyć uzyskanie decyzji o warunkach zabudowy (WZ) jako podstawy dalszej pracy, o ile nie obowiązują inne akty planistyczne.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[3]],
    requiredDocuments: [
      doc(
        "wz_decision",
        "Decyzja o warunkach zabudowy",
        "WZ",
        "missing",
        "critical",
        "Potencjalna podstawa zabudowy przy braku MPZP."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-wz-time",
        title: "Wydłużony proces planistyczny",
        description: "Postępowanie WZ może wymagać dodatkowych ustaleń i opinii.",
        level: "medium",
        mitigation: "Wcześnie zidentyfikować wymagane załączniki i mapy.",
        category: "planning",
      },
    ],
    nextSteps: [
      {
        id: "ns-wz-1",
        order: 1,
        title: "Potwierdzić brak MPZP i aktów zastępczych",
        description: "Sprawdzić rejestry planów i studium — uniknąć błędnej ścieżki formalnej.",
        badge: "WZ",
      },
      {
        id: "ns-wz-2",
        order: 2,
        title: "Przygotować wniosek o WZ",
        description: "Zebrać mapę, wypis z ewidencji gruntów i opis zamierzenia budowlanego.",
        badge: "WZ",
        timeframe: "2–6 miesięcy",
      },
    ],
    projectStageImpact: 3,
    confidenceLevel: "medium",
    clarificationTriggers: [
      {
        id: "cq-wz-intent",
        question:
          "Czy inwestycja zakłada nową zabudowę na działce bez obowiązującego MPZP, co uzasadnia postępowanie o decyzję o warunkach zabudowy (WZ)?",
        reason:
          "Charakter inwestycji (nowa zabudowa vs modernizacja istniejącego obiektu) wpływa na zakres postępowania, wymagane załączniki do wniosku o WZ oraz harmonogram uzgodnień przed opracowaniem PZT.",
        options: ["Tak", "Nie — modernizacja", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "important",
        relatedArea: "formal_path",
        triggerReason: "rule-no-mpzp-wz",
      },
    ],
  },
  {
    id: "rule-unknown-planning",
    title: "Nieznany status planistyczny",
    condition: (s) => hasSignal(s, "planningStatus", "unknown"),
    professionalRecommendation:
      "Status planistyczny terenu wymaga weryfikacji przed wyborem ścieżki (MPZP / WZ / inne ustalenia). Do czasu potwierdzenia należy traktować ścieżkę formalną jako niepewną.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[2], KNOWLEDGE_BASE_LEGAL[3]],
    requiredDocuments: [],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-unknown-path",
        title: "Błędna ścieżka formalna",
        description: "Możliwe ponowne opracowanie koncepcji po ustaleniu aktu planistycznego.",
        level: "high",
        mitigation: "Weryfikacja w urzędzie gminy i u organu nadzoru budowlanego.",
        category: "planning",
      },
    ],
    nextSteps: [
      {
        id: "ns-plan-verify",
        order: 1,
        title: "Zweryfikować status planistyczny działki",
        description: "Sprawdzić obowiązujące MPZP, studium i rejestry planów miejscowych.",
      },
    ],
    projectStageImpact: 0,
    confidenceLevel: "low",
    clarificationTriggers: [],
  },
  {
    id: "rule-no-mdcp",
    title: "Brak MDCP — geodeta przed PZT",
    condition: (s) => !hasSignal(s, "hasMdcp", true),
    professionalRecommendation:
      "Przed opracowaniem projektu zagospodarowania terenu (PZT) należy zlecić geodecie opracowanie mapy do celów projektowych (MDCP) na podstawie aktualnego pomiadu.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[4]],
    requiredDocuments: [
      doc(
        "mdcp",
        "Mapa do celów projektowych",
        "MDCP",
        "missing",
        "critical",
        "Podstawa lokalizacji obiektu i opracowania PZT."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-mdcp-delay",
        title: "Opóźnienie opracowania PZT",
        description: "Brak MDCP blokuje rzetelną lokalizację i uzgodnienia przyłączy.",
        level: "medium",
        mitigation: "Wczesne zlecenie pomiadu geodezyjnego.",
        category: "documentation",
      },
    ],
    nextSteps: [
      {
        id: "ns-mdcp-1",
        order: 1,
        title: "Zlecić pomiar i MDCP geodecie",
        description: "Ustalić zakres mapy, granice działki i wymagania organu.",
        badge: "MDCP",
        timeframe: "2–6 tygodni",
      },
    ],
    projectStageImpact: 8,
    confidenceLevel: "high",
    clarificationTriggers: [],
  },
  {
    id: "rule-doc-stages",
    title: "Etapy dokumentacji projektowej",
    condition: (s) =>
      hasSignal(s, "projectStage", "building_permit_docs") ||
      hasSignal(s, "projectStage", "preliminary"),
    professionalRecommendation:
      "Należy rozróżnić etap koncepcyjny, dokumentację na pozwolenie na budowę (PZT + PAB + branże) oraz ewentualny projekt techniczny po uzyskaniu pozwolenia — zgodnie z zakresem inwestycji.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[1]],
    requiredDocuments: [
      doc("pzt", "Projekt zagospodarowania terenu", "PZT", "missing", "high", "Element dokumentacji budowlanej."),
      doc("pab", "Projekt architektoniczno-budowlany", "PAB", "missing", "high", "Opis i rysunki obiektu."),
    ],
    requiredSpecialists: [],
    risks: [],
    nextSteps: [
      {
        id: "ns-doc-1",
        order: 1,
        title: "Ustalić zakres wymaganej dokumentacji",
        description: "Na podstawie rodzaju obiektu określić wymagane branże i załączniki formalne.",
        badge: "PAB",
      },
    ],
    projectStageImpact: 10,
    confidenceLevel: "medium",
    clarificationTriggers: [],
  },
  {
    id: "rule-existing-building",
    title: "Istniejący budynek — inwentaryzacja i oceny",
    condition: (s) =>
      hasSignal(s, "buildingType", "existing") || hasSignal(s, "buildingType", "mixed"),
    professionalRecommendation:
      "Przy istniejącym budynku wymagana jest inwentaryzacja architektoniczna, ocena konstrukcyjna oraz weryfikacja wymagań przeciwpożarowych i dostępności — przed projektem rozbudowy lub przebudowy.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[1]],
    requiredDocuments: [
      doc(
        "inventory",
        "Inwentaryzacja budowlana",
        "INV",
        "missing",
        "high",
        "Podstawa projektu przebudowy lub rozbudowy."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-existing-struct",
        title: "Nieznany stan konstrukcyjny",
        description: "Ryzyko konieczności wzmocnień lub zmiany zakresu robót.",
        level: "high",
        mitigation: "Wczesna opinia konstrukcyjna na podstawie inwentaryzacji.",
        category: "existing_building",
      },
    ],
    nextSteps: [
      {
        id: "ns-ex-1",
        order: 1,
        title: "Zlecić inwentaryzację i ocenę stanu technicznego",
        description: "Obejmującą konstrukcję, instalacje i przeciwpożarowe.",
      },
    ],
    projectStageImpact: 5,
    confidenceLevel: "medium",
    clarificationTriggers: [],
  },
  {
    id: "rule-non-simple-residential",
    title: "Zabudowa mieszkaniowa inna niż prosta jednorodzinna",
    condition: (s) =>
      hasSignal(s, "buildingCategory", "multi_family") ||
      hasSignal(s, "buildingCategory", "service") ||
      hasSignal(s, "buildingCategory", "services") ||
      hasSignal(s, "buildingCategory", "office") ||
      hasSignal(s, "buildingCategory", "retail") ||
      hasSignal(s, "buildingCategory", "public") ||
      hasSignal(s, "buildingCategory", "public_utility"),
    professionalRecommendation:
      "Przy budynkach wielorodzinnych i obiektach użyteczności publicznej konieczna jest wcześniejsza koordynacja branżowa: PPOŻ, sanitarne, dostępność oraz ewentualne uzgodnienia specjalne.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[0], KNOWLEDGE_BASE_LEGAL[1]],
    requiredDocuments: [],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-coordination",
        title: "Opóźnienia koordynacji międzybranżowej",
        description: "Brak wczesnych ustaleń PPOŻ i instalacji może wymusić przeprojektowanie.",
        level: "medium",
        mitigation: "Harmonogram ustaleń branżowych równolegle z koncepcją.",
        category: "specialists",
      },
    ],
    nextSteps: [
      {
        id: "ns-coord-1",
        order: 1,
        title: "Zaplanować wczesną koordynację branżową",
        description: "PPOŻ, instalacje, dostępność — przed zamrożeniem układu funkcjonalnego.",
      },
    ],
    projectStageImpact: 5,
    confidenceLevel: "high",
    clarificationTriggers: [],
  },
  {
    id: "rule-conservation",
    title: "Ograniczenia konserwatorskie lub środowiskowe",
    condition: (s) =>
      hasSignal(s, "hasConservationConstraint", true) ||
      hasSignal(s, "hasEnvironmentalConstraint", true),
    professionalRecommendation:
      "Na terenach chronionych konserwatorsko lub środowiskowo należy uzyskać wstępne ustalenia przed rozwinięciem koncepcji — mogą one determinować kubaturę, materiały i tryb formalny.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[5], KNOWLEDGE_BASE_LEGAL[6]],
    requiredDocuments: [],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-conservation",
        title: "Odmowa lub ograniczenie zakresu robót",
        description: "Warunki konserwatorskie mogą istotnie ograniczyć koncepcję.",
        level: "high",
        mitigation: "Wczesne zapytanie do właściwego konserwatora / urzędu.",
        category: "constraints",
      },
    ],
    nextSteps: [
      {
        id: "ns-cons-1",
        order: 1,
        title: "Uzyskać wstępne ustalenia konserwatorskie / środowiskowe",
        description: "Przed przygotowaniem kosztownej dokumentacji projektowej.",
      },
    ],
    projectStageImpact: 0,
    confidenceLevel: "medium",
    clarificationTriggers: [],
  },
  {
    id: "rule-pnb-unclear",
    title: "Tryb formalny PnB vs zgłoszenie — ostrożna ocena",
    condition: (s) =>
      hasSignal(s, "formalPathUnclear", true) ||
      (hasSignal(s, "buildingCategory", "single_family") && !hasSignal(s, "formalPathConfirmed", true)),
    professionalRecommendation:
      "Tryb formalny (pozwolenie na budowę vs zgłoszenie) wymaga potwierdzenia dla konkretnego zakresu robót i obiektu. Przy niepełnych danych należy stosować sformułowania ostrożne i nie zakładać uproszczonej ścieżki bez weryfikacji.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[0]],
    requiredDocuments: [
      doc(
        "pnb",
        "Ustalenie trybu formalnego (PnB / zgłoszenie)",
        "PnB",
        "uncertain",
        "high",
        "Wymaga weryfikacji zakresu i klasyfikacji obiektu."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-formal-wrong",
        title: "Niewłaściwy tryb formalny",
        description: "Może skutkować wstrzymaniem robót lub koniecznością korekty dokumentacji.",
        level: "high",
        mitigation: "Weryfikacja w starostwie / urzędzie z uprawnieniami nadzoru budowlanego.",
        category: "formal_path",
      },
    ],
    nextSteps: [
      {
        id: "ns-pnb-1",
        order: 1,
        title: "Zweryfikować tryb formalny dla zamierzenia",
        description:
          "Na podstawie rodzaju obiektu, zakresu robót i przepisów szczególnych — bez przesądzania uproszczonej ścieżki.",
        badge: "PnB",
      },
    ],
    projectStageImpact: 0,
    confidenceLevel: "low",
    clarificationTriggers: [],
  },
  {
    id: "rule-single-family-mpzp",
    title: "Dom jednorodzinny z MPZP — ścieżka standardowa",
    condition: (s) =>
      hasSignal(s, "buildingCategory", "single_family") &&
      hasSignal(s, "planningStatus", "mpzp_exists"),
    professionalRecommendation:
      "Typowa ścieżka: wypis i wyrys z MPZP → MDCP → koncepcja/PZT → PAB i branże → ustalenie trybu formalnego → wniosek o pozwolenie na budowę lub zgłoszenie (po weryfikacji).",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[1], KNOWLEDGE_BASE_LEGAL[2]],
    requiredDocuments: [],
    requiredSpecialists: [],
    risks: [],
    nextSteps: [],
    projectStageImpact: 5,
    confidenceLevel: "high",
    clarificationTriggers: [],
  },
  {
    id: "rule-geotechnical",
    title: "Rozpoznanie geotechniczne przed fundamentami",
    condition: (s) => {
      const pt = projectType(s);
      const geo = evaluateGeotechnicalNeeds({
        projectType: pt,
        isNewBuilding: hasSignal(s, "buildingType", "new") || !hasSignal(s, "buildingType", "existing"),
        isIndustrial: hasSignal(s, "isIndustrial", true),
        isExtension: hasSignal(s, "isExtensionProject", true) || hasSignal(s, "buildingType", "existing"),
        hasGeotechnicalOpinion: hasSignal(s, "hasGeotechnicalOpinion", true),
      });
      return geo.documents.length > 0;
    },
    professionalRecommendation:
      "Zaleca się zlecenie opinii geotechnicznej i ewentualnych badań podłoża przed projektem fundamentów i konstrukcji — zgodnie ze standardem profesjonalnej koordynacji projektowej.",
    legalBasis: [
      {
        id: "geo-coordination",
        title: "Koordynacja geotechniczna",
        description:
          "Opinia geotechniczna stanowi dokument wejściowy do projektu fundamentów — szczegóły prawne do weryfikacji w aktualnych przepisach.",
        scope: "geotechnics",
        verificationRequired: true,
      },
    ],
    requiredDocuments: [
      doc(
        "geotechnical_opinion",
        "Opinia geotechniczna / rozpoznanie podłoża",
        "GEO",
        "missing",
        "critical",
        "Wymagana przed projektem fundamentów i konstrukcji nośnej."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-geotech-delay",
        title: "Opóźnienie konstrukcji bez geotechniki",
        description: "Projekt fundamentów bez rozpoznania gruntu niesie ryzyko przeprojektowania.",
        level: "high",
        mitigation: "Zlecić geotechnika równolegle z MDCP lub zaraz po niej.",
        category: "geotechnics",
      },
    ],
    nextSteps: [
      {
        id: "ns-geo-1",
        order: 1,
        title: "Zlecić rozpoznanie geotechniczne i opinię geotechniczną",
        description:
          "Przed zamrożeniem rozwiązań fundamentowych i konstrukcji — na podstawie MDCP i zakresu inwestycji.",
        badge: "GEO",
        timeframe: "2–8 tygodni",
      },
    ],
    projectStageImpact: 6,
    confidenceLevel: "high",
    clarificationTriggers: [
      {
        id: "cq-geotechnical",
        question:
          "Czy wykonano opinię geotechniczną (badania podłoża, kategoria geotechniczna, zalecenia fundamentacji) przed pracami konstrukcyjnymi?",
        reason:
          "Rozpoznanie gruntu warunkuje rodzaj fundamentów, płyt i nośność posadzek — bez tego nie należy rozwijać PAB w zakresie konstrukcji.",
        options: ["Tak — posiadam", "Nie — do zlecenia", "W trakcie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        triggerReason: "geotechnical_required",
      },
    ],
  },
  {
    id: "rule-investor-brief",
    title: "Wytyczne inwestora / brief projektowy",
    condition: (s) => {
      const pt = projectType(s);
      if (pt === "unknown") return false;
      const brief = evaluateInvestorBrief(
        pt,
        hasSignal(s, "hasInvestorBrief", true),
        hasSignal(s, "investorBriefStage", "partial")
      );
      return brief.status === "missing" || brief.status === "partial";
    },
    professionalRecommendation:
      "Przed rozwinięciem koncepcji PZT/PAB należy zebrać wytyczne inwestora (brief projektowy) jako dokument wejściowy do prac koncepcyjnych.",
    legalBasis: [
      {
        id: "brief-coordination",
        title: "Brief projektowy — dokument wejściowy",
        description:
          "Standard profesjonalnej koordynacji projektowej / dokument wejściowy do prac koncepcyjnych.",
        scope: "coordination",
        verificationRequired: false,
      },
    ],
    requiredDocuments: [
      doc(
        "investor_brief",
        "Wytyczne inwestora / brief projektowy",
        "BRIEF",
        "missing",
        "high",
        "Brak briefu zwiększa ryzyko niezgodności koncepcji z oczekiwaniami inwestora."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-brief-missing",
        title: "Koncepcja bez uzgodnionego programu",
        description: "Brak briefu może skutkować przeprojektowaniem po pierwszej wersji PAB.",
        level: "medium",
        mitigation: "Zorganizować spotkanie programowe z inwestorem przed PZT.",
        category: "coordination",
      },
    ],
    nextSteps: [
      {
        id: "ns-brief-1",
        order: 1,
        title: "Zebrać wytyczne inwestora / brief projektowy",
        description:
          "Program funkcjonalny, standard, harmonogram i wymagania specjalne — przed rozwinięciem koncepcji.",
        badge: "BRIEF",
      },
    ],
    projectStageImpact: 4,
    confidenceLevel: "medium",
    clarificationTriggers: [
      {
        id: "cq-investor-brief",
        question:
          "Czy zebrano wytyczne inwestora / brief projektowy (program funkcjonalny, standard, harmonogram) jako dokument wejściowy do koncepcji?",
        reason:
          "Brief stanowi podstawę prac koncepcyjnych — bez niego koordynator nie może rzetelnie zaplanować PZT/PAB.",
        options: ["Tak — kompletny", "Częściowo", "Nie — do zebrania", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "documentation",
        triggerReason: "investor_brief_missing",
      },
    ],
  },
  {
    id: "rule-warehouse-industrial",
    title: "Hala magazynowa / logistyka",
    condition: (s) =>
      projectType(s) === "warehouse" ||
      projectType(s) === "warehouse_service_hall" ||
      hasSignal(s, "buildingCategory", "warehouse") ||
      hasSignal(s, "buildingCategory", "warehouse_service_hall"),
    professionalRecommendation:
      "Dla hal magazynowych kluczowe są: wysokość składowania, obciążenie pożarowe i posadzki, plac manewrowy TIR, geotechnika pod płytą oraz brief logistyczny inwestora.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[1]],
    requiredDocuments: [],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-warehouse-fire",
        title: "Niedoszacowanie obciążenia pożarowego magazynu",
        description: "Wysokość regałów i klasa towaru wpływają na PPOŻ i drogi pożarowe.",
        level: "high",
        mitigation: "Wczesna konsultacja PPOŻ z briefem magazynowym.",
        category: "fire",
      },
    ],
    nextSteps: [
      {
        id: "ns-wh-1",
        order: 1,
        title: "Ustalić parametry magazynowania i placu manewrowego",
        description: "Wysokość składowania, obciążenia posadzki, TIR, drogi pożarowe.",
        badge: "LOG",
      },
    ],
    projectStageImpact: 5,
    confidenceLevel: "high",
    clarificationTriggers: [
      {
        id: "cq-storage-height",
        question:
          "Jaka jest planowana wysokość składowania (regały) i klasa magazynowego obciążenia pożarowego?",
        reason: "Parametry determinują kubaturę, PPOŻ i rozwiązania posadzki.",
        options: ["Ustalone", "Częściowo", "Nie — do ustalenia", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        triggerReason: "warehouse_storage",
      },
      {
        id: "cq-floor-slab",
        question:
          "Czy znane są wymagane obciążenia posadzki / płyty fundamentowej (wózki, regały, strefy)?",
        reason: "Obciążenia wpływają na geotechnikę, konstrukcję płyty i koszt fundamentów.",
        options: ["Tak", "Częściowo", "Nie", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "technical",
        triggerReason: "warehouse_floor",
      },
    ],
  },
  {
    id: "rule-factory-technology",
    title: "Fabryka — brief technologiczny i środowisko",
    condition: (s) =>
      projectType(s) === "factory_industrial" ||
      projectType(s) === "production_hall",
    professionalRecommendation:
      "Przy fabrykach i halach produkcyjnych wymagany jest szczegółowy brief technologiczny, ocena mediów procesowych, PPOŻ, ewentualna decyzja środowiskowa oraz geotechnika z uwzględnieniem zanieczyszczeń.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[5], KNOWLEDGE_BASE_LEGAL[6]],
    requiredDocuments: [
      doc(
        "technology_brief",
        "Brief technologiczny / wytyczne procesowe",
        "TECH",
        "missing",
        "critical",
        "Bez briefu technologicznego nie można rzetelnie zaplanować układu hali i mediów."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-tech-brief",
        title: "Brak briefu technologicznego",
        description: "Linia produkcyjna i media procesowe muszą być znane przed koncepcją.",
        level: "high",
        mitigation: "Zaprosić technologa / inwestora do warsztatu programowego.",
        category: "technology",
      },
    ],
    nextSteps: [
      {
        id: "ns-factory-1",
        order: 1,
        title: "Zebrać brief technologiczny i wymagania procesowe",
        description: "Linie, media, substancje, BHP — przed koncepcją architektoniczną.",
        badge: "TECH",
      },
    ],
    projectStageImpact: 6,
    confidenceLevel: "high",
    clarificationTriggers: [
      {
        id: "cq-technology-brief",
        question:
          "Czy dysponujecie szczegółowym briefem technologicznym (układ linii, media procesowe, substancje niebezpieczne)?",
        reason:
          "Brief technologiczny jest dokumentem wejściowym do koncepcji hali — brak szczegółów blokuje PZT/PAB.",
        options: ["Tak — kompletny", "Częściowo", "Nie — do opracowania", "Nie wiem"],
        requiredForFinalPlan: true,
        priority: "critical",
        relatedArea: "technical",
        triggerReason: "factory_technology_brief",
      },
      {
        id: "cq-hazardous-substances",
        question:
          "Czy w procesie występują substancje niebezpieczne wymagające dodatkowych rozwiązań BHP/PPOŻ (do weryfikacji)?",
        reason: "Substancje mogą wymagać dodatkowych uzgodnień i wpływają na układ stref.",
        options: ["Tak", "Nie", "Do weryfikacji", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "constraints",
        triggerReason: "factory_hazmat",
      },
      {
        id: "cq-environmental-decision",
        question:
          "Czy przeprowadzono wstępną ocenę konieczności decyzji o środowiskowych uwarunkowaniach (do weryfikacji prawnej)?",
        reason: "Inwestycje przemysłowe mogą wymagać procedury środowiskowej — wpływa na harmonogram.",
        options: ["Tak — wymagana", "Nie — wykluczona", "Do weryfikacji", "Nie wiem"],
        requiredForFinalPlan: false,
        priority: "important",
        relatedArea: "formal_path",
        triggerReason: "factory_environment",
      },
    ],
  },
  {
    id: "rule-change-of-use",
    title: "Zmiana sposobu użytkowania",
    condition: (s) =>
      hasSignal(s, "changeOfUse", true) ||
      projectType(s) === "change_of_use",
    professionalRecommendation:
      "Przy zmianie użytkowania należy zweryfikować zgodność nowej funkcji z MPZP/WZ, przeprowadzić inwentaryzację oraz dostosować PPOŻ i instalacje do nowego programu.",
    legalBasis: [KNOWLEDGE_BASE_LEGAL[1]],
    requiredDocuments: [
      doc(
        "use_change_assessment",
        "Ocena zmiany sposobu użytkowania",
        "ZSU",
        "missing",
        "high",
        "Wymagana weryfikacja formalna i techniczna nowej funkcji."
      ),
    ],
    requiredSpecialists: [],
    risks: [
      {
        id: "r-use-change-planning",
        title: "Niezgodność nowej funkcji z planem",
        description: "Zmiana z magazynu na usługi może wymagać innego przeznaczenia w MPZP.",
        level: "high",
        mitigation: "Weryfikacja wypisu z MPZP i konsultacja w organie AAB.",
        category: "planning",
      },
    ],
    nextSteps: [
      {
        id: "ns-zsu-1",
        order: 1,
        title: "Zweryfikować dopuszczalność nowej funkcji w MPZP/WZ",
        description: "Porównanie obecnego i planowanego sposobu użytkowania.",
      },
    ],
    projectStageImpact: 4,
    confidenceLevel: "medium",
    clarificationTriggers: [],
  },
];
