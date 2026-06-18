/**
 * Declarative description of one row of the conformity results table, mapping a label and unit to
 * the overhang / lateral fields of {@link ConformityRuleResult} (either may be `null` when the row
 * only has one side). Drives the table rendering so the four near-identical value accessors and the
 * parallel units array can be replaced by a single `getValue(rule, key)` lookup.
 */
export interface ResultRow {
  label: string;
  overhangKey: keyof ConformityRuleResult | null;
  lateralKey: keyof ConformityRuleResult | null;
  unit: string;
}

export interface ConformityRuleResult {
  overhangCableAltitude: number;
  lateralCableAltitude: number;
  overhangCableLineAxisDistance: number;
  lateralCableLineAxisDistance: number;
  overhangDistanceToComply: number;
  lateralDistanceToComply: number;
  overhangComplianceAltitude: number;
  lateralComplianceLineAxisDistance: number;
  conformityCompliance: boolean;
  overhangTemperature?: number;
  lateralTemperature?: number;
  overhangWindPressure?: number;
  lateralWindPressure?: number;
  overhangMinimalDistance?: number;
  lateralMinimalDistance?: number;
}
