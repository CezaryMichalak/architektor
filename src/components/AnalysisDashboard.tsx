import type { ProjectAnalysis } from "../types/architecture";
import { ProjectStatusCard } from "./ProjectStatusCard";
import { DetectedInputsPanel } from "./DetectedInputsPanel";
import { MissingDocumentsCard } from "./MissingDocumentsCard";
import { ActionSequence } from "./ActionSequence";
import { ConsultantTimeline } from "./ConsultantTimeline";
import { LegalBasisAccordion } from "./LegalBasisAccordion";
import { RiskRegister } from "./RiskRegister";
import { ImmediateNextStep } from "./ImmediateNextStep";
import { Disclaimer } from "./Disclaimer";

interface AnalysisDashboardProps {
  analysis: ProjectAnalysis;
  onRestart: () => void;
}

export function AnalysisDashboard({ analysis, onRestart }: AnalysisDashboardProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent-blue">Architektor</p>
          <h1 className="text-2xl font-semibold text-navy">Plan procesu projektowego</h1>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Nowa analiza
        </button>
      </div>

      <ProjectStatusCard
        projectType={analysis.projectType}
        projectStage={analysis.projectStage}
        advancementPercentage={analysis.advancementPercentage}
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
