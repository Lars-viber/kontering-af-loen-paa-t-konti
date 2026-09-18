export const LEVEL2_RULESET_YEAR = 2026 as const;
export const LEVEL2_RULESET_VERSION = 1 as const;
export const LEVEL2_GENERATOR_VERSION = 1 as const;

export const LEVEL2_RATES = Object.freeze({
  employeePensionPercent: 4,
  employerPensionPercent: 8,
  employeeAtp: 99,
  employerAtp: 198,
  amPercent: 8,
  holidayPayPercent: 12.5,
} as const);

function requireNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(label + ' must be a non-negative finite number');
  }
}

/**
 * Case-specific whole-krone rounding. Positive half values round up,
 * matching the Math.round semantics used to freeze R1.
 */
export function roundWholeKrone(value: number): number {
  requireNonNegativeFinite(value, 'amount');
  return Math.floor(value + 0.5);
}

export function requireWholeKrone(value: number, label: string): void {
  requireNonNegativeFinite(value, label);
  if (!Number.isInteger(value)) throw new RangeError(label + ' must be a whole-krone integer');
}
