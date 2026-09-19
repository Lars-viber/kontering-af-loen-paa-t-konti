import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  V2_MONTHS,
  assertGeneratedV2Case,
  generateV2Case,
  getV2Balance,
  v2EconomicFingerprintPayload,
  type GeneratedV2Case,
} from '../../src/domain/level2/v2';
import { canonicalStringify } from '../../src/domain/level2';

interface Range {
  min: number;
  max: number;
}

interface V2GeneratorAudit {
  readonly variants: number;
  readonly balancedDocuments: number;
  readonly duplicateFingerprints: readonly string[];
  readonly observed: {
    readonly hourlyCounts: readonly number[];
    readonly salariedCounts: readonly number[];
    readonly hourlyRates: readonly number[];
    readonly hours: readonly number[];
    readonly monthlySalaries: readonly number[];
    readonly taxRates: readonly number[];
    readonly deductions: readonly number[];
    readonly holidayFactors: readonly number[];
    readonly holidayAdjustments: readonly number[];
    readonly bankBuffers: readonly number[];
  };
  readonly ranges: {
    readonly totalEmployees: Range;
    readonly juneGrossPayroll: Range;
    readonly operatingTotal: Range;
    readonly bankStart: Range;
    readonly finalBank: Range;
    readonly holidayLiabilityJune: Range;
  };
}

function add(values: Set<number>, items: readonly number[]): void {
  items.forEach(item => values.add(item));
}

function sorted(values: Set<number>): number[] {
  return [...values].sort((left, right) => left - right);
}

function update(range: Range, value: number): void {
  range.min = Math.min(range.min, value);
  range.max = Math.max(range.max, value);
}

function assertSafeFrozenNumbers(value: unknown, path = 'case'): void {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(path + ' is not a non-negative safe integer');
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (!Object.isFrozen(value)) throw new Error(path + ' is mutable');
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertSafeFrozenNumbers(child, path + '[' + index + ']'));
    return;
  }
  for (const [key, child] of Object.entries(value)) assertSafeFrozenNumbers(child, path + '.' + key);
}

function reconciliationDifferences(generated: GeneratedV2Case): readonly number[] {
  const value = generated.answers.reconciliation;
  return [
    value.A.difference,
    value.B.difference,
    ...Object.values(value.C).map(item => item.difference),
    value.D.difference,
    ...value.E.map(item => item.difference),
  ];
}

function validateVariant(generated: GeneratedV2Case): void {
  assertGeneratedV2Case(generated);
  assertSafeFrozenNumbers(generated);
  if (generated.source.documentSources.length !== 9 || generated.answers.documents.length !== 9) {
    throw new Error('B1-B9 document count');
  }
  if (generated.answers.finalBalances.length !== 13) throw new Error('final account count');
  if (generated.source.tallies.length !== 13) throw new Error('tælleværk count');
  if (generated.source.liabilityControls.length !== 6) throw new Error('liability control count');
  if (generated.answers.documents.some(document =>
    !document.balanced || document.debitTotal !== document.creditTotal ||
    document.expectedPostings.some(posting => !Number.isInteger(posting.amount) || posting.amount <= 0)
  )) throw new Error('invalid generated document');
  if (reconciliationDifferences(generated).some(difference => difference !== 0)) {
    throw new Error('non-zero reconciliation difference');
  }
  const bank = getV2Balance(generated.answers.finalBalances, '5820');
  if (bank.side !== 'debit' || bank.amount <= 0 || bank.amount < generated.inputs.bank.buffer) {
    throw new Error('bank guardrail');
  }
  const holiday = generated.inputs.holidayLiability;
  const ytdMay = V2_MONTHS.slice(0, 5)
    .reduce((sum, month) => sum + holiday.monthlyAdjustments[month], 0);
  if (
    holiday.holidayLiabilityBeforeAdjustment + holiday.monthlyAdjustments.jun !==
      holiday.systemAssessedHolidayLiability ||
    getV2Balance(generated.source.startBalances, '2235').amount !== ytdMay ||
    getV2Balance(generated.answers.finalBalances, '2235').amount !== ytdMay + holiday.monthlyAdjustments.jun
  ) throw new Error('B9 liability relation');
}

function runAudit(): V2GeneratorAudit {
  const hourlyCounts = new Set<number>();
  const salariedCounts = new Set<number>();
  const hourlyRates = new Set<number>();
  const hours = new Set<number>();
  const monthlySalaries = new Set<number>();
  const taxRates = new Set<number>();
  const deductions = new Set<number>();
  const holidayFactors = new Set<number>();
  const holidayAdjustments = new Set<number>();
  const bankBuffers = new Set<number>();
  const fingerprints = new Map<string, number>();
  const duplicateFingerprints: string[] = [];
  const ranges = {
    totalEmployees: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    juneGrossPayroll: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    operatingTotal: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    bankStart: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    finalBank: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    holidayLiabilityJune: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  };
  let balancedDocuments = 0;

  for (let variant = 1; variant <= 4000; variant += 1) {
    const generated = generateV2Case(variant);
    try {
      validateVariant(generated);
    } catch (error) {
      throw new Error('Variant ' + variant + ': ' + (error instanceof Error ? error.message : String(error)));
    }
    balancedDocuments += generated.answers.documents.length;
    hourlyCounts.add(generated.inputs.employeeCounts.hourly);
    salariedCounts.add(generated.inputs.employeeCounts.salaried);
    for (const employee of generated.inputs.hourlyEmployees) {
      hourlyRates.add(employee.hourlyRate);
      add(hours, V2_MONTHS.map(month => employee.hours[month]));
      taxRates.add(employee.taxRate);
      deductions.add(employee.monthlyDeduction);
    }
    for (const employee of generated.inputs.salariedEmployees) {
      monthlySalaries.add(employee.monthlySalary);
      taxRates.add(employee.taxRate);
      deductions.add(employee.monthlyDeduction);
    }
    holidayFactors.add(generated.inputs.holidayLiability.factorPercent);
    add(holidayAdjustments, V2_MONTHS.map(month => generated.inputs.holidayLiability.monthlyAdjustments[month]));
    bankBuffers.add(generated.inputs.bank.buffer);

    const june = generated.source.history[5];
    update(ranges.totalEmployees, generated.inputs.employeeCounts.hourly + generated.inputs.employeeCounts.salaried);
    update(ranges.juneGrossPayroll, june.hourlyTotals.grossSalary + june.salariedTotals.grossSalary);
    update(ranges.operatingTotal, generated.answers.operatingTotal);
    update(ranges.bankStart, generated.inputs.bank.bankStart);
    update(ranges.finalBank, getV2Balance(generated.answers.finalBalances, '5820').amount);
    update(ranges.holidayLiabilityJune, generated.inputs.holidayLiability.systemAssessedHolidayLiability);

    const fingerprint = createHash('sha256')
      .update(canonicalStringify(v2EconomicFingerprintPayload(generated)))
      .digest('hex');
    const earlierVariant = fingerprints.get(fingerprint);
    if (earlierVariant !== undefined) duplicateFingerprints.push(earlierVariant + '/' + variant);
    else fingerprints.set(fingerprint, variant);
  }

  const audit: V2GeneratorAudit = {
    variants: 4000,
    balancedDocuments,
    duplicateFingerprints,
    observed: {
      hourlyCounts: sorted(hourlyCounts),
      salariedCounts: sorted(salariedCounts),
      hourlyRates: sorted(hourlyRates),
      hours: sorted(hours),
      monthlySalaries: sorted(monthlySalaries),
      taxRates: sorted(taxRates),
      deductions: sorted(deductions),
      holidayFactors: sorted(holidayFactors),
      holidayAdjustments: sorted(holidayAdjustments),
      bankBuffers: sorted(bankBuffers),
    },
    ranges,
  };
  const auditPath = 'artifacts/j1b-v2-generator-audit.json';
  mkdirSync(dirname(auditPath), { recursive: true });
  writeFileSync(auditPath, JSON.stringify(audit, null, 2) + String.fromCharCode(10));
  return audit;
}

describe('Niveau 2 V2.1 Generator V2 stress og distribution', () => {
  let audit: V2GeneratorAudit;

  beforeAll(() => {
    audit = runAudit();
  }, 120000);

  it('gennemfører 4.000/4.000 med 9/9 balancerede dokumenter og 0 økonomiske dubletter', () => {
    expect(audit.variants).toBe(4000);
    expect(audit.balancedDocuments).toBe(36000);
    expect(audit.duplicateFingerprints).toEqual([]);
  });

  it('holder alle observerede source-værdier inden for de tilladte ranges og steps', () => {
    const observed = audit.observed;
    expect(observed.hourlyCounts.every(value => value >= 3 && value <= 6)).toBe(true);
    expect(observed.salariedCounts.every(value => value >= 3 && value <= 6)).toBe(true);
    expect(observed.hourlyRates.every(value => value >= 200 && value <= 300 && value % 5 === 0)).toBe(true);
    expect(observed.hours.every(value => value >= 125 && value <= 180)).toBe(true);
    expect(observed.monthlySalaries.every(value => value >= 38000 && value <= 65000 && value % 500 === 0)).toBe(true);
    expect(observed.taxRates.every(value => value >= 36 && value <= 42)).toBe(true);
    expect(observed.deductions.every(value => value >= 4000 && value <= 6000 && value % 250 === 0)).toBe(true);
    expect(observed.holidayFactors.every(value => value >= 70 && value <= 100 && value % 5 === 0)).toBe(true);
    expect(observed.holidayAdjustments.every(value => value >= 2000 && value <= 10000 && value % 500 === 0)).toBe(true);
    expect(observed.bankBuffers.every(value => value >= 250000 && value <= 750000 && value % 50000 === 0)).toBe(true);
  });

  it('producerer endelige min/max-ranges til rapporten', () => {
    for (const range of Object.values(audit.ranges)) {
      expect(Number.isSafeInteger(range.min)).toBe(true);
      expect(Number.isSafeInteger(range.max)).toBe(true);
      expect(range.max).toBeGreaterThanOrEqual(range.min);
    }
  });
});
