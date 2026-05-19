import { useState } from "react";
import type {
  AppPhase,
  ClarificationAnswer,
  ProjectAnalysis,
  StructuredProjectFields,
} from "./types/architecture";
import { StartScreen } from "./components/StartScreen";
import { ProjectInput } from "./components/ProjectInput";
import { ClarificationStep } from "./components/ClarificationStep";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { runHybridFinalAnalysis, runPreliminaryAnalysis } from "./lib/hybridAnalysis";
import { needsClarification } from "./lib/generateClarifyingQuestions";
import type { ClarifyingQuestion, ProjectSignal } from "./types/architecture";

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("start");
  const [samplePrompt, setSamplePrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [structured, setStructured] = useState<StructuredProjectFields>({});
  const [signals, setSignals] = useState<ProjectSignal[]>([]);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const runFinalAnalysis = async (
    p: string,
    s: StructuredProjectFields,
    answers: ClarificationAnswer[] = [],
    asked: ClarifyingQuestion[] = questions
  ) => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const { analysis: result } = await runHybridFinalAnalysis(p, s, answers, asked);
      setAnalysis(result);
      if (result.meta?.usedFallback && result.meta.aiError) {
        setAnalysisError(result.meta.aiError);
      }
      setPhase("analysis");
    } catch {
      setAnalysisError("Nie udało się wykonać analizy. Spróbuj ponownie.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleInputSubmit = (p: string, s: StructuredProjectFields) => {
    setPrompt(p);
    setStructured(s);
    const prelim = runPreliminaryAnalysis(p, s);
    setSignals(prelim.signals);
    setQuestions(prelim.clarifyingQuestions);

    if (needsClarification(prelim.signals, p.length)) {
      setPhase("clarification");
    } else {
      void runFinalAnalysis(p, s, [], prelim.clarifyingQuestions);
    }
  };

  const handleClarificationSubmit = (answers: ClarificationAnswer[]) => {
    void runFinalAnalysis(prompt, structured, answers);
  };

  const handleClarificationSkip = () => {
    void runFinalAnalysis(prompt, structured, []);
  };

  const restart = () => {
    setPhase("start");
    setSamplePrompt("");
    setPrompt("");
    setStructured({});
    setSignals([]);
    setQuestions([]);
    setAnalysis(null);
    setAnalyzing(false);
    setAnalysisError(null);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <span className="text-lg font-semibold text-navy">Architektor</span>
            <p className="text-xs text-slate-muted">
              Asystent procesu projektowego dla architektów.
            </p>
          </div>
          {phase !== "start" && (
            <button
              type="button"
              onClick={restart}
              className="text-sm text-accent-blue hover:underline"
            >
              Strona główna
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {phase === "start" && (
          <StartScreen
            onStart={() => setPhase("input")}
            onSampleSelect={(text) => {
              setSamplePrompt(text);
              setPhase("input");
            }}
          />
        )}
        {phase === "input" && (
          <ProjectInput
            initialPrompt={samplePrompt}
            onSubmit={handleInputSubmit}
            onBack={() => setPhase("start")}
          />
        )}
        {phase === "clarification" && (
          <ClarificationStep
            questions={questions}
            signals={signals}
            detectedLabels={[]}
            onSubmit={handleClarificationSubmit}
            onSkip={handleClarificationSkip}
            onBack={() => setPhase("input")}
          />
        )}
        {analyzing && (
          <p className="text-center text-sm text-slate-muted">Trwa analiza projektu…</p>
        )}
        {phase === "analysis" && analysis && !analyzing && (
          <AnalysisDashboard
            analysis={analysis}
            onRestart={restart}
            showAiError={Boolean(analysis.meta?.usedFallback || analysisError)}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-slate-muted">
        Architektor · Professional project workflow assistant for architects.
      </footer>
    </div>
  );
}
