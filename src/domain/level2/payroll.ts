import { LEVEL2_RATES, requireWholeKrone, roundWholeKrone } from './ruleset';
import type { PayrollInput, PayrollResult, PayrollTotals } from './types';

export function calculatePayroll(input: PayrollInput): PayrollResult {
  requireWholeKrone(input.grossSalary, 'grossSalary');
  requireWholeKrone(input.monthlyDeduction, 'monthlyDeduction');
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) {
    throw new RangeError('taxRate must be between 0 and 100');
  }

  const employeePension = roundWholeKrone(input.grossSalary * LEVEL2_RATES.employeePensionPercent / 100);
  const employerPension = roundWholeKrone(input.grossSalary * LEVEL2_RATES.employerPensionPercent / 100);
  const employeeAtp = LEVEL2_RATES.employeeAtp;
  const employerAtp = LEVEL2_RATES.employerAtp;
  const amBase = input.grossSalary - employeePension - employeeAtp;
  const amContribution = roundWholeKrone(amBase * LEVEL2_RATES.amPercent / 100);

  // Defensive rule for future fixtures: an exhausted deduction gives zero,
  // never negative, A-tax.
  const taxBase = Math.max(0, amBase - amContribution - input.monthlyDeduction);
  const aTax = roundWholeKrone(taxBase * input.taxRate / 100);
  const netPay = amBase - amContribution - aTax;

  return Object.freeze({
    ...input,
    employeePension,
    employerPension,
    employeeAtp,
    employerAtp,
    amBase,
    amContribution,
    taxBase,
    aTax,
    netPay,
  });
}

export function sumPayroll(results: readonly PayrollResult[]): PayrollTotals {
  const sum = (key: keyof PayrollResult): number =>
    results.reduce((total, result) => total + (typeof result[key] === 'number' ? result[key] : 0), 0);

  return Object.freeze({
    grossSalary: sum('grossSalary'),
    employeePension: sum('employeePension'),
    employerPension: sum('employerPension'),
    employeeAtp: sum('employeeAtp'),
    employerAtp: sum('employerAtp'),
    amBase: sum('amBase'),
    amContribution: sum('amContribution'),
    aTax: sum('aTax'),
    netPay: sum('netPay'),
  });
}
