import { LEVEL2_ACCOUNTS } from '../../domain/level2/accounts';
import { balancesOf, buildLevel2Case, LEVEL2_MONTHS } from '../../domain/level2/caseBuilder';
import { canonicalStringify } from '../../domain/level2/canonical';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from '../../domain/level2/ruleset';
import { LEVEL2_ACCOUNT_NUMBERS, LEVEL2_DOCUMENT_IDS } from '../../domain/level2/types';
import type { Level2CaseSnapshot, RuntimeValidationResult } from './types';
import { hasExactKeys, hasStep, isOneOf, isPlainRecord, isSafeWhole } from './validationUtils';

const SEED_PREFIX = 'payroll-level2:ruleset-2026-v1:generator-v1:';
const MONTH_KEYS = [...LEVEL2_MONTHS];
const ACCOUNT_SET = new Set<string>(LEVEL2_ACCOUNT_NUMBERS);

function validateHourlyEmployee(value: unknown, index: number): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['id', 'hourlyRate', 'taxRate', 'monthlyDeduction', 'hours'])) return false;
  if (value.id !== 'T' + (index + 1)) return false;
  if (!isSafeWhole(value.hourlyRate) || !hasStep(value.hourlyRate, 200, 300, 5)) return false;
  if (!isSafeWhole(value.taxRate) || !hasStep(value.taxRate, 36, 42, 1)) return false;
  if (!isSafeWhole(value.monthlyDeduction) || !hasStep(value.monthlyDeduction, 4000, 6000, 250)) return false;
  if (!isPlainRecord(value.hours) || !hasExactKeys(value.hours, MONTH_KEYS)) return false;
  const hours = value.hours;
  return MONTH_KEYS.every(month => isSafeWhole(hours[month]) && hasStep(hours[month] as number, 125, 180, 1));
}

function validateSalariedEmployee(value: unknown, index: number): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['id', 'monthlySalary', 'taxRate', 'monthlyDeduction'])) return false;
  if (value.id !== 'M' + (index + 1)) return false;
  if (!isSafeWhole(value.monthlySalary) || !hasStep(value.monthlySalary, 38000, 65000, 500)) return false;
  if (!isSafeWhole(value.taxRate) || !hasStep(value.taxRate, 36, 42, 1)) return false;
  return isSafeWhole(value.monthlyDeduction) && hasStep(value.monthlyDeduction, 4000, 6000, 250);
}

function validateInputs(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['employeeCounts', 'hourlyEmployees', 'salariedEmployees', 'holidayLiability', 'bank'])) return false;
  const { employeeCounts, hourlyEmployees, salariedEmployees, holidayLiability, bank } = value;
  if (!isPlainRecord(employeeCounts) || !hasExactKeys(employeeCounts, ['hourly', 'salaried'])) return false;
  if (!isSafeWhole(employeeCounts.hourly) || !hasStep(employeeCounts.hourly, 3, 6, 1)) return false;
  if (!isSafeWhole(employeeCounts.salaried) || !hasStep(employeeCounts.salaried, 3, 6, 1)) return false;
  if (!Array.isArray(hourlyEmployees) || hourlyEmployees.length !== employeeCounts.hourly) return false;
  if (!Array.isArray(salariedEmployees) || salariedEmployees.length !== employeeCounts.salaried) return false;
  if (!hourlyEmployees.every(validateHourlyEmployee) || !salariedEmployees.every(validateSalariedEmployee)) return false;

  if (!isPlainRecord(holidayLiability) || !hasExactKeys(holidayLiability, [
    'factorPercent', 'yearStartLiability', 'monthlyAdjustments',
    'holidayLiabilityBeforeAdjustment', 'systemAssessedHolidayLiability',
  ])) return false;
  if (!isSafeWhole(holidayLiability.factorPercent) || !hasStep(holidayLiability.factorPercent, 70, 100, 5)) return false;
  if (!isSafeWhole(holidayLiability.yearStartLiability)) return false;
  if (!isPlainRecord(holidayLiability.monthlyAdjustments) || !hasExactKeys(holidayLiability.monthlyAdjustments, MONTH_KEYS)) return false;
  const monthlyAdjustments = holidayLiability.monthlyAdjustments;
  if (!MONTH_KEYS.every(month => isSafeWhole(monthlyAdjustments[month]) &&
    hasStep(monthlyAdjustments[month] as number, 2000, 10000, 500))) return false;
  if (!isSafeWhole(holidayLiability.holidayLiabilityBeforeAdjustment) ||
    !isSafeWhole(holidayLiability.systemAssessedHolidayLiability)) return false;

  if (!isPlainRecord(bank) || !hasExactKeys(bank, ['requiredCash', 'buffer', 'bankStart'])) return false;
  if (!isSafeWhole(bank.requiredCash) || !isSafeWhole(bank.bankStart)) return false;
  return isSafeWhole(bank.buffer) && hasStep(bank.buffer, 250000, 750000, 50000);
}

function validateDocumentAndBalanceInvariants(snapshot: Level2CaseSnapshot): boolean {
  if (LEVEL2_ACCOUNTS.some((account, index) => account.accountNumber !== LEVEL2_ACCOUNT_NUMBERS[index])) return false;
  const documents = snapshot.derived.documents;
  if (documents.length !== LEVEL2_DOCUMENT_IDS.length) return false;
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    if (document.id !== LEVEL2_DOCUMENT_IDS[index] || !document.balanced || document.debitTotal !== document.creditTotal) return false;
    let debit = 0;
    let credit = 0;
    for (const posting of document.expectedPostings) {
      if (posting.documentId !== document.id || !ACCOUNT_SET.has(posting.accountNumber)) return false;
      if (!isOneOf(posting.side, ['debit', 'credit'] as const) || !isSafeWhole(posting.amount, 1)) return false;
      if (posting.side === 'debit') debit += posting.amount;
      else credit += posting.amount;
    }
    if (!Number.isSafeInteger(debit) || debit !== document.debitTotal || credit !== document.creditTotal) return false;
  }

  for (const documentId of ['B4', 'B7']) {
    const document = documents.find(candidate => candidate.id === documentId);
    if (!document?.expectedPostings.some(posting =>
      posting.accountNumber === '5820' && posting.side === 'credit' && posting.text === 'Nettoløn')) return false;
  }
  if (LEVEL2_ACCOUNTS.some(account => account.name.toLocaleLowerCase('da').includes('skyldig løn'))) return false;

  for (const balances of [snapshot.derived.startBalances, snapshot.derived.checkpointBalances, snapshot.derived.finalBalances]) {
    if (balances.length !== LEVEL2_ACCOUNT_NUMBERS.length) return false;
    if (balances.some((balance, index) => balance.accountNumber !== LEVEL2_ACCOUNT_NUMBERS[index] ||
      !isSafeWhole(balance.amount) || !isOneOf(balance.side, ['debit', 'credit', 'zero'] as const) ||
      (balance.amount === 0) !== (balance.side === 'zero'))) return false;
  }
  const checkpointAtp = snapshot.derived.checkpointBalances.find(balance => balance.accountNumber === '6921');
  const finalAtp = snapshot.derived.finalBalances.find(balance => balance.accountNumber === '6921');
  const finalHoliday = snapshot.derived.finalBalances.find(balance => balance.accountNumber === '6924');
  return Boolean(checkpointAtp && checkpointAtp.amount > 0 && finalAtp && finalAtp.amount >= 0 && finalHoliday && finalHoliday.amount >= 0);
}

export function validateLevel2CaseSnapshot(value: unknown): RuntimeValidationResult<Level2CaseSnapshot> {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    'variant', 'seed', 'rulesetYear', 'rulesetVersion', 'generatorVersion', 'inputs', 'derived',
  ])) return { ok: false };
  if (!isSafeWhole(value.variant, 1) || value.variant > 999999) return { ok: false };
  if (value.seed !== SEED_PREFIX + value.variant) return { ok: false };
  if (value.rulesetYear !== LEVEL2_RULESET_YEAR || value.rulesetVersion !== LEVEL2_RULESET_VERSION ||
    value.generatorVersion !== LEVEL2_GENERATOR_VERSION) return { ok: false };
  if (!validateInputs(value.inputs) || !isPlainRecord(value.derived) || !hasExactKeys(value.derived, [
    'history', 'atp', 'startBalances', 'documents', 'checkpointBalances',
    'ytdSpecification', 'checkpoint', 'finalBalances',
  ])) return { ok: false };

  const snapshot = value as unknown as Level2CaseSnapshot;
  const holiday = snapshot.inputs.holidayLiability;
  const monthlySalary = snapshot.inputs.salariedEmployees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const expectedYearStart = Math.floor(monthlySalary * holiday.factorPercent / 100 / 1000 + 0.5) * 1000;
  const throughMay = LEVEL2_MONTHS.slice(0, 5).reduce((sum, month) => sum + holiday.monthlyAdjustments[month], 0);
  if (holiday.yearStartLiability !== expectedYearStart ||
    holiday.holidayLiabilityBeforeAdjustment !== holiday.yearStartLiability + throughMay ||
    holiday.systemAssessedHolidayLiability !== holiday.holidayLiabilityBeforeAdjustment + holiday.monthlyAdjustments.jun) {
    return { ok: false };
  }

  try {
    const rebuilt = buildLevel2Case({
      hourlyEmployees: snapshot.inputs.hourlyEmployees,
      salariedEmployees: snapshot.inputs.salariedEmployees,
      holidayLiabilityBeforeAdjustment: holiday.holidayLiabilityBeforeAdjustment,
      holidayLiabilityAdjustmentYtdMay: throughMay,
      juneHolidayLiabilityAdjustment: holiday.monthlyAdjustments.jun,
      bankStartBalance: snapshot.inputs.bank.bankStart,
    });
    const expectedDerived: Level2CaseSnapshot['derived'] = {
      history: LEVEL2_MONTHS.map(month => rebuilt.history[month]),
      atp: rebuilt.atp,
      startBalances: rebuilt.startBalances,
      documents: rebuilt.documents,
      checkpointBalances: balancesOf(rebuilt.checkpointLedger),
      ytdSpecification: rebuilt.ytdSpecification,
      checkpoint: rebuilt.checkpoint,
      finalBalances: balancesOf(rebuilt.finalLedger),
    };
    if (canonicalStringify(snapshot.derived) !== canonicalStringify(expectedDerived)) return { ok: false };
    const requiredCash = rebuilt.documents.flatMap(document => document.expectedPostings)
      .filter(posting => posting.accountNumber === '5820' && posting.side === 'credit')
      .reduce((sum, posting) => sum + posting.amount, 0);
    if (snapshot.inputs.bank.requiredCash !== requiredCash ||
      snapshot.inputs.bank.bankStart !== Math.ceil((requiredCash + snapshot.inputs.bank.buffer) / 50000) * 50000) return { ok: false };
    if (!validateDocumentAndBalanceInvariants(snapshot)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, value: snapshot };
}

