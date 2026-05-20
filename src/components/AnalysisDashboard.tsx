import { useState } from "react";
import type { ProjectAnalysis } from "../types/architecture";
import { exportProjectAnalysisToPdf } from "../lib/exportToPdf";
import { ProjectStatusCard } from "./ProjectStatusCard";
import { DetectedInputsPanel } from "./DetectedInputsPanel";
import { MissingDocumentsCard } from "./MissingDocumentsCard";
import { ActionSequence } from "./ActionSequence";
import { ConsultantTimeline } from "./ConsultantTimeline";
import { LegalBasisAccordion } from "./LegalBasisAccordion";
import { RiskRegister } from "./RiskRegister";
import { ImmediateNextStep } from "./ImmediateNextStep";
import { Disclaimer } from "./Disclaimer";
import { AnalysisStatusBadges } from "./AnalysisStatusBadges";

interface AnalysisDashboardProps {
  analysis: ProjectAnalysis;
  onRestart: () => void;
  showAiError?: boolean;
}

export function AnalysisDashboard({ analysis, onRestart, showAiError }: AnalysisDashboardProps) {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canExport = Boolean(analysis?.projectType?.trim());

  const handleExportPdf = () => {
    try {
      setPdfError(null);
      exportProjectAnalysisToPdf(analysis);
    } catch {
      setPdfError("Nie udało się wygenerować PDF. Spróbuj ponownie.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent-blue">Architektor</p>
          <h1 className="text-2xl font-semibold text-navy">Plan procesu projektowego</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!canExport}
            aria-label="Pobierz raport analizy jako PDF"
            className="rounded-lg border border-accent-blue bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Pobierz raport PDF
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Nowa analiza
          </button>
        </div>
      </div>

      {pdfError && (
        <p className="text-sm text-red-600" role="alert">
          {pdfError}
        </p>
      )}

      <AnalysisStatusBadges meta={analysis.meta} showAiError={showAiError} />

      <ProjectStatusCard
        projectType={analysis.projectType}
        projectStage={analysis.projectStage}
        advancementPercentage={analysis.advancementPercentage}
        analysisCompletenessPercentage={analysis.analysisCompletenessPercentage}
        confidenceLevel={analysis.confidenceLevel}
      />

      <ImmediateNextStep step={analysis.immediateNextStep} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetectedInputsPanel
          detected={analysis.detectedInputs}
          uncertain={analysis.uncertainInputs}
        />
        <MissingDocumentsCard documents={analysis.missingDocuments} />
      </div>

      <ActionSequence actions={analysis.recommendedActions} />
      <ConsultantTimeline specialists={analysis.specialists} />

      <div className="grid gap-6 lg:grid-cols-2">
        <LegalBasisAccordion items={analysis.legalBasis} />
        <RiskRegister risks={analysis.risks} />
      </div>

      {analysis.clarifyingQuestionsAsked.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Podsumowanie doprecyzowań</h2>
          <ul className="space-y-3">
            {analysis.clarifyingQuestionsAsked.map((q) => (
              <li key={q.id} className="text-sm">
                <p className="font-medium text-graphite">{q.question}</p>
                <p className="text-slate-muted">{q.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer text={analysis.disclaimer} />
    </div>
  );
}
