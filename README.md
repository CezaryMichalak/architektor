# Architektor

**Professional project workflow assistant for architects.**

*Asystent procesu projektowego dla architektów.*

Architektor to profesjonalna aplikacja webowa MVP wspierająca architektów w Polsce w organizacji procesu projektowego. Analizuje opisy inwestycji w języku naturalnym (oraz opcjonalne pola strukturalne), zadaje pytania doprecyzowujące i generuje uporządkowany plan działań — na podstawie **regułowego silnika analizy** (bez zewnętrznego API AI).

## Funkcje

- Ekran startowy z przykładowymi opisami projektów
- Wprowadzanie opisu tekstowego i pól strukturalnych
- Analiza wstępna → doprecyzowanie (3–8 pytań) → plan końcowy
- Raport: status projektu, dokumenty, sekwencja działań, konsultanci, podstawy prawne, ryzyka
- Logika planistyczna: MPZP vs WZ, MDCP, etapy dokumentacji, obiekty istniejące, ograniczenia

## Stos technologiczny

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja domyślnie: [http://localhost:5173](http://localhost:5173)

## Budowanie produkcyjne

```bash
npm run build
npm run preview
```

## Przykładowy scenariusz testowy

**Wejście:**  
`Dom jednorodzinny, jest MPZP, nie mam jeszcze wypisu i wyrysu, brak mapy do celów projektowych.`

**Oczekiwane:** wykrycie domu jednorodzinnego, MPZP, brak wypisu i MDCP; brak rekomendacji WZ jako ścieżki pierwszej; rekomendacja wypisu z MPZP i MDCP; zaawansowanie ok. 25–35%.

## Struktura projektu

```
src/
  components/     # UI (StartScreen, ProjectInput, AnalysisDashboard, …)
  data/           # architectureRules, knowledgeBase, specialistMatrix
  lib/            # extractProjectSignals, mockAnalysis, …
  types/          # architecture.ts
```

## Zastrzeżenie

Analiza ma charakter organizacyjno-projektowy pomocniczy. Wymagania należy potwierdzić w aktualnych przepisach, lokalnej praktyce organu administracji architektoniczno-budowlanej oraz na podstawie zawodowej oceny projektanta.

---

© Architektor
