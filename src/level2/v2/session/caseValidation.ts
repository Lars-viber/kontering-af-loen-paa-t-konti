import { canonicalStringify } from '../../../domain/level2/canonical';
import { buildV2AnswerKey, buildV2SourceCase } from '../../../domain/level2/v2/caseBuilder';
import {
  V2_GENERATOR_VERSION,
  V2_MONTHS,
  V2_RULESET_VERSION,
  V2_RULESET_YEAR,
} from '../../../domain/level2/v2/constants';
import type { V2MonthId } from '../../../domain/level2/v2/types';
import type { V2RuntimeValidationResult, V2SessionCaseSnapshot } from './types';
import {
  hasExactKeys,
  hasStep,
  isPlainRecord,
  isSafeWhole,
} from './validationUtils';

const SEED_PREFIX = 'payroll-level2:ruleset-2026-v2:generator-v2:';
const MONTH_KEYS = [...V2_MONTHS];

function validateHourlyEmployee(value: unknown, index: number): boolean {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, ['id', 'hourlyRate', 'taxRate', 'monthlyDeduction', 'hours'])) return false;
  if (value.id !== 'T' + (index + 1)) return false;
  if (!isSafeWhole(value.hourlyRate) || !hasStep(value.hourlyRate, 200, 300, 5)) return false;
  if (!isSafeWhole(value.taxRate) || !hasStep(value.taxRate, 36, 42, 1)) return false;
  if (!isSafeWhole(value.monthlyDeduction) ||
      !hasStep(value.monthlyDeduction, 4000, 6000, 250)) return false;
  if (!isPlainRecord(value.hours) || !hasExactKeys(value.hours, MONTH_KEYS)) return false;
  const hours = value.hours;
  return MONTH_KEYS.every(month =>
    isSafeWhole(hours[month]) && hasStep(hours[month] as number, 125, 180, 1),
  );
}

function validateSalariedEmployee(value: unknown, index: number): boolean {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, ['id', 'monthlySalary', 'taxRate', 'monthlyDeduction'])) return false;
  if (value.id !== 'M' + (index + 1)) return false;
  if (!isSafeWhole(value.monthlySalary) || !hasStep(value.monthlySalary, 38000, 65000, 500)) {
    return false;
  }
  if (!isSafeWhole(value.taxRate) || !hasStep(value.taxRate, 36, 42, 1)) return false;
  return isSafeWhole(value.monthlyDeduction) &&
    hasStep(value.monthlyDeduction, 4000, 6000, 250);
}

function validateInputs(value: unknown): boolean {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, [
        'employeeCounts', 'hourlyEmployees', 'salariedEmployees', 'holidayLiability', 'bank',
      ])) return false;
  const { employeeCounts, hourlyEmployees, salariedEmployees, holidayLiability, bank } = value;
  if (!isPlainRecord(employeeCounts) ||
      !hasExactKeys(employeeCounts, ['hourly', 'salaried'])) return false;
  if (!isSafeWhole(employeeCounts.hourly) || !hasStep(employeeCounts.hourly, 3, 6, 1)) return false;
  if (!isSafeWhole(employeeCounts.salaried) || !hasStep(employeeCounts.salaried, 3, 6, 1)) {
    return false;
  }
  if (!Array.isArray(hourlyEmployees) || hourlyEmployees.length !== employeeCounts.hourly ||
      !hourlyEmployees.every(validateHourlyEmployee)) return false;
  if (!Array.isArray(salariedEmployees) || salariedEmployees.length !== employeeCounts.salaried ||
      !salariedEmployees.every(validateSalariedEmployee)) return false;

  if (!isPlainRecord(holidayLiability) ||
      !hasExactKeys(holidayLiability, [
        'factorPercent',
        'yearStartLiability',
        'monthlyAdjustments',
        'holidayLiabilityBeforeAdjustment',
        'systemAssessedHolidayLiability',
      ])) return false;
  if (!isSafeWhole(holidayLiability.factorPercent) ||
      !hasStep(holidayLiability.factorPercent, 70, 100, 5)) return false;
  if (!isSafeWhole(holidayLiability.yearStartLiability) ||
      !isSafeWhole(holidayLiability.holidayLiabilityBeforeAdjustment) ||
      !isSafeWhole(holidayLiability.systemAssessedHolidayLiability)) return false;
  if (!isPlainRecord(holidayLiability.monthlyAdjustments) ||
      !hasExactKeys(holidayLiability.monthlyAdjustments, MONTH_KEYS)) return false;
  const monthlyAdjustments = holidayLiability.monthlyAdjustments;
  if (!MONTH_KEYS.every(month =>
    isSafeWhole(monthlyAdjustments[month]) &&
    hasStep(monthlyAdjustments[month] as number, 2000, 10000, 500)
  )) return false;

  if (!isPlainRecord(bank) ||
      !hasExactKeys(bank, ['requiredCash', 'buffer', 'bankStart'])) return false;
  if (!isSafeWhole(bank.requiredCash) || !isSafeWhole(bank.bankStart)) return false;
  return isSafeWhole(bank.buffer) && hasStep(bank.buffer, 250000, 750000, 50000);
}

function sumAdjustments(
  adjustments: Readonly<Record<V2MonthId, number>>,
  months: readonly V2MonthId[],
): number {
  return months.reduce((sum, month) => sum + adjustments[month], 0);
}

export function validateV2SessionCaseSnapshot(
  value: unknown,
): V2RuntimeValidationResult<V2SessionCaseSnapshot> {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, [
        'variant', 'seed', 'drawCount', 'rulesetYear', 'rulesetVersion',
        'generatorVersion', 'inputs', 'source', 'answers',
      ])) return { ok: false };
  if (!isSafeWhole(value.variant, 1) || value.variant > 999999) return { ok: false };
  if (value.seed !== SEED_PREFIX + value.variant) return { ok: false };
  if (
    value.rulesetYear !== V2_RULESET_YEAR ||
    value.rulesetVersion !== V2_RULESET_VERSION ||
    value.generatorVersion !== V2_GENERATOR_VERSION
  ) return { ok: false };
  if (!validateInputs(value.inputs)) return { ok: false };

  const snapshot = value as unknown as V2SessionCaseSnapshot;
  const { hourly, salaried } = snapshot.inputs.employeeCounts;
  if (snapshot.drawCount !== 10 + 9 * hourly + 3 * salaried) return { ok: false };

  const holiday = snapshot.inputs.holidayLiability;
  const monthlySalariedGross = snapshot.inputs.salariedEmployees
    .reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const expectedYearStart =
    Math.floor(monthlySalariedGross * holiday.factorPercent / 100 / 1000 + 0.5) * 1000;
  const adjustmentYtdMay = sumAdjustments(holiday.monthlyAdjustments, V2_MONTHS.slice(0, 5));
  if (
    holiday.yearStartLiability !== expectedYearStart ||
    holiday.holidayLiabilityBeforeAdjustment !== expectedYearStart + adjustmentYtdMay ||
    holiday.systemAssessedHolidayLiability !==
      holiday.holidayLiabilityBeforeAdjustment + holiday.monthlyAdjustments.jun
  ) return { ok: false };

  try {
    const buildInput = {
      hourlyEmployees: snapshot.inputs.hourlyEmployees,
      salariedEmployees: snapshot.inputs.salariedEmployees,
      holidayLiabilityAdjustmentYtdMay: adjustmentYtdMay,
      juneHolidayLiabilityAdjustment: holiday.monthlyAdjustments.jun,
      holidayLiabilityBeforeAdjustment: holiday.holidayLiabilityBeforeAdjustment,
      systemAssessedHolidayLiability: holiday.systemAssessedHolidayLiability,
      bankStartBalance: snapshot.inputs.bank.bankStart,
    };
    const expectedSource = buildV2SourceCase(buildInput);
    const expectedAnswers = buildV2AnswerKey(expectedSource, buildInput);
    if (
      canonicalStringify(snapshot.source) !== canonicalStringify(expectedSource) ||
      canonicalStringify(snapshot.answers) !== canonicalStringify(expectedAnswers)
    ) return { ok: false };

    const requiredCash = expectedAnswers.documents
      .flatMap(document => document.expectedPostings)
      .filter(posting => posting.accountNumber === '5820' && posting.side === 'credit')
      .reduce((sum, posting) => sum + posting.amount, 0);
    const expectedBankStart =
      Math.ceil((requiredCash + snapshot.inputs.bank.buffer) / 50000) * 50000;
    if (
      snapshot.inputs.bank.requiredCash !== requiredCash ||
      snapshot.inputs.bank.bankStart !== expectedBankStart
    ) return { ok: false };
  } catch {
    return { ok: false };
  }

  return { ok: true, value: snapshot };
}
