import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ProjectAnalysis, ConfidenceLevel } from "../types/architecture";

const CHARSET_TEST =
  "Test polskich znaków: ą ć ę ł ń ó ś ź ż Ą Ć Ę Ł Ń Ó Ś Ź Ż";

const FOOTER_TEXT = "Architektor – analiza pomocnicza, wymaga weryfikacji";

const confidenceLabels: Record<ConfidenceLevel, string> = {
  low: "Niska",
  medium: "Średnia",
  high: "Wysoka",
};

const riskLevelLabels: Record<"low" | "medium" | "high", string> = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
};

export type PdfExportOptions = {
  /** Dev-only: appends a Polish charset verification block to the PDF */
  includeCharsetTest?: boolean;
};

type PdfMakeWithVfs = typeof pdfMake & {
  vfs?: Record<string, string>;
};

function ensurePdfMakeFonts(): void {
  const maker = pdfMake as PdfMakeWithVfs;
  if (maker.vfs) return;

  const vfs =
    (pdfFonts as { pdfMake?: { vfs: Record<string, string> } }).pdfMake?.vfs ??
    (pdfFonts as Record<string, string>);
  maker.vfs = vfs;
}

function formatDate(): string {
  return new Date().toLocaleString("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function filenameDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function safeText(value: string | undefined | null, fallback = "Brak danych"): string {
  const t = value?.trim();
  return t ? t : fallback;
}

function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

function sectionHeading(title: string, pageBreakBefore = false): Content {
  return {
    text: title,
    style: "sectionHeader",
    ...(pageBreakBefore ? { pageBreak: "before" as const } : {}),
  };
}

function labelBlock(label: string, value: string): Content {
  return {
    stack: [
      { text: label.toUpperCase(), style: "label" },
      { text: value, style: "body", margin: [0, 0, 0, 6] },
    ],
  };
}

function bulletList(items: string[], emptyLabel = "Brak danych"): Content {
  const list = items.map((s) => s?.trim()).filter(Boolean) as string[];
  if (list.length === 0) {
    return { text: emptyLabel, style: "body", margin: [0, 0, 0, 8] };
  }
  return {
    ul: list.map((item) => ({ text: item, style: "body" })),
    margin: [0, 0, 0, 8],
  };
}

function buildHeader(): Content[] {
  return [
    { text: "Architektor", style: "brand" },
    { text: "Raport analizy procesu projektowego", style: "title" },
    { text: `Data wygenerowania: ${formatDate()}`, style: "subtitle", margin: [0, 0, 0, 12] },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#e2e8f0",
        },
      ],
      margin: [0, 0, 0, 16],
    },
  ];
}

function buildStatusSection(analysis: ProjectAnalysis): Content[] {
  const conf = analysis.confidenceLevel;
  const confidence =
    conf && confidenceLabels[conf] ? confidenceLabels[conf] : "Brak danych";
  const advancement =
    typeof analysis.advancementPercentage === "number"
      ? `${analysis.advancementPercentage}%`
      : "Brak danych";

  return [
    sectionHeading("Status projektu"),
    labelBlock("Typ inwestycji", safeText(analysis.projectType)),
    labelBlock("Etap procesu", safeText(analysis.projectStage)),
    labelBlock("Zaawansowanie procesu", advancement),
    labelBlock("Pewność analizy", confidence),
  ];
}

function buildDetectedSection(analysis: ProjectAnalysis): Content[] {
  return [
    sectionHeading("Dane rozpoznane"),
    bulletList(safeArray(analysis.detectedInputs)),
  ];
}

function buildUncertainSection(analysis: ProjectAnalysis): Content[] {
  return [
    sectionHeading("Dane niepewne / wymagające doprecyzowania"),
    bulletList(safeArray(analysis.uncertainInputs)),
  ];
}

function buildMissingDocsSection(analysis: ProjectAnalysis): Content[] {
  const docs = safeArray(analysis.missingDocuments);
  const content: Content[] = [sectionHeading("Brakujące / wymagane dokumenty")];

  if (docs.length === 0) {
    content.push({ text: "Brak danych", style: "body", margin: [0, 0, 0, 8] });
    return content;
  }

  for (const doc of docs) {
    content.push(
      { text: safeText(doc?.name), style: "legalTitle" },
      {
        text: `Powód: ${safeText(doc?.reason)}`,
        style: "body",
        margin: [0, 0, 0, 10],
      },
    );
  }
  return content;
}

function buildActionsSection(analysis: ProjectAnalysis): Content[] {
  const actions = safeArray(analysis.recommendedActions).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const content: Content[] = [sectionHeading("Rekomendowana sekwencja działań")];

  if (actions.length === 0) {
    content.push({ text: "Brak danych", style: "body", margin: [0, 0, 0, 8] });
    return content;
  }

  for (const action of actions) {
    const num = action.order ?? 0;
    const deps = safeArray(action.dependsOn).filter(Boolean);
    const stack: Content[] = [
      {
        text: `${num}. ${safeText(action.title)}`,
        style: "actionTitle",
      },
      { text: safeText(action.description), style: "body" },
    ];
    if (deps.length > 0) {
      stack.push({
        text: `Zależności: ${deps.join(", ")}`,
        style: "body",
        italics: true,
        margin: [0, 4, 0, 0],
      });
    }
    content.push({ stack, margin: [0, 0, 0, 10] });
  }
  return content;
}

function buildSpecialistsSection(analysis: ProjectAnalysis): Content[] {
  const specs = safeArray(analysis.specialists);
  const content: Content[] = [
    sectionHeading("Branżyści i kolejność zaangażowania", true),
  ];

  if (specs.length === 0) {
    content.push({ text: "Brak danych", style: "body", margin: [0, 0, 0, 8] });
    return content;
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ["*", "auto", "*", "*", "*"],
      body: [
        [
          { text: "Branża / rola", style: "tableHeader" },
          { text: "Kiedy", style: "tableHeader" },
          { text: "Uzasadnienie", style: "tableHeader" },
          { text: "Wejście", style: "tableHeader" },
          { text: "Wynik", style: "tableHeader" },
        ],
        ...specs.map((s) => [
          {
            stack: [
              { text: safeText(s?.discipline), style: "body" },
              { text: safeText(s?.role), style: "body", italics: true },
            ],
          },
          safeText(s?.whenNeeded),
          safeText(s?.reason),
          safeText(s?.inputRequired),
          safeText(s?.outputDeliverable),
        ]),
      ],
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f1f5f9" : null),
      hLineColor: () => "#e2e8f0",
      vLineColor: () => "#e2e8f0",
    },
    margin: [0, 0, 0, 12],
  });

  return content;
}

function legalVerificationNote(verificationRequired?: boolean): string {
  return verificationRequired
    ? "Wymaga weryfikacji w aktualnych przepisach i dokumentach planistycznych."
    : "Odniesienie ogólne — bez szczegółowych numerów artykułów w tym raporcie.";
}

function buildLegalSection(analysis: ProjectAnalysis): Content[] {
  const items = safeArray(analysis.legalBasis);
  const content: Content[] = [
    sectionHeading("Podstawy prawne i planistyczne", true),
  ];

  if (items.length === 0) {
    content.push({ text: "Brak danych", style: "body", margin: [0, 0, 0, 8] });
    return content;
  }

  for (const item of items) {
    const blocks: Content[] = [
      { text: safeText(item?.title), style: "legalTitle" },
      { text: `Kategoria: ${safeText(item?.scope)}`, style: "body" },
      { text: safeText(item?.description), style: "body", margin: [0, 4, 0, 4] },
    ];
    if (item?.sourceRef?.trim()) {
      blocks.push({
        text: `Źródło: ${item.sourceRef.trim()}`,
        style: "body",
        margin: [0, 0, 0, 4],
      });
    }
    blocks.push({
      text: `Uwaga weryfikacyjna: ${legalVerificationNote(item?.verificationRequired)}`,
      style: "body",
      margin: [0, 0, 0, 12],
    });
    content.push({ stack: blocks });
  }
  return content;
}

function buildRisksSection(analysis: ProjectAnalysis): Content[] {
  const risks = safeArray(analysis.risks);
  const content: Content[] = [sectionHeading("Ryzyka i zależności", true)];

  if (risks.length === 0) {
    content.push({ text: "Brak danych", style: "body", margin: [0, 0, 0, 8] });
    return content;
  }

  for (const risk of risks) {
    const severity =
      risk?.level && riskLevelLabels[risk.level]
        ? riskLevelLabels[risk.level]
        : "Brak danych";
    content.push({
      stack: [
        {
          text: `${safeText(risk?.title)} (${severity})`,
          style: "legalTitle",
        },
        { text: safeText(risk?.description), style: "body", margin: [0, 4, 0, 4] },
        { text: `Mitigacja: ${safeText(risk?.mitigation)}`, style: "body" },
      ],
      margin: [0, 0, 0, 10],
    });
  }
  return content;
}

function buildNextStepSection(analysis: ProjectAnalysis): Content[] {
  const step = safeText(analysis.immediateNextStep);
  return [
    sectionHeading("Najbliższy rekomendowany krok", true),
    {
      table: {
        widths: ["*"],
        body: [[{ text: step, style: "nextStepBox", border: [false, false, false, false] }]],
      },
      layout: {
        fillColor: () => "#eff6ff",
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#bfdbfe",
        vLineColor: () => "#bfdbfe",
        paddingLeft: () => 12,
        paddingRight: () => 12,
        paddingTop: () => 10,
        paddingBottom: () => 10,
      },
      margin: [0, 0, 0, 16],
    },
  ];
}

function buildDisclaimerSection(analysis: ProjectAnalysis): Content[] {
  return [
    sectionHeading("Zastrzeżenie"),
    {
      text: safeText(analysis.disclaimer, "Brak treści zastrzeżenia."),
      style: "body",
      margin: [0, 0, 0, 8],
    },
  ];
}

function buildInvestorBriefSection(analysis: ProjectAnalysis): Content[] | null {
  if (!analysis.investorBriefStage && !analysis.investorBriefChecklist?.length) {
    return null;
  }
  const statusMap: Record<string, string> = {
    missing: "Brak / do zebrania",
    partial: "Częściowy",
    available: "Dostępny",
    unknown: "Nieznany",
    not_applicable: "Nie dotyczy",
  };
  const status = analysis.investorBriefStage
    ? statusMap[analysis.investorBriefStage] ?? analysis.investorBriefStage
    : "Brak danych";

  return [
    sectionHeading("Wytyczne inwestora / brief projektowy", true),
    labelBlock("Status briefu", status),
    ...(analysis.investorBriefChecklist?.length
      ? [
          {
            text: "Checklist briefu:",
            style: "label" as const,
            margin: [0, 4, 0, 2] as [number, number, number, number],
          },
          bulletList(analysis.investorBriefChecklist),
        ]
      : []),
  ];
}

function buildGeotechnicalSection(analysis: ProjectAnalysis): Content[] | null {
  if (!analysis.geotechnicalStatus) return null;
  const statusMap: Record<string, string> = {
    not_considered: "Nie rozważano",
    recommended: "Zalecane",
    required_before_structure: "Wymagane przed konstrukcją",
    available: "Dostępna opinia",
    unknown: "Do ustalenia",
  };
  const status = statusMap[analysis.geotechnicalStatus] ?? analysis.geotechnicalStatus;

  return [
    sectionHeading("Geotechnika", true),
    labelBlock("Status rozpoznania geotechnicznego", status),
    {
      text:
        "Opinia geotechniczna zalecana przed projektem fundamentów i konstrukcji — szczegóły prawne do weryfikacji.",
      style: "body",
      margin: [0, 0, 0, 8],
    },
  ];
}

function buildDocumentDefinition(
  analysis: ProjectAnalysis,
  options?: PdfExportOptions,
): TDocumentDefinitions {
  const content: Content[] = [
    ...buildHeader(),
    ...buildStatusSection(analysis),
    ...buildDetectedSection(analysis),
    ...buildUncertainSection(analysis),
    ...buildMissingDocsSection(analysis),
    ...buildActionsSection(analysis),
    ...buildSpecialistsSection(analysis),
    ...buildLegalSection(analysis),
    ...buildRisksSection(analysis),
    ...(buildInvestorBriefSection(analysis) ?? []),
    ...(buildGeotechnicalSection(analysis) ?? []),
    ...buildNextStepSection(analysis),
    ...buildDisclaimerSection(analysis),
  ];

  if (import.meta.env.DEV && options?.includeCharsetTest) {
    content.push(
      sectionHeading("Test zestawu znaków (dev)"),
      { text: CHARSET_TEST, style: "body", margin: [0, 0, 0, 8] },
    );
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 56],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#374151",
    },
    styles: {
      brand: { fontSize: 10, bold: true, color: "#2563eb" },
      title: { fontSize: 16, bold: true, color: "#0f172a" },
      subtitle: { fontSize: 9, color: "#64748b" },
      sectionHeader: { fontSize: 12, bold: true, color: "#1e293b", margin: [0, 12, 0, 6] },
      label: { fontSize: 8, bold: true, color: "#64748b" },
      body: { fontSize: 9, color: "#374151", lineHeight: 1.25 },
      actionTitle: { fontSize: 10, bold: true, color: "#2563eb" },
      legalTitle: { fontSize: 9, bold: true, color: "#1e293b" },
      tableHeader: { fontSize: 8, bold: true, color: "#1e293b", fillColor: "#f1f5f9" },
      nextStepBox: { fontSize: 10, bold: true, color: "#1e40af" },
    },
    footer: (currentPage, pageCount) => ({
      margin: [40, 8, 40, 0],
      columns: [
        {
          text: FOOTER_TEXT,
          fontSize: 7,
          color: "#64748b",
          width: "*",
        },
        {
          text: `Strona ${currentPage} z ${pageCount}`,
          fontSize: 7,
          color: "#64748b",
          alignment: "right",
          width: "auto",
        },
      ],
    }),
    content,
  };
}

export function exportProjectAnalysisToPdf(
  analysis: ProjectAnalysis,
  options?: PdfExportOptions,
): void {
  ensurePdfMakeFonts();
  const docDefinition = buildDocumentDefinition(analysis, options);
  pdfMake.createPdf(docDefinition).download(`architektor-raport-${filenameDate()}.pdf`);
}

/** Dev-only: minimal PDF to verify Polish diacritics in the browser */
export function exportCharsetTestPdf(): void {
  if (!import.meta.env.DEV) return;

  ensurePdfMakeFonts();
  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 56],
    defaultStyle: { font: "Roboto", fontSize: 11 },
    content: [
      { text: "Architektor — test PDF", style: { bold: true, fontSize: 14 } },
      { text: CHARSET_TEST, margin: [0, 16, 0, 0] },
    ],
    footer: () => ({
      text: FOOTER_TEXT,
      fontSize: 7,
      color: "#64748b",
      margin: [40, 0, 40, 0],
    }),
  };
  pdfMake.createPdf(docDefinition).download(`architektor-charset-test-${filenameDate()}.pdf`);
}
