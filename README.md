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

## Wdrożenie na Vercel (analiza AI)

Endpoint **`POST /api/analyze`** jest obsługiwany przez funkcję serverless `api/analyze.ts` (wspólna logika z dev w `server/analyzeHandler.ts`). Klucz OpenAI **nigdy** nie trafia do frontendu.

1. W panelu Vercel → **Settings → Environment Variables** ustaw `OPENAI_API_KEY` (oraz opcjonalnie `OPENAI_MODEL`, domyślnie `gpt-4o-mini`).
2. Po zmianie zmiennych wykonaj **Redeploy** projektu.
3. W produkcji frontend nadal woła względny URL `/api/analyze` (bez localhost).

**Test produkcji:** po deployu uruchom analizę końcową i w DevTools → Network sprawdź `POST /api/analyze` — status **200**, w odpowiedzi `ok: true` i brak regułowego fallbacku (`usedFallback: false` w meta analizy). Przy braku klucza API: `useFallback: true`, `fallbackReason: "missing_openai_api_key"`.

**Logi Vercel (Functions → `/api/analyze`):** szukaj prefiksu `[api/analyze]` — `request received`, `OPENAI_API_KEY present: true/false`, `request body parsed`, `AI pipeline started/succeeded/failed`, `returning fallback response`. Klucz API nigdy nie jest logowany.

**Oczekiwane kody HTTP:** zawsze **200** dla POST (sukces AI lub kontrolowany fallback). Wyjątek: **405** dla metod innych niż POST. Surowe **500** nie powinny występować przy typowych błędach (brak klucza, błąd OpenAI, wyjątek handlera).

**Dev lokalny:** `npm run dev` (np. `--port 3002`) — ten sam endpoint przez plugin Vite w `server/viteApiPlugin.ts`; klucz z `.env.local`.

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
