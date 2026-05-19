export type ConfidenceLevel = "low" | "medium" | "high";

export type ClarificationArea =
  | "planning"
  | "documentation"
  | "formal_path"
  | "specialists"
  | "existing_building"
  | "technical"
  | "constraints";

export type ProjectStage =
  | "concept"
  | "preliminary"
  | "building_permit_docs"
  | "construction"
  | "unknown";

export type PlanningStatus =
  | "mpzp_exists"
  | "no_mpzp"
  | "unknown"
  | "wz_path";

export interface StructuredProjectFields {
  investmentType?: string;
  projectStage?: string;
  planningStatus?: string;
  buildingType?: "new" | "existing" | "mixed" | "unknown";
  buildingCategory?: string;
  locationContext?: string;
  documentationAvailable?: string[];
  specialConstraints?: string[];
}

export interface ProjectSignal {
  key: string;
  label: string;
  value: string | boolean | number;
  source: "text" | "structured" | "inferred" | "clarification";
  confidence: ConfidenceLevel;
}

export interface RequiredDocument {
  id: string;
  name: string;
  abbreviation?: string;
  status: "missing" | "partial" | "available" | "uncertain";
  priority: "critical" | "high" | "medium";
  reason: string;
  relatedStage?: string;
}

export interface SpecialistRecommendation {
  id: string;
  discipline: string;
  role: string;
  whenNeeded: string;
  inputRequired: string;
  outputDeliverable: string;
  priority: "essential" | "recommended" | "conditional";
  reason: string;
}

export interface LegalBasis {
  id: string;
  title: string;
  description: string;
  scope: string;
  sourceRef?: string;
  verificationRequired?: boolean;
}

export type AnalysisSource = "ai" | "rules";

export interface AnalysisMeta {
  source: AnalysisSource;
  usedFallback: boolean;
  aiError?: string;
  needsClarification: boolean;
  verifyLegalBasis: boolean;
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  level: "low" | "medium" | "high";
  mitigation: string;
  category: string;
}

export interface ActionStep {
  id: string;
  order: number;
  title: string;
  description: string;
  responsible?: string;
  dependsOn?: string[];
  badge?: string;
  timeframe?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  reason: string;
  options?: string[];
  requiredForFinalPlan: boolean;
  relatedArea: ClarificationArea;
}

export interface ClarificationAnswer {
  questionId: string;
  answer: string;
  skipped?: boolean;
}

export interface ProjectAnalysis {
  projectType: string;
  projectStage: string;
  advancementPercentage: number;
  confidenceLevel: ConfidenceLevel;
  detectedInputs: string[];
  uncertainInputs: string[];
  missingDocuments: RequiredDocument[];
  recommendedActions: ActionStep[];
  specialists: SpecialistRecommendation[];
  legalBasis: LegalBasis[];
  risks: RiskItem[];
  clarifyingQuestionsAsked: ClarifyingQuestion[];
  immediateNextStep: string;
  disclaimer: string;
  meta?: AnalysisMeta;
}

export interface PreliminaryAnalysisResult {
  detectedInputs: string[];
  uncertainInputs: string[];
  missingCriticalInputs: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  canGenerateFinalPlan: boolean;
  signals: ProjectSignal[];
}

export interface ArchitectureRule {
  id: string;
  title: string;
  condition: (signals: ProjectSignal[]) => boolean;
  professionalRecommendation: string;
  legalBasis: LegalBasis[];
  requiredDocuments: RequiredDocument[];
  requiredSpecialists: SpecialistRecommendation[];
  risks: RiskItem[];
  nextSteps: ActionStep[];
  projectStageImpact: number;
  confidenceLevel: ConfidenceLevel;
  clarificationTriggers: ClarifyingQuestion[];
}

export type AppPhase =
  | "start"
  | "input"
  | "clarification"
  | "analysis";

export const DISCLAIMER_PL =
  "To jest analiza pomocnicza o charakterze organizacyjno-projektowym. Wymagania należy potwierdzić w aktualnych przepisach, lokalnej praktyce organu administracji architektoniczno-budowlanej, dokumentach planistycznych oraz na podstawie zawodowej oceny projektanta.";
