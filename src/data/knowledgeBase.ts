import type { LegalBasis } from "../types/architecture";

export const KNOWLEDGE_BASE_LEGAL: LegalBasis[] = [
  {
    id: "pb-pzp",
    title: "Prawo budowlane — pozwolenie na budowę i zgłoszenie",
    description:
      "Ustalenie trybu formalnego (pozwolenie na budowę vs zgłoszenie) zależy od rodzaju obiektu, zakresu robót oraz przepisów szczególnych. Przy niepełnej charakterystyce inwestycji należy stosować ostrożną ocenę wstępną.",
    scope: "formal_path",
    sourceRef: "Ustawa Prawo budowlane",
  },
  {
    id: "pb-dokumentacja",
    title: "Prawo budowlane — dokumentacja projektowa",
    description:
      "Projekt budowlany obejmuje m.in. projekt zagospodarowania terenu (PZT), projekt architektoniczno-budowlany (PAB) oraz branżowe opracowania w zakresie wymaganym dla danej inwestycji.",
    scope: "documentation",
    sourceRef: "Ustawa Prawo budowlane",
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
  },
  {
    id: "geo-mdcp",
    title: "Mapa do celów projektowych (MDCP)",
    description:
      "MDCP stanowi podstawę opracowania PZT i lokalizacji obiektu. Zwykle wymaga uprzedniego opracowania przez geodetę na podstawie pomiaru sytuacyjno-wysokościowego.",
    scope: "documentation",
  },
  {
    id: "ochrona-zabytkow",
    title: "Ochrona zabytków i obszarów chronionych",
    description:
      "Na terenach objętych ochroną konserwatorską lub w strefie wpływu zabytku mogą obowiązywać dodatkowe uzgodnienia i ograniczenia formalno-projektowe.",
    scope: "constraints",
    sourceRef: "Ustawa o ochronie zabytków",
  },
  {
    id: "ochrona-srodowiska",
    title: "Ochrona środowiska i Natura 2000",
    description:
      "Inwestycje w strefach chronionych lub o potencjalnym oddziaływaniu na środowisko mogą wymagać dodatkowych ustaleń, opinii lub procedur środowiskowych.",
    scope: "constraints",
  },
];

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
