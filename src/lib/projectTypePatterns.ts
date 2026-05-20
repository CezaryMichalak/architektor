/** Shared keyword patterns for warehouse / office classification. */

export const WAREHOUSE_SERVICE_HALL_PATTERNS = [
  /hala\s+magazynowo[-\s]?usługow/i,
  /magazynowo[-\s]?usługow/i,
];

export const WAREHOUSE_PRIMARY_PATTERNS = [
  /hala\s+magazynow/i,
  /\bmagazyn\b/i,
  /wysokie\s+składowanie/i,
  /regał[yó]?\s+wysokiego\s+składowania/i,
  /składowanie\s+towarów/i,
  /\bdok\b/i,
  /\btir\b/i,
  /plac\s+manewrow/i,
  /ruch\s+samochodów\s+ciężarowych/i,
  /samochodów\s+ciężarowych/i,
];

/** Office as primary — excludes biurowo-socjal (secondary part of warehouse halls). */
export const OFFICE_PRIMARY_PATTERNS = [
  /budynek\s+biurow/i,
  /\bbiurowy\b/i,
  /\bbiurowe\b/i,
  /program\s+biurow/i,
];

export const OFFICE_SOCIAL_SECONDARY_PATTERNS = [
  /biurowo[-\s]?socjal/i,
  /biuro[-\s]?socjal/i,
  /części[aą]\s+biurow/i,
  /socjaln/i,
];

export function isWarehouseDominant(text: string): boolean {
  return (
    WAREHOUSE_SERVICE_HALL_PATTERNS.some((p) => p.test(text)) ||
    WAREHOUSE_PRIMARY_PATTERNS.some((p) => p.test(text))
  );
}

export function inferWarehouseSubtype(
  text: string
): "warehouse_service_hall" | "warehouse" | null {
  if (WAREHOUSE_SERVICE_HALL_PATTERNS.some((p) => p.test(text))) {
    return "warehouse_service_hall";
  }
  if (WAREHOUSE_PRIMARY_PATTERNS.some((p) => p.test(text))) {
    return "warehouse";
  }
  return null;
}

export function inferSecondaryFunctions(text: string): string[] {
  const fns: string[] = [];
  if (OFFICE_SOCIAL_SECONDARY_PATTERNS.some((p) => p.test(text))) {
    fns.push("office_social");
  }
  return fns;
}

export function isOfficePrimary(text: string): boolean {
  if (isWarehouseDominant(text)) return false;
  return OFFICE_PRIMARY_PATTERNS.some((p) => p.test(text));
}
