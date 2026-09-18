import { LEVEL2_RATES, requireWholeKrone, roundWholeKrone } from './ruleset';
import type { HolidayPayResult, HolidayPayTotals } from './types';

export function calculateHolidayPay(
  employeeId: string,
  holidayEligibleSalary: number,
  taxRate: number,
): HolidayPayResult {
  requireWholeKrone(holidayEligibleSalary, 'holidayEligibleSalary');
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new RangeError('taxRate must be between 0 and 100');
  }

  const grossHolidayPay = roundWholeKrone(holidayEligibleSalary * LEVEL2_RATES.holidayPayPercent / 100);
  const amContribution = roundWholeKrone(grossHolidayPay * LEVEL2_RATES.amPercent / 100);
  const taxBase = grossHolidayPay - amContribution;
  const aTax = roundWholeKrone(taxBase * taxRate / 100);
  const netHolidayPay = grossHolidayPay - amContribution - aTax;

  return Object.freeze({
    employeeId,
    holidayEligibleSalary,
    taxRate,
    grossHolidayPay,
    amContribution,
    taxBase,
    aTax,
    netHolidayPay,
  });
}

export function sumHolidayPay(results: readonly HolidayPayResult[]): HolidayPayTotals {
  return Object.freeze({
    grossHolidayPay: results.reduce((sum, result) => sum + result.grossHolidayPay, 0),
    amContribution: results.reduce((sum, result) => sum + result.amContribution, 0),
    aTax: results.reduce((sum, result) => sum + result.aTax, 0),
    netHolidayPay: results.reduce((sum, result) => sum + result.netHolidayPay, 0),
  });
}
