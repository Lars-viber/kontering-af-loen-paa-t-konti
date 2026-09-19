import { canonicalStringify } from '../canonical';
import {
  createMulberry32,
  fnv1a32,
  randomInt,
  type Level2RandomSource,
} from '../generator';
import { deepFreezeLevel2 } from '../readonly';
import { buildV2AnswerKey, buildV2SourceCase, type V2CaseBuildInput } from './caseBuilder';
import { V2_GENERATOR_VERSION, V2_MONTHS, V2_RULESET_VERSION, V2_RULESET_YEAR } from './constants';
import { getV2Balance } from './helpers';
import type {
  V2AnswerKey,
  V2HourlyEmployee,
  V2MonthId,
  V2SalariedEmployee,
  V2SourceCase,
} from './types';
import { assertV2Contract } from './validation';

export const V2_VARIANT_MIN = 1 as const;
export const V2_VARIANT_MAX = 999999 as const;
export const V2_SEED_PREFIX = 'payroll-level2:ruleset-2026-v2:generator-v2:' as const;

export interface GeneratedV2HolidayLiabilityInput {
  readonly factorPercent: number;
  readonly yearStartLiability: number;
  readonly monthlyAdjustments: Readonly<Record<V2MonthId, number>>;
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly systemAssessedHolidayLiability: number;
}

export interface GeneratedV2BankInput {
  readonly requiredCash: number;
  readonly buffer: number;
  readonly bankStart: number;
}

export interface GeneratedV2Inputs {
  readonly employeeCounts: { readonly hourly: number; readonly salaried: number };
  readonly hourlyEmployees: readonly V2HourlyEmployee[];
  readonly salariedEmployees: readonly V2SalariedEmployee[];
  readonly holidayLiability: GeneratedV2HolidayLiabilityInput;
  readonly bank: GeneratedV2BankInput;
}

export interface GeneratedV2Case {
  readonly variant: number;
  readonly seed: string;
  readonly drawCount: number;
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 2;
  readonly generatorVersion: 2;
  readonly inputs: GeneratedV2Inputs;
  readonly source: V2SourceCase;
  readonly answers: V2AnswerKey;
}

export function isValidV2Variant(variant: number): boolean {
  return Number.isInteger(variant) && variant >= V2_VARIANT_MIN && variant <= V2_VARIANT_MAX;
}

export function v2SeedString(variant: number): string {
  if (!isValidV2Variant(variant)) throw new RangeError('V2.1 variant must be an integer from 1 to 999999');
  return V2_SEED_PREFIX + variant;
}

function randomStep(random: Level2RandomSource, min: number, max: number, step: number): number {
  const steps = (max - min) / step;
  if (!Number.isInteger(steps)) throw new Error('Generator range does not align with step');
  return min + randomInt(random, 0, steps) * step;
}

function roundToNearestThousand(value: number): number {
  return Math.floor(value / 1000 + 0.5) * 1000;
}

function roundUpToFiftyThousand(value: number): number {
  return Math.ceil(value / 50000) * 50000;
}

function generateHourlyEmployees(count: number, random: Level2RandomSource): readonly V2HourlyEmployee[] {
  return Array.from({ length: count }, (_, offset) => deepFreezeLevel2({
    id: 'T' + (offset + 1),
    hourlyRate: randomStep(random, 200, 300, 5),
    taxRate: randomInt(random, 36, 42),
    monthlyDeduction: randomStep(random, 4000, 6000, 250),
    hours: {
      jan: randomInt(random, 125, 180),
      feb: randomInt(random, 125, 180),
      mar: randomInt(random, 125, 180),
      apr: randomInt(random, 125, 180),
      may: randomInt(random, 125, 180),
      jun: randomInt(random, 125, 180),
    },
  }));
}

function generateSalariedEmployees(count: number, random: Level2RandomSource): readonly V2SalariedEmployee[] {
  return Array.from({ length: count }, (_, offset) => Object.freeze({
    id: 'M' + (offset + 1),
    monthlySalary: randomStep(random, 38000, 65000, 500),
    taxRate: randomInt(random, 36, 42),
    monthlyDeduction: randomStep(random, 4000, 6000, 250),
  }));
}

function sumAdjustments(adjustments: Readonly<Record<V2MonthId, number>>, months: readonly V2MonthId[]): number {
  return months.reduce((sum, month) => sum + adjustments[month], 0);
}

function requiredBankCash(answers: V2AnswerKey): number {
  return answers.documents.flatMap(document => document.expectedPostings)
    .filter(posting => posting.accountNumber === '5820' && posting.side === 'credit')
    .reduce((sum, posting) => sum + posting.amount, 0);
}

export function expectedV2DrawCount(hourlyCount: number, salariedCount: number): number {
  return 10 + 9 * hourlyCount + 3 * salariedCount;
}

function caseBuildInput(
  inputs: Omit<GeneratedV2Inputs, 'bank'>,
  bankStartBalance: number,
): V2CaseBuildInput {
  return {
    hourlyEmployees: inputs.hourlyEmployees,
    salariedEmployees: inputs.salariedEmployees,
    holidayLiabilityAdjustmentYtdMay: sumAdjustments(inputs.holidayLiability.monthlyAdjustments, V2_MONTHS.slice(0, 5)),
    juneHolidayLiabilityAdjustment: inputs.holidayLiability.monthlyAdjustments.jun,
    holidayLiabilityBeforeAdjustment: inputs.holidayLiability.holidayLiabilityBeforeAdjustment,
    systemAssessedHolidayLiability: inputs.holidayLiability.systemAssessedHolidayLiability,
    bankStartBalance,
  };
}

export function generateV2CaseWithRandom(variant: number, random: Level2RandomSource): GeneratedV2Case {
  const seed = v2SeedString(variant);
  let drawCount = 0;
  const trackedRandom = (): number => {
    drawCount += 1;
    return random();
  };
  const hourlyCount = randomInt(trackedRandom, 3, 6);
  const salariedCount = randomInt(trackedRandom, 3, 6);
  const hourlyEmployees = generateHourlyEmployees(hourlyCount, trackedRandom);
  const salariedEmployees = generateSalariedEmployees(salariedCount, trackedRandom);
  const factorPercent = randomStep(trackedRandom, 70, 100, 5);
  const monthlyAdjustments = deepFreezeLevel2({
    jan: randomStep(trackedRandom, 2000, 10000, 500),
    feb: randomStep(trackedRandom, 2000, 10000, 500),
    mar: randomStep(trackedRandom, 2000, 10000, 500),
    apr: randomStep(trackedRandom, 2000, 10000, 500),
    may: randomStep(trackedRandom, 2000, 10000, 500),
    jun: randomStep(trackedRandom, 2000, 10000, 500),
  });
  const buffer = randomStep(trackedRandom, 250000, 750000, 50000);
  const monthlySalariedGross = salariedEmployees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const yearStartLiability = roundToNearestThousand(monthlySalariedGross * factorPercent / 100);
  const adjustmentYtdMay = sumAdjustments(monthlyAdjustments, V2_MONTHS.slice(0, 5));
  const holidayLiabilityBeforeAdjustment = yearStartLiability + adjustmentYtdMay;
  const systemAssessedHolidayLiability = holidayLiabilityBeforeAdjustment + monthlyAdjustments.jun;
  const withoutBank = {
    employeeCounts: { hourly: hourlyCount, salaried: salariedCount },
    hourlyEmployees,
    salariedEmployees,
    holidayLiability: {
      factorPercent,
      yearStartLiability,
      monthlyAdjustments,
      holidayLiabilityBeforeAdjustment,
      systemAssessedHolidayLiability,
    },
  } as const;
  const preliminaryInput = caseBuildInput(withoutBank, 0);
  const preliminarySource = buildV2SourceCase(preliminaryInput);
  const preliminaryAnswers = buildV2AnswerKey(preliminarySource, preliminaryInput);
  const requiredCash = requiredBankCash(preliminaryAnswers);
  const bankStart = roundUpToFiftyThousand(requiredCash + buffer);
  const inputs: GeneratedV2Inputs = deepFreezeLevel2({
    ...withoutBank,
    bank: { requiredCash, buffer, bankStart },
  });
  const finalInput = caseBuildInput(withoutBank, bankStart);
  const source = buildV2SourceCase(finalInput);
  const answers = buildV2AnswerKey(source, finalInput);
  const generated: GeneratedV2Case = deepFreezeLevel2({
    variant,
    seed,
    drawCount,
    rulesetYear: V2_RULESET_YEAR,
    rulesetVersion: V2_RULESET_VERSION,
    generatorVersion: V2_GENERATOR_VERSION,
    inputs,
    source,
    answers,
  });
  assertGeneratedV2Case(generated);
  return generated;
}

export function generateV2Case(variant: number): GeneratedV2Case {
  const seed = v2SeedString(variant);
  return generateV2CaseWithRandom(variant, createMulberry32(fnv1a32(seed)));
}

function assertRangeStep(value: number, min: number, max: number, step: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max || (value - min) % step !== 0) {
    throw new Error('Invalid ' + label);
  }
}

function assertNoAnswerKey(value: unknown, path = 'source'): void {
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['expectedPostings', 'answerKey', 'expectedCheckpoint', 'expectedSide'].includes(key)) {
      throw new Error('Answer-key leak at ' + path + '.' + key);
    }
    assertNoAnswerKey(child, path + '.' + key);
  }
}

export function assertGeneratedV2Case(generated: GeneratedV2Case): void {
  if (!isValidV2Variant(generated.variant) || generated.seed !== v2SeedString(generated.variant)) {
    throw new Error('Invalid generated V2.1 identity');
  }
  if (generated.rulesetYear !== 2026 || generated.rulesetVersion !== 2 || generated.generatorVersion !== 2) {
    throw new Error('Invalid generated V2.1 versions');
  }
  const { hourly, salaried } = generated.inputs.employeeCounts;
  assertRangeStep(hourly, 3, 6, 1, 'hourly employee count');
  assertRangeStep(salaried, 3, 6, 1, 'salaried employee count');
  if (generated.inputs.hourlyEmployees.length !== hourly || generated.inputs.salariedEmployees.length !== salaried) {
    throw new Error('Employee count mismatch');
  }
  for (const employee of generated.inputs.hourlyEmployees) {
    assertRangeStep(employee.hourlyRate, 200, 300, 5, 'hourly rate');
    assertRangeStep(employee.taxRate, 36, 42, 1, 'hourly tax rate');
    assertRangeStep(employee.monthlyDeduction, 4000, 6000, 250, 'hourly deduction');
    for (const month of V2_MONTHS) assertRangeStep(employee.hours[month], 125, 180, 1, 'hours');
  }
  for (const employee of generated.inputs.salariedEmployees) {
    assertRangeStep(employee.monthlySalary, 38000, 65000, 500, 'monthly salary');
    assertRangeStep(employee.taxRate, 36, 42, 1, 'salaried tax rate');
    assertRangeStep(employee.monthlyDeduction, 4000, 6000, 250, 'salaried deduction');
  }
  assertRangeStep(generated.inputs.holidayLiability.factorPercent, 70, 100, 5, 'holiday factor');
  for (const month of V2_MONTHS) {
    assertRangeStep(generated.inputs.holidayLiability.monthlyAdjustments[month], 2000, 10000, 500, 'holiday adjustment');
  }
  assertRangeStep(generated.inputs.bank.buffer, 250000, 750000, 50000, 'bank buffer');
  if (generated.drawCount !== expectedV2DrawCount(hourly, salaried)) throw new Error('Invalid V2.1 draw count');
  if (generated.source.history.map(item => item.month).join(',') !== V2_MONTHS.join(',')) {
    throw new Error('Incomplete Jan-Jun history');
  }
  assertV2Contract(generated.source, generated.answers);
  assertNoAnswerKey(generated.source);
  const bank = getV2Balance(generated.answers.finalBalances, '5820');
  if (bank.side !== 'debit' || bank.amount <= 0) throw new Error('Final bank must be positive debit');
  const exactBankStart = roundUpToFiftyThousand(
    generated.inputs.bank.requiredCash + generated.inputs.bank.buffer,
  );
  if (generated.inputs.bank.bankStart !== exactBankStart ||
      generated.inputs.bank.bankStart - generated.inputs.bank.requiredCash < generated.inputs.bank.buffer) {
    throw new Error('Bank guardrail failed');
  }
  if (requiredBankCash(generated.answers) !== generated.inputs.bank.requiredCash) {
    throw new Error('Required bank cash must use B1-B9 only');
  }
  const holiday = generated.inputs.holidayLiability;
  const monthlySalariedGross = generated.inputs.salariedEmployees
    .reduce((sum, employee) => sum + employee.monthlySalary, 0);
  if (holiday.yearStartLiability !== roundToNearestThousand(
    monthlySalariedGross * holiday.factorPercent / 100,
  )) throw new Error('Holiday liability opening heuristic failed');
  if (holiday.holidayLiabilityBeforeAdjustment + holiday.monthlyAdjustments.jun !== holiday.systemAssessedHolidayLiability) {
    throw new Error('Holiday liability closing relation failed');
  }
  const adjustmentYtdMay = sumAdjustments(holiday.monthlyAdjustments, V2_MONTHS.slice(0, 5));
  if (getV2Balance(generated.source.startBalances, '2235').amount !== adjustmentYtdMay ||
      getV2Balance(generated.answers.finalBalances, '2235').amount !== adjustmentYtdMay + holiday.monthlyAdjustments.jun ||
      getV2Balance(generated.source.startBalances, '6924').amount !== holiday.holidayLiabilityBeforeAdjustment ||
      getV2Balance(generated.answers.finalBalances, '6924').amount !== holiday.systemAssessedHolidayLiability) {
    throw new Error('Holiday adjustment YTD relation failed');
  }
  const employeeCount = hourly + salaried;
  if (getV2Balance(generated.source.startBalances, '6921').amount !== employeeCount * 5 * 297 ||
      getV2Balance(generated.answers.finalBalances, '6921').amount !== employeeCount * 6 * 297) {
    throw new Error('ATP accumulation relation failed');
  }
}

export function v2EconomicFingerprintPayload(generated: GeneratedV2Case): Readonly<object> {
  return deepFreezeLevel2({
    hourlyEmployees: generated.inputs.hourlyEmployees,
    salariedEmployees: generated.inputs.salariedEmployees,
    holidayLiability: {
      factorPercent: generated.inputs.holidayLiability.factorPercent,
      monthlyAdjustments: generated.inputs.holidayLiability.monthlyAdjustments,
    },
    bankBuffer: generated.inputs.bank.buffer,
  });
}

export function v2EconomicFingerprint(generated: GeneratedV2Case): string {
  return fnv1a32(canonicalStringify(v2EconomicFingerprintPayload(generated))).toString(16).padStart(8, '0');
}

export function toV2GeneratorFixture(generated: GeneratedV2Case): Readonly<object> {
  return deepFreezeLevel2({
    identity: {
      rulesetYear: generated.rulesetYear,
      rulesetVersion: generated.rulesetVersion,
      generatorVersion: generated.generatorVersion,
    },
    variant: generated.variant,
    seed: generated.seed,
    drawCount: generated.drawCount,
    inputs: generated.inputs,
    source: {
      startBalances: generated.source.startBalances,
      documentSources: generated.source.documentSources,
      tallies: generated.source.tallies,
      liabilityControls: generated.source.liabilityControls,
    },
    answers: {
      documentTotals: generated.answers.documents.map(document => ({
        id: document.id,
        debitTotal: document.debitTotal,
        creditTotal: document.creditTotal,
      })),
      reconciliation: generated.answers.reconciliation,
      finalBalances: generated.answers.finalBalances,
    },
  });
}
