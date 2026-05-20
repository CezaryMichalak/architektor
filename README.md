# Architektor

**Architektor** is a professional project workflow assistant for architects in Poland. It analyses early-stage architectural project descriptions, identifies missing input data, asks clarification questions, recommends the sequence of design and formal actions, suggests consultants, highlights risks, and generates a PDF project process report.

*Created by Michalak Labs.*

## What Architektor does

- analyses natural-language project descriptions,
- detects project type and stage,
- identifies missing input documents,
- asks clarification questions,
- separates real project advancement from analysis and data completeness,
- recommends project workflow steps,
- suggests consultants and discipline designers,
- highlights formal, technical and coordination risks,
- provides general legal and planning reference points,
- exports a professional PDF report.

## Key features

- AI-powered analysis,
- rule-based fallback,
- clarification flow,
- project advancement indicator,
- analysis completeness indicator,
- professional PDF export,
- project-type-specific logic,
- geotechnics, investor brief, MPZP and MDCP handling,
- Vercel deployment,
- server-side API endpoint for OpenAI.

## Important disclaimer

Architektor is an organisational and professional workflow support tool. It does not provide binding legal advice and does not replace the architect’s professional judgement, the local architectural and construction administration authority, legal counsel or current legal verification. All outputs should be verified against current regulations, local planning documents, administrative practice and project-specific conditions.

## Tech stack

- React
- Vite
- TypeScript
- OpenAI API
- Vercel serverless API route
- pdfmake (PDF export)
- GitHub + Vercel deployment

## Local development

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` (copy from `.env.local.example`):

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:

```bash
npm run dev -- --port 3002
```

5. Open [http://localhost:3002](http://localhost:3002)

**Do not commit `.env.local`.** Only `.env.local.example` belongs in the repository (with a placeholder key).

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Server-side key used by `/api/analyze` to call the AI model. |

The key must **never** be exposed to frontend code. Configure it locally in `.env.local` and in **Vercel → Project Settings → Environment Variables**.

Optional: `OPENAI_MODEL` (default: `gpt-4o-mini`).

## Deployment

Deploy on Vercel:

1. Import the GitHub repository into Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variable `OPENAI_API_KEY`.
6. Redeploy after adding or changing environment variables.

Production AI endpoint: **`POST /api/analyze`**

## Project workflow

1. User enters a project description.
2. App performs preliminary signal extraction.
3. App asks clarification questions if needed.
4. AI generates project workflow analysis.
5. Domain rules validate and enrich the output.
6. App shows project status, missing data, consultants, risks and next steps.
7. User can export the report to PDF.

## Example prompts

**Example 1**

Projekt dotyczy budowy nowej hali magazynowo-usługowej z częścią biurowo-socjalną. Główną funkcją będzie magazynowanie towarów na regałach wysokiego składowania oraz obsługa dostaw samochodami ciężarowymi. Działka jest objęta MPZP, ale brak wypisu i wyrysu, brak MDCP, brak badań geotechnicznych i brak pełnego briefu technologiczno-logistycznego.

**Example 2**

Projekt dotyczy przebudowy i rozbudowy istniejącego budynku usługowego na potrzeby przychodni rehabilitacyjnej. Brak aktualnej inwentaryzacji, brak oceny konstrukcji, brak MDCP, brak rozpoznania geotechnicznego i nieznane warunki przyłączenia mediów.

**Example 3**

Projekt dotyczy budowy domu jednorodzinnego wolnostojącego z garażem dwustanowiskowym. Działka jest objęta MPZP, inwestor posiada wypis i wyrys, ale nie zamówiono MDCP i nie wykonano badań geotechnicznych.

## Current status

**MVP / v1**

Implemented:

- AI analysis,
- fallback rules,
- clarification questions,
- PDF export,
- Vercel deployment,
- professional project workflow reporting.

## Roadmap

- improve project-type-specific rule matrices,
- expand legal and planning knowledge base,
- add saved projects,
- add user accounts,
- add editable reports,
- add custom office templates,
- add richer consultant matrices,
- add project history and comparison.

## About Michalak Labs

Michalak Labs is an independent AI-focused web application studio building practical tools for professionals. The studio focuses on workflow automation, decision support, intelligent reporting and modern web applications powered by new technologies.

*Michalak Labs to autorskie studio tworzące aplikacje webowe oparte na nowych technologiach i AI, wspierające profesjonalistów w automatyzacji pracy, analizie procesów i generowaniu praktycznych raportów.*

---

**Architektor by Michalak Labs**
