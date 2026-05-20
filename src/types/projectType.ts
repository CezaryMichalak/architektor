/** Canonical investment / building function types for Architektor workflows. */
export type SecondaryFunctionKey = "office_social";

export type ProjectTypeKey =
  | "single_family"
  | "multi_family"
  | "service"
  | "office"
  | "retail"
  | "warehouse"
  | "warehouse_service_hall"
  | "production_hall"
  | "factory_industrial"
  | "public_utility"
  | "extension_reconstruction"
  | "change_of_use"
  | "unknown";

export type ComplexityTierHint = "simple" | "standard" | "complex" | "very_complex";

export type InvestorBriefStatus = "missing" | "partial" | "available" | "not_applicable" | "unknown";

export type GeotechnicalStatus =
  | "not_considered"
  | "recommended"
  | "required_before_structure"
  | "available"
  | "unknown";

export interface ProjectTypeEntry {
  key: ProjectTypeKey;
  labelPl: string;
  keyConcerns: string[];
  typicalSpecialists: string[];
  clarificationTopics: string[];
  actionPlanTemplate: string[];
  complexityTier: ComplexityTierHint;
}
