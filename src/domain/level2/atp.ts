import { LEVEL2_RATES, requireWholeKrone } from './ruleset';

export interface AtpSummary {
  readonly employeeCount: number;
  readonly months: number;
  readonly employeeShare: number;
  readonly employerShare: number;
  readonly total: number;
}

export function calculateAtp(employeeCount: number, months = 1): AtpSummary {
  requireWholeKrone(employeeCount, 'employeeCount');
  requireWholeKrone(months, 'months');
  const employeeShare = employeeCount * months * LEVEL2_RATES.employeeAtp;
  const employerShare = employeeCount * months * LEVEL2_RATES.employerAtp;
  return Object.freeze({ employeeCount, months, employeeShare, employerShare, total: employeeShare + employerShare });
}
