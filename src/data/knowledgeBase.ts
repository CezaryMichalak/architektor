import type { LegalBasis } from "../types/architecture";

export type LegalSourceCategory =
  | "building_law"
  | "planning"
  | "technical_regulation"
  | "local_plan"
  | "administrative_decision"
  | "geodesy"
  | "fire_safety"
  | "environment"
  | "conservation"
  | "other";

export type LegalSourceType = "act" | "regulation" | "local_act" | "decision" | "technical_standard";

export interface LegalSourceRecord {
  id: string;
  label: string;
  category: LegalSourceCategory;
  description: string;
  sourceType: LegalSourceType;
  exactArticleAvailable: boolean;
  article?: string;
  verificationRequired: boolean;
}

export const LEGAL_SOURCES: LegalSourceRecord[] = [
  {
    id: "prawo-budowlane",
    label: "Prawo budowlane",
    category: "building_law",
    description:
      "Ustawa regulująca m.in. pozwolenie na budowę, zgłoszenie robót budowlanych oraz wymagania dotyczące dokumentacji projektowej.",
    sourceType: "act",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "ustawa-planowanie",
    label: "Ustawa o planowaniu i zagospodarowaniu przestrzennym",
    category: "planning",
    description:
      "Podstawa planowania przestrzennego, miejscowych planów zagospodarowania przestrzennego oraz warunków zabudowy.",
    sourceType: "act",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "rozporzadzenie-projekt-budowlany",
    label: "Rozporządzenie w sprawie szczegółowego zakresu i formy projektu budowlanego",
    category: "technical_regulation",
    description: "Określa zakres i formę projektu budowlanego, w tym PZT i PAB.",
    sourceType: "regulation",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "rozporzadzenie-warunki-techniczne",
    label: "Rozporządzenie w sprawie warunków technicznych, jakim powinny odpowiadać budynki i ich usytuowanie",
    category: "technical_regulation",
    description: "Wymagania techniczne dla budynków, w tym dostępność, instalacje i bezpieczeństwo.",
    sourceType: "regulation",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "mpzp-lokalna",
    label: "Lokalna uchwała o miejscowym planie zagospodarowania przestrzennego (MPZP)",
    category: "local_plan",
    description:
      "Akt planistyczny gminy określający przeznaczenie terenu i parametry zabudowy dla danej działki.",
    sourceType: "local_act",
    exactArticleAvailable: false,
    verificationRequired: true,
  },
  {
    id: "decyzja-wz",
    label: "Decyzja o warunkach zabudowy (WZ)",
    category: "administrative_decision",
    description:
      "Decyzja organu wydawana przy braku MPZP lub gdy jest wymagana do ustalenia zasad zabudowy — po weryfikacji statusu planistycznego.",
    sourceType: "decision",
    exactArticleAvailable: false,
    verificationRequired: true,
  },
  {
    id: "przepisy-geodezyjne",
    label: "Przepisy geodezyjne i kartograficzne",
    category: "geodesy",
    description: "Podstawa opracowania mapy do celów projektowych (MDCP) i materiałów geodezyjnych.",
    sourceType: "act",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "przepisy-ppoz",
    label: "Przepisy przeciwpożarowe",
    category: "fire_safety",
    description: "Wymagania ochrony przeciwpożarowej — szczególnie dla obiektów użyteczności publicznej i złożonych.",
    sourceType: "regulation",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "przepisy-srodowisko",
    label: "Przepisy ochrony środowiska",
    category: "environment",
    description: "Procedury i ograniczenia przy inwestycjach mogących oddziaływać na środowisko.",
    sourceType: "act",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
  {
    id: "przepisy-zabytki",
    label: "Przepisy ochrony zabytków",
    category: "conservation",
    description: "Dodatkowe uzgodnienia na terenach chronionych konserwatorsko.",
    sourceType: "act",
    exactArticleAvailable: false,
    verificationRequired: false,
  },
];

const SOURCE_BY_ID = new Map(LEGAL_SOURCES.map((s) => [s.id, s]));

export function getLegalSourceById(id: string): LegalSourceRecord | undefined {
  return SOURCE_BY_ID.get(id);
}

export function legalSourceToBasis(source: LegalSourceRecord): LegalBasis {
  return {
    id: source.id,
    title: source.label,
    description: source.verificationRequired
      ? `${source.description} (do weryfikacji w aktualnym stanie prawnym i dla konkretnej inwestycji)`
      : source.description,
    scope: source.category,
    sourceRef: source.exactArticleAvailable && source.article ? source.article : source.label,
    verificationRequired: source.verificationRequired,
  };
}

export const KNOWLEDGE_BASE_LEGAL: LegalBasis[] = [
  {
    id: "pb-pzp",
    title: "Prawo budowlane — pozwolenie na budowę i zgłoszenie",
    description:
      "Ustalenie trybu formalnego (pozwolenie na budowę vs zgłoszenie) zależy od rodzaju obiektu, zakresu robót oraz przepisów szczególnych. Przy niepełnej charakterystyce inwestycji należy stosować ostrożną ocenę wstępną.",
    scope: "formal_path",
    sourceRef: "Prawo budowlane",
  },
  {
    id: "pb-dokumentacja",
    title: "Prawo budowlane — dokumentacja projektowa",
    description:
      "Projekt budowlany obejmuje m.in. projekt zagospodarowania terenu (PZT), projekt architektoniczno-budowlany (PAB) oraz branżowe opracowania w zakresie wymaganym dla danej inwestycji.",
    scope: "documentation",
    sourceRef: "Prawo budowlane",
  },
  {
    id: "plan-mpzp",
    title: "Miejscowy plan zagospodarowania przestrzennego (MPZP)",
    description:
      "MPZP określa przeznaczenie terenu i parametry zabudowy. Podstawą dalszej pracy projektowej jest wypis i wyrys z MPZP (lub inne ustalenia planistyczne właściwe dla terenu).",
    scope: "planning",
    sourceRef: "Ustawa o planowaniu i zagospodarowaniu przestrzennym",
  },
  {
    id: "plan-wz",
    title: "Warunki zabudowy (WZ)",
    description:
      "WZ stosuje się tam, gdzie brak jest MPZP lub innych aktów planistycznych w zakresie wymaganym do określenia zasad zabudowy — po uprzedniej analizie statusu planistycznego terenu.",
    scope: "planning",
    sourceRef: "Ustawa o planowaniu i zagospodarowaniu przestrzennym",
    verificationRequired: true,
  },
  {
    id: "geo-mdcp",
    title: "Mapa do celów projektowych (MDCP)",
    description:
      "MDCP stanowi podstawę opracowania PZT i lokalizacji obiektu. Zwykle wymaga uprzedniego opracowania przez geodetę na podstawie pomiaru sytuacyjno-wysokościowego.",
    scope: "documentation",
    sourceRef: "Przepisy geodezyjne i kartograficzne",
  },
  {
    id: "ochrona-zabytkow",
    title: "Ochrona zabytków i obszarów chronionych",
    description:
      "Na terenach objętych ochroną konserwatorską lub w strefie wpływu zabytku mogą obowiązywać dodatkowe uzgodnienia i ograniczenia formalno-projektowe.",
    scope: "constraints",
    sourceRef: "Przepisy ochrony zabytków",
  },
  {
    id: "ochrona-srodowiska",
    title: "Ochrona środowiska i Natura 2000",
    description:
      "Inwestycje w strefach chronionych lub o potencjalnym oddziaływaniu na środowisko mogą wymagać dodatkowych ustaleń, opinii lub procedur środowiskowych.",
    scope: "constraints",
    sourceRef: "Przepisy ochrony środowiska",
  },
];

export const ALLOWED_LEGAL_IDS = new Set([
  ...LEGAL_SOURCES.map((s) => s.id),
  ...KNOWLEDGE_BASE_LEGAL.map((l) => l.id),
]);

export const DOCUMENT_DEFINITIONS = {
  mpzp_excerpt: {
    name: "Wypis i wyrys z MPZP",
    abbreviation: "MPZP",
  },
  wz_decision: {
    name: "Decyzja o warunkach zabudowy",
    abbreviation: "WZ",
  },
  mdcp: {
    name: "Mapa do celów projektowych",
    abbreviation: "MDCP",
  },
  pzt: {
    name: "Projekt zagospodarowania terenu",
    abbreviation: "PZT",
  },
  pab: {
    name: "Projekt architektoniczno-budowlany",
    abbreviation: "PAB",
  },
  pt: {
    name: "Projekt techniczny",
    abbreviation: "PT",
  },
  pnb: {
    name: "Pozwolenie na budowę / dokumentacja formalna",
    abbreviation: "PnB",
  },
} as const;

export const STAGE_LABELS: Record<string, string> = {
  concept: "Koncepcja / analiza wstępna",
  preliminary: "Etap wstępny / przygotowanie formalne",
  building_permit_docs: "Dokumentacja na pozwolenie na budowę",
  construction: "Realizacja inwestycji",
  unknown: "Etap do ustalenia",
};

export const SAMPLE_PROMPTS = [
  "Dom jednorodzinny, jest MPZP, nie mam jeszcze wypisu i wyrysu, brak mapy do celów projektowych.",
  "Budynek usługowy w strefie centrum — MPZP obowiązuje, posiadam wypis i wyrys, brak PZT.",
  "Rozbudowa istniejącego budynku mieszkalnego — status planistyczny nieznany, teren w gminie bez MPZP.",
  "Budynek wielorodzinny, MPZP, obszar konserwatorski, mam MDCP, brak uzgodnień branżowych.",
];
