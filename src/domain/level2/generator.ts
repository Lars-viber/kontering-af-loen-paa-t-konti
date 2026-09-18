import { balancesOf, buildLevel2Case, LEVEL2_MONTHS, type Level2AtpTimeline, type Level2Checkpoint, type Level2YtdSpecification } from './caseBuilder';
import { canonicalStringify } from './canonical';
import { deepFreezeLevel2 } from './readonly';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from './ruleset';
import type {
  AccountBalance,
  HourlyEmployeeReference,
  Level2Document,
  MonthId,
  ReferenceMonth,
  SalariedEmployeeReference,
} from './types';

export const LEVEL2_VARIANT_MIN = 1 as const;
export const LEVEL2_VARIANT_MAX = 999999 as const;
export const LEVEL2_SEED_PREFIX = 'payroll-level2:ruleset-2026-v1:generator-v1:' as const;

export type Level2RandomSource = () => number;

export interface GeneratedHolidayLiabilityInput {
  readonly factorPercent: number;
  readonly yearStartLiability: number;
  readonly monthlyAdjustments: Readonly<Record<MonthId, number>>;
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly systemAssessedHolidayLiability: number;
}

export interface GeneratedBankInput {
  readonly requiredCash: number;
  readonly buffer: number;
  readonly bankStart: number;
}

export interface GeneratedLevel2Inputs {
  readonly employeeCounts: {
    readonly hourly: number;
    readonly salaried: number;
  };
  readonly hourlyEmployees: readonly HourlyEmployeeReference[];
  readonly salariedEmployees: readonly SalariedEmployeeReference[];
  readonly holidayLiability: GeneratedHolidayLiabilityInput;
  readonly bank: GeneratedBankInput;
}

export interface GeneratedLevel2Derived {
  readonly history: readonly ReferenceMonth[];
  readonly atp: Level2AtpTimeline;
  readonly startBalances: readonly AccountBalance[];
  readonly documents: readonly Level2Document[];
  readonly checkpointBalances: readonly AccountBalance[];
  readonly ytdSpecification: Level2YtdSpecification;
  readonly checkpoint: Level2Checkpoint;
  readonly finalBalances: readonly AccountBalance[];
}

export interface GeneratedLevel2Case {
  readonly variant: number;
  readonly seed: string;
  readonly rulesetYear: typeof LEVEL2_RULESET_YEAR;
  readonly rulesetVersion: typeof LEVEL2_RULESET_VERSION;
  readonly generatorVersion: typeof LEVEL2_GENERATOR_VERSION;
  readonly inputs: GeneratedLevel2Inputs;
  readonly derived: GeneratedLevel2Derived;
}

export function isValidLevel2Variant(variant: number): boolean {
  return Number.isInteger(variant) && variant >= LEVEL2_VARIANT_MIN && variant <= LEVEL2_VARIANT_MAX;
}

export function level2SeedString(variant: number): string {
  if (!isValidLevel2Variant(variant)) throw new RangeError('Level 2 variant must be an integer from 1 to 999999');
  return LEVEL2_SEED_PREFIX + variant;
}

export function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createMulberry32(seed: number): Level2RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps one PRNG draw x in [0, 1) to min + floor(x * span).
 * Both integer endpoints are inclusive and there is no rejection sampling.
 */
export function randomInt(random: Level2RandomSource, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError('randomInt requires ordered integer endpoints');
  }
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new RangeError('PRNG draw must be in [0, 1)');
  }
  return min + Math.floor(draw * (max - min + 1));
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

function generateHourlyEmployees(count: number, random: Level2RandomSource): readonly HourlyEmployeeReference[] {
  const employees: HourlyEmployeeReference[] = [];
  for (let index = 1; index <= count; index += 1) {
    const hourlyRate = randomStep(random, 200, 300, 5);
    const taxRate = randomInt(random, 36, 42);
    const monthlyDeduction = randomStep(random, 4000, 6000, 250);
    const hours = {
      jan: randomInt(random, 125, 180),
      feb: randomInt(random, 125, 180),
      mar: randomInt(random, 125, 180),
      apr: randomInt(random, 125, 180),
      may: randomInt(random, 125, 180),
      jun: randomInt(random, 125, 180),
    };
    employees.push({ id: 'T' + index, hourlyRate, taxRate, monthlyDeduction, hours });
  }
  return employees;
}

function generateSalariedEmployees(count: number, random: Level2RandomSource): readonly SalariedEmployeeReference[] {
  const employees: SalariedEmployeeReference[] = [];
  for (let index = 1; index <= count; index += 1) {
    employees.push({
      id: 'M' + index,
      monthlySalary: randomStep(random, 38000, 65000, 500),
      taxRate: randomInt(random, 36, 42),
      monthlyDeduction: randomStep(random, 4000, 6000, 250),
    });
  }
  return employees;
}

function sumAdjustments(adjustments: Readonly<Record<MonthId, number>>, months: readonly MonthId[]): number {
  return months.reduce((sum, month) => sum + adjustments[month], 0);
}

function requiredBankCash(documents: readonly Level2Document[]): number {
  return documents.flatMap(document => document.expectedPostings)
    .filter(posting => posting.accountNumber === '5820' && posting.side === 'credit')
    .reduce((sum, posting) => sum + posting.amount, 0);
}

export function expectedLevel2DrawCount(hourlyCount: number, salariedCount: number): number {
  return 10 + 9 * hourlyCount + 3 * salariedCount;
}

export function generateLevel2CaseWithRandom(
  variant: number,
  random: Level2RandomSource,
): GeneratedLevel2Case {
  const seed = level2SeedString(variant);

  const hourlyCount = randomInt(random, 3, 6);
  const salariedCount = randomInt(random, 3, 6);
  const hourlyEmployees = generateHourlyEmployees(hourlyCount, random);
  const salariedEmployees = generateSalariedEmployees(salariedCount, random);

  const factorPercent = randomStep(random, 70, 100, 5);
  const monthlyAdjustments = {
    jan: randomStep(random, 2000, 10000, 500),
    feb: randomStep(random, 2000, 10000, 500),
    mar: randomStep(random, 2000, 10000, 500),
    apr: randomStep(random, 2000, 10000, 500),
    may: randomStep(random, 2000, 10000, 500),
    jun: randomStep(random, 2000, 10000, 500),
  };
  const buffer = randomStep(random, 250000, 750000, 50000);

  const monthlySalariedGross = salariedEmployees.reduce((sum, employee) => sum + employee.monthlySalary, 0);
  const yearStartLiability = roundToNearestThousand(monthlySalariedGross * factorPercent / 100);
  const adjustmentYtdMay = sumAdjustments(monthlyAdjustments, LEVEL2_MONTHS.slice(0, 5));
  const holidayLiabilityBeforeAdjustment = yearStartLiability + adjustmentYtdMay;
  const systemAssessedHolidayLiability = holidayLiabilityBeforeAdjustment + monthlyAdjustments.jun;

  const preliminary = buildLevel2Case({
    hourlyEmployees,
    salariedEmployees,
    holidayLiabilityBeforeAdjustment,
    holidayLiabilityAdjustmentYtdMay: adjustmentYtdMay,
    juneHolidayLiabilityAdjustment: monthlyAdjustments.jun,
    bankStartBalance: 0,
  });
  const requiredCash = requiredBankCash(preliminary.documents);
  const bankStart = roundUpToFiftyThousand(requiredCash + buffer);

  const derived = buildLevel2Case({
    hourlyEmployees,
    salariedEmployees,
    holidayLiabilityBeforeAdjustment,
    holidayLiabilityAdjustmentYtdMay: adjustmentYtdMay,
    juneHolidayLiabilityAdjustment: monthlyAdjustments.jun,
    bankStartBalance: bankStart,
  });

  return deepFreezeLevel2({
    variant,
    seed,
    rulesetYear: LEVEL2_RULESET_YEAR,
    rulesetVersion: LEVEL2_RULESET_VERSION,
    generatorVersion: LEVEL2_GENERATOR_VERSION,
    inputs: {
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
      bank: { requiredCash, buffer, bankStart },
    },
    derived: {
      history: LEVEL2_MONTHS.map(month => derived.history[month]),
      atp: derived.atp,
      startBalances: derived.startBalances,
      documents: derived.documents,
      checkpointBalances: balancesOf(derived.checkpointLedger),
      ytdSpecification: derived.ytdSpecification,
      checkpoint: derived.checkpoint,
      finalBalances: balancesOf(derived.finalLedger),
    },
  });
}

export function generateLevel2Case(variant: number): GeneratedLevel2Case {
  const seed = level2SeedString(variant);
  return generateLevel2CaseWithRandom(variant, createMulberry32(fnv1a32(seed)));
}

export function level2CaseFingerprint(value: GeneratedLevel2Case): string {
  return fnv1a32(canonicalStringify(value)).toString(16).padStart(8, '0');
}
