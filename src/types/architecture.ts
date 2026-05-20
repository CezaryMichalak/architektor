export type ConfidenceLevel = "low" | "medium" | "high";

export type ClarificationArea =
  | "planning"
  | "documentation"
  | "formal_path"
  | "specialists"
  | "existing_building"
  | "technical"
  | "constraints";

/** Domain area affected by a clarifying question (data completeness). */
export type QuestionImpactArea =
  | "planning"
  | "documentation"
  | "investor_brief"
  | "geotechnics"
  | "fire_safety"
  | "road_access"
  | "utilities"
  | "structure"
  | "environment"
  | "formal_path";

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
  /** Canonical project type key from classification layer */
  projectSubtype?: string;
  locationContext?: string;
  documentationAvailable?: string[];
  specialConstraints?: string[];
  investorBriefStage?: "missing" | "partial" | "available" | "unknown";
  geotechnicalStatus?: string;
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

export type AnalysisErrorCode =
  | "missing_api_key"
  | "ai_request_failed"
  | "invalid_json_schema"
  | "invalid_model_response"
  | "server_unavailable"
  | "sdk_error"
  | "model_not_supported"
  | "network_error";

export interface AnalysisMeta {
  source: AnalysisSource;
  usedFallback: boolean;
  aiError?: string;
  /** Machine-readable reason for fallback (dev diagnostics + UI in DEV). */
  aiErrorCode?: AnalysisErrorCode;
  fallbackReason?: string;
  /** First schema validation errors (dev UI, max 3). */
  schemaValidationErrors?: string[];
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

export type QuestionPriority = "critical" | "important" | "optional";

export interface ClarifyingQuestion {
  id: string;
  question: string;
  reason: string;
  options?: string[];
  requiredForFinalPlan: boolean;
  priority: QuestionPriority;
  /** Legacy UI grouping — kept for rules and schema compatibility. */
  relatedArea: ClarificationArea;
  impactArea: QuestionImpactArea;
  /** Points added to analysis completeness when answered (5–20). */
  impactOnCompleteness: number;
  triggerReason: string;
}

/** Rule/AI payloads may omit impact fields — filled by makeQuestion(). */
export type ClarifyingQuestionInput = Omit<
  ClarifyingQuestion,
  "impactArea" | "impactOnCompleteness"
> & {
  impactArea?: QuestionImpactArea;
  impactOnCompleteness?: number;
};

export interface ClarificationAnswer {
  questionId: string;
  answer: string;
  skipped?: boolean;
}

export interface ProjectAnalysis {
  projectType: string;
  projectStage: string;
  /** Real project/process stage (MPZP, PZT, PnB, PT) — not inflated by clarification answers. */
  advancementPercentage: number;
  /** How complete input data is for a reliable plan — rises with clarification answers. */
  analysisCompletenessPercentage: number;
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
  /** Classified investment subtype key (e.g. warehouse, multi_family) */
  projectSubtype?: string;
  investorBriefStage?: string;
  geotechnicalStatus?: string;
  investorBriefChecklist?: string[];
  meta?: AnalysisMeta;
}

export interface PreliminaryAnalysisResult {
  detectedInputs: string[];
  uncertainInputs: string[];
  missingCriticalInputs: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  analysisCompletenessPercentage: number;
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
  clarificationTriggers: ClarifyingQuestionInput[];
}

export type AppPhase =
  | "start"
  | "input"
  | "clarification"
  | "analysis";

export const DISCLAIMER_PL =
  "To jest analiza pomocnicza o charakterze organizacyjno-projektowym. Wymagania należy potwierdzić w aktualnych przepisach, lokalnej praktyce organu administracji architektoniczno-budowlanej, dokumentach planistycznych oraz na podstawie zawodowej oceny projektanta.";
