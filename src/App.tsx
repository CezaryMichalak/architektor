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
import { preliminaryAnalysis, mockAnalysis } from "./lib/mockAnalysis";
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

  const runFinalAnalysis = (
    p: string,
    s: StructuredProjectFields,
    answers: ClarificationAnswer[] = [],
    asked: ClarifyingQuestion[] = questions
  ) => {
    const result = mockAnalysis(p, s, answers, asked);
    setAnalysis(result);
    setPhase("analysis");
  };

  const handleInputSubmit = (p: string, s: StructuredProjectFields) => {
    setPrompt(p);
    setStructured(s);
    const { signals: sigs, questions: qs } = preliminaryAnalysis(p, s);
    setSignals(sigs);
    setQuestions(qs);

    if (needsClarification(sigs, p.length)) {
      setPhase("clarification");
    } else {
      runFinalAnalysis(p, s, [], qs);
    }
  };

  const handleClarificationSubmit = (answers: ClarificationAnswer[]) => {
    runFinalAnalysis(prompt, structured, answers);
  };

  const handleClarificationSkip = () => {
    runFinalAnalysis(prompt, structured, []);
  };

  const restart = () => {
    setPhase("start");
    setSamplePrompt("");
    setPrompt("");
    setStructured({});
    setSignals([]);
    setQuestions([]);
    setAnalysis(null);
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
        {phase === "analysis" && analysis && (
          <AnalysisDashboard analysis={analysis} onRestart={restart} />
        )}
      </main>

      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-slate-muted">
        Architektor · Professional project workflow assistant for architects.
      </footer>
    </div>
  );
}
