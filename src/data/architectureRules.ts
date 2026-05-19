import type { ArchitectureRule, ProjectSignal } from "../types/architecture";
import { KNOWLEDGE_BASE_LEGAL } from "./knowledgeBase";

function hasSignal(signals: ProjectSignal[], key: string, value?: string | boolean): boolean {
  const s = signals.find((x) => x.key === key);
  if (!s) return false;
  if (value === undefined) return true;
  return String(s.value) === String(value);
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
        question: "Czy znasz już przeznaczenie terenu i kluczowe parametry z MPZP (np. intensywność, wysokość)?",
        reason: "Parametry planistyczne determinują koncepcję i zakres dokumentacji.",
        options: ["Tak, mam ustalenia", "Częściowo", "Nie — wymagam wypisu"],
        requiredForFinalPlan: true,
        relatedArea: "planning",
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
        question: "Czy inwestycja ma charakter nowej zabudowy na działce bez obowiązującego MPZP?",
        reason: "Określa właściwość postępowania o WZ.",
        options: ["Tak", "Nie — modernizacja", "Nie wiem"],
        requiredForFinalPlan: true,
        relatedArea: "formal_path",
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
    clarificationTriggers: [
      {
        id: "cq-planning-status",
        question: "Czy na terenie inwestycji obowiązuje miejscowy plan zagospodarowania przestrzennego (MPZP)?",
        reason: "Kluczowe rozróżnienie ścieżki planistycznej.",
        options: ["Tak, MPZP obowiązuje", "Nie — brak MPZP", "Nie wiem — wymaga weryfikacji"],
        requiredForFinalPlan: true,
        relatedArea: "planning",
      },
    ],
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
    clarificationTriggers: [
      {
        id: "cq-utilities",
        question: "Czy na działce są ustalone przyłącza mediów (woda, kanalizacja, energia, gaz)?",
        reason: "Wpływa na PZT i uzgodnienia z gestorami sieci.",
        options: ["Tak — wszystkie", "Częściowo", "Nie — do uzgodnienia", "Nie wiem"],
        requiredForFinalPlan: false,
        relatedArea: "technical",
      },
      {
        id: "cq-road-access",
        question: "Jaki jest dostęp do drogi publicznej (bezpośredni, serwitut, do ustalenia)?",
        reason: "Warunek lokalizacji zjazdu i zgodności z przepisami drogowymi.",
        options: ["Bezpośredni", "Przez serwitut", "Brak — wymaga rozwiązania", "Nie wiem"],
        requiredForFinalPlan: false,
        relatedArea: "technical",
      },
    ],
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
    clarificationTriggers: [
      {
        id: "cq-building-scope",
        question: "Jaki jest zakres robót (rozbudowa, przebudowa, nadbudowa, zmiana użytkowania)?",
        reason: "Determinuje zakres dokumentacji i uzgodnień.",
        options: ["Rozbudowa", "Przebudowa", "Nadbudowa", "Zmiana użytkowania", "Kilka z powyższych"],
        requiredForFinalPlan: true,
        relatedArea: "existing_building",
      },
    ],
  },
  {
    id: "rule-non-simple-residential",
    title: "Zabudowa mieszkaniowa inna niż prosta jednorodzinna",
    condition: (s) =>
      hasSignal(s, "buildingCategory", "multi_family") ||
      hasSignal(s, "buildingCategory", "services") ||
      hasSignal(s, "buildingCategory", "public"),
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
    clarificationTriggers: [
      {
        id: "cq-constraints",
        question: "Czy inwestycja dotyczy obszaru chronionego (zabytki, Natura 2000, park krajobrazowy)?",
        reason: "Może wymagać dodatkowych procedur i opinii.",
        options: ["Tak — konserwacja", "Tak — środowisko", "Tak — oba", "Nie", "Nie wiem"],
        requiredForFinalPlan: true,
        relatedArea: "constraints",
      },
    ],
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
    clarificationTriggers: [
      {
        id: "cq-formal-path",
        question: "Czy zakres inwestycji obejmuje wyłącznie budynek mieszkalny jednorodzinny o prostym zakresie?",
        reason: "Wpływa na wstępną ocenę trybu formalnego.",
        options: ["Tak — dom jednorodzinny", "Nie — szerszy zakres", "Nie wiem"],
        requiredForFinalPlan: false,
        relatedArea: "formal_path",
      },
    ],
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
];
