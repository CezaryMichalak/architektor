import { getProjectTypeEntry } from "../data/projectTypeMatrix";

import type { ProjectSignal, StructuredProjectFields } from "../types/architecture";

import type { ComplexityTierHint, ProjectTypeKey, SecondaryFunctionKey } from "../types/projectType";

import {

  inferSecondaryFunctions,

  inferWarehouseSubtype,

  isOfficePrimary,

  isWarehouseDominant,

  OFFICE_PRIMARY_PATTERNS,

  WAREHOUSE_PRIMARY_PATTERNS,

  SINGLE_FAMILY_PATTERNS,

  WAREHOUSE_SERVICE_HALL_PATTERNS,

} from "./projectTypePatterns";



export interface ProjectClassification {

  projectType: ProjectTypeKey;

  labelPl: string;

  confidence: "low" | "medium" | "high";

  complexityTier: ComplexityTierHint;

  isNewBuilding: boolean;

  isExtension: boolean;

  isChangeOfUse: boolean;

  isIndustrial: boolean;

  secondaryFunctions: SecondaryFunctionKey[];

}



function getSignalValue(

  signals: ProjectSignal[],

  key: string

): string | boolean | number | undefined {

  return signals.find((s) => s.key === key)?.value;

}



function hasSignal(

  signals: ProjectSignal[],

  key: string,

  value?: string | boolean

): boolean {

  const v = getSignalValue(signals, key);

  if (v === undefined) return false;

  if (value === undefined) return true;

  return String(v) === String(value);

}



const CATEGORY_TO_TYPE: Record<string, ProjectTypeKey> = {

  single_family: "single_family",

  multi_family: "multi_family",

  services: "service",

  service: "service",

  office: "office",

  retail: "retail",

  commercial: "retail",

  warehouse: "warehouse",

  warehouse_service_hall: "warehouse_service_hall",

  production_hall: "production_hall",

  hall: "production_hall",

  industrial: "factory_industrial",

  factory: "factory_industrial",

  factory_industrial: "factory_industrial",

  public: "public_utility",

  public_utility: "public_utility",

};



const TEXT_TYPE_PATTERNS: Array<{ type: ProjectTypeKey; patterns: RegExp[] }> = [

  { type: "single_family", patterns: SINGLE_FAMILY_PATTERNS },

  { type: "multi_family", patterns: [/wielorodzinny/i, /budynek\s+mieszkalny\s+wiel/i, /mieszkaniówka/i] },

  {

    type: "warehouse_service_hall",

    patterns: WAREHOUSE_SERVICE_HALL_PATTERNS,

  },

  {

    type: "warehouse",

    patterns: WAREHOUSE_PRIMARY_PATTERNS,

  },

  { type: "production_hall", patterns: [/hala\s+produkcyjn/i, /hala\s+produkcyjna/i] },

  { type: "factory_industrial", patterns: [/fabryk/i, /zakład\s+produkcyjny/i, /linia\s+produkcyjn/i] },

  { type: "office", patterns: OFFICE_PRIMARY_PATTERNS },

  { type: "retail", patterns: [/handlow/i, /centrum\s+handlow/i, /sklep/i, /retail/i] },

  {

    type: "service",

    patterns: [/budynek\s+usługow/i, /obiekt\s+usługow/i, /(?<!magazynowo[-\s])usługow/i],

  },

  { type: "public_utility", patterns: [/użyteczności\s+publicznej/i, /szkoł/i, /przedszkol/i, /urząd/i] },

];



function applyWarehouseOfficePriority(

  projectType: ProjectTypeKey,

  prompt: string,

  confidence: ProjectClassification["confidence"]

): { projectType: ProjectTypeKey; confidence: ProjectClassification["confidence"] } {

  const warehouseSubtype = inferWarehouseSubtype(prompt);

  if (warehouseSubtype) {

    return { projectType: warehouseSubtype, confidence: "high" };

  }

  if (isWarehouseDominant(prompt) && (projectType === "office" || projectType === "service")) {

    return { projectType: "warehouse", confidence: "high" };

  }

  if (projectType === "office" && !isOfficePrimary(prompt)) {

    return { projectType: "unknown", confidence: "low" };

  }

  return { projectType, confidence };

}



/**

 * Classify investment type from signals, free-text prompt, and optional structured fields.

 * Priority: change_of_use > extension > explicit projectSubtype > buildingCategory > text patterns.

 * Warehouse / hala / TIR keywords override office; biurowo-socjalna → secondary only.

 */

export function classifyProjectType(

  signals: ProjectSignal[],

  prompt = "",

  structuredFields?: StructuredProjectFields

): ProjectClassification {

  const buildingType = String(getSignalValue(signals, "buildingType") ?? "");

  const isExtension =

    buildingType === "existing" ||

    buildingType === "mixed" ||

    /rozbudow|przebudow|nadbudow|modernizac/i.test(prompt);

  const isChangeOfUse =

    hasSignal(signals, "changeOfUse", true) || /zmiana\s+(sposobu\s+)?użytkowania/i.test(prompt);



  let projectType: ProjectTypeKey = "unknown";

  let confidence: ProjectClassification["confidence"] = "low";



  if (isChangeOfUse) {

    projectType = "change_of_use";

    confidence = "high";

  } else if (isExtension && !isChangeOfUse) {

    projectType = "extension_reconstruction";

    confidence = /rozbudow|przebudow|istniejący/i.test(prompt) ? "high" : "medium";

  }



  const subtype = String(

    getSignalValue(signals, "projectSubtype") ??

      structuredFields?.buildingCategory ??

      ""

  );

  if (projectType === "unknown" && subtype) {

    const mapped = CATEGORY_TO_TYPE[subtype.toLowerCase()] ?? CATEGORY_TO_TYPE[subtype];

    if (mapped) {

      projectType = mapped;

      confidence = "high";

    }

  }



  const category = String(getSignalValue(signals, "buildingCategory") ?? "");

  if (projectType === "unknown" && category) {

    const mapped = CATEGORY_TO_TYPE[category];

    if (mapped) {

      projectType = mapped;

      confidence =

        category === "warehouse" ||

        category === "warehouse_service_hall" ||

        category === "production_hall"

          ? "high"

          : "medium";

    }

  }



  if (

    (projectType === "service" || projectType === "office") &&

    isWarehouseDominant(prompt)

  ) {

    projectType = inferWarehouseSubtype(prompt) ?? "warehouse";

    confidence = "high";

  }



  if (projectType === "unknown") {

    for (const { type, patterns } of TEXT_TYPE_PATTERNS) {

      if (patterns.some((p) => p.test(prompt))) {

        projectType = type;

        confidence = "medium";

        break;

      }

    }

  }



  const adjusted = applyWarehouseOfficePriority(projectType, prompt, confidence);

  projectType = adjusted.projectType;

  confidence = adjusted.confidence;



  const secondaryFunctions = inferSecondaryFunctions(prompt) as SecondaryFunctionKey[];

  const entry = getProjectTypeEntry(projectType);

  const isIndustrial = [

    "warehouse",

    "warehouse_service_hall",

    "production_hall",

    "factory_industrial",

  ].includes(projectType);



  return {

    projectType,

    labelPl: entry.labelPl,

    confidence,

    complexityTier: entry.complexityTier,

    isNewBuilding: buildingType === "new" || (!isExtension && !isChangeOfUse && buildingType !== "existing"),

    isExtension,

    isChangeOfUse,

    isIndustrial,

    secondaryFunctions,

  };

}



export function addClassificationSignals(

  signals: ProjectSignal[],

  classification: ProjectClassification

): ProjectSignal[] {

  const out = [...signals];

  const add = (

    key: string,

    label: string,

    value: string | boolean | number,

    confidence: ProjectSignal["confidence"] = "high"

  ) => {

    const idx = out.findIndex((s) => s.key === key);

    const entry: ProjectSignal = {

      key,

      label,

      value,

      source: "inferred",

      confidence,

    };

    if (idx >= 0) out[idx] = entry;

    else out.push(entry);

  };



  add("projectSubtype", "Typ inwestycji (sklasyfikowany)", classification.projectType, classification.confidence);

  add("projectTypeLabel", "Etykieta typu inwestycji", classification.labelPl, classification.confidence);

  add("isIndustrial", "Obiekt przemysłowy/logistyczny", classification.isIndustrial, "high");

  if (classification.secondaryFunctions.length > 0) {

    add(

      "secondaryFunctions",

      "Funkcje towarzyszące",

      classification.secondaryFunctions.join(", "),

      classification.confidence

    );

  }

  if (classification.isExtension) {

    add("isExtensionProject", "Rozbudowa / przebudowa", true, "high");

  }

  if (classification.isChangeOfUse) {

    add("isChangeOfUseProject", "Zmiana użytkowania", true, "high");

  }



  return out;

}


