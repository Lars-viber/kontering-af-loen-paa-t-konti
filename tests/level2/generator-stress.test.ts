import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  LEVEL2_DOCUMENT_IDS,
  LEVEL2_MONTHS,
  canonicalStringify,
  generateLevel2Case,
  type AccountBalance,
  type GeneratedLevel2Case,
  type Level2AccountNumber,
} from '../../src/domain/level2';

interface Range {
  min: number;
  max: number;
}

interface DistributionAudit {
  readonly variants: number;
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
  readonly ranges: {
    readonly totalEmployees: Range;
    readonly juneGrossPayroll: Range;
    readonly checkpointOperatingTotal: Range;
    readonly bankStart: Range;
    readonly finalBank: Range;
    readonly holidayLiabilityJune: Range;
  };
  readonly duplicateFingerprints: readonly string[];
}

function accountAmount(balances: readonly AccountBalance[], accountNumber: Level2AccountNumber): number {
  const balance = balances.find(candidate => candidate.accountNumber === accountNumber);
  if (!balance) throw new Error('Missing account ' + accountNumber);
  return balance.amount;
}

function add(set: Set<number>, values: readonly number[]): void {
  values.forEach(value => set.add(value));
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

function validateVariant(generated: GeneratedLevel2Case): void {
  const { hourly, salaried } = generated.inputs.employeeCounts;
  if (hourly < 3 || hourly > 6 || salaried < 3 || salaried > 6) throw new Error('employee count');

  for (const employee of generated.inputs.hourlyEmployees) {
    if (employee.hourlyRate < 200 || employee.hourlyRate > 300 || employee.hourlyRate % 5 !== 0) throw new Error('hourly rate');
    if (employee.taxRate < 36 || employee.taxRate > 42) throw new Error('hourly tax rate');
    if (employee.monthlyDeduction < 4000 || employee.monthlyDeduction > 6000 || employee.monthlyDeduction % 250 !== 0) throw new Error('hourly deduction');
    for (const month of LEVEL2_MONTHS) {
      if (employee.hours[month] < 125 || employee.hours[month] > 180) throw new Error('hours');
    }
  }
  for (const employee of generated.inputs.salariedEmployees) {
    if (employee.monthlySalary < 38000 || employee.monthlySalary > 65000 || employee.monthlySalary % 500 !== 0) throw new Error('monthly salary');
    if (employee.taxRate < 36 || employee.taxRate > 42) throw new Error('salaried tax rate');
    if (employee.monthlyDeduction < 4000 || employee.monthlyDeduction > 6000 || employee.monthlyDeduction % 250 !== 0) throw new Error('salaried deduction');
  }

  assertSafeFrozenNumbers(generated);

  if (generated.derived.documents.length !== 13) throw new Error('document count');
  generated.derived.documents.forEach((document, index) => {
    if (document.id !== LEVEL2_DOCUMENT_IDS[index]) throw new Error('document order');
    if (!document.balanced || document.debitTotal !== document.creditTotal) throw new Error('unbalanced document');
    if (document.expectedPostings.some(posting => posting.amount < 0 || !Number.isInteger(posting.amount))) throw new Error('posting amount');
  });

  for (const month of generated.derived.history) {
    for (const payroll of [...month.hourlyPayroll, ...month.salariedPayroll]) {
      if (payroll.aTax <= 0) throw new Error('ordinary A-tax is not positive');
    }
  }

  const may = generated.derived.history[4];
  const starts = generated.derived.startBalances;
  if (accountAmount(starts, '6920') !== may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax) throw new Error('May A-tax');
  if (accountAmount(starts, '6930') !== may.hourlyTotals.amContribution + may.salariedTotals.amContribution + may.hourlyHolidayTotals.amContribution) throw new Error('May AM');
  if (accountAmount(starts, '6922') !== may.hourlyTotals.employeePension + may.hourlyTotals.employerPension + may.salariedTotals.employeePension + may.salariedTotals.employerPension) throw new Error('May pension');
  if (accountAmount(starts, '6923') !== may.hourlyHolidayTotals.netHolidayPay) throw new Error('May FerieKonto');
  if (accountAmount(starts, '6921') !== (hourly + salaried) * 5 * 297) throw new Error('January-May ATP');

  const checkpoint = generated.derived.checkpointBalances;
  for (const account of ['6920', '6930', '6922', '6923'] as const) {
    if (accountAmount(checkpoint, account) <= 0) throw new Error('checkpoint liability ' + account);
  }
  const quarterlyAtp = (hourly + salaried) * 3 * 297;
  if (accountAmount(checkpoint, '6921') !== quarterlyAtp * 2) throw new Error('checkpoint ATP');
  if (accountAmount(generated.derived.finalBalances, '6921') !== quarterlyAtp) throw new Error('final ATP');
  if (accountAmount(generated.derived.finalBalances, '6924') !== generated.inputs.holidayLiability.systemAssessedHolidayLiability) throw new Error('holiday liability persistence');

  const operatingAccounts = ['2210', '2211', '2215', '2223', '2230', '2235'] as const;
  const operatingTotal = operatingAccounts.reduce((sum, account) => sum + accountAmount(checkpoint, account), 0);
  if (operatingTotal !== generated.derived.checkpoint.operatingTotal) throw new Error('checkpoint operating reconciliation');

  let bank = generated.inputs.bank.bankStart;
  for (const document of generated.derived.documents) {
    for (const posting of document.expectedPostings) {
      if (posting.accountNumber === '5820') bank += posting.side === 'debit' ? posting.amount : -posting.amount;
    }
    if (bank <= 0) throw new Error('Bank not debit after ' + document.id);
  }
  if (bank !== accountAmount(generated.derived.finalBalances, '5820') || bank <= 0) throw new Error('final Bank');
  if (generated.inputs.bank.requiredCash !== generated.inputs.bank.bankStart - bank) throw new Error('required cash');
}

function runAudit(): DistributionAudit {
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
    checkpointOperatingTotal: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    bankStart: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    finalBank: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    holidayLiabilityJune: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  };

  for (let variant = 1; variant <= 4000; variant += 1) {
    const generated = generateLevel2Case(variant);
    try {
      validateVariant(generated);
    } catch (error) {
      throw new Error('Variant ' + variant + ': ' + (error instanceof Error ? error.message : String(error)));
    }

    hourlyCounts.add(generated.inputs.employeeCounts.hourly);
    salariedCounts.add(generated.inputs.employeeCounts.salaried);
    for (const employee of generated.inputs.hourlyEmployees) {
      hourlyRates.add(employee.hourlyRate);
      add(hours, LEVEL2_MONTHS.map(month => employee.hours[month]));
      taxRates.add(employee.taxRate);
      deductions.add(employee.monthlyDeduction);
    }
    for (const employee of generated.inputs.salariedEmployees) {
      monthlySalaries.add(employee.monthlySalary);
      taxRates.add(employee.taxRate);
      deductions.add(employee.monthlyDeduction);
    }
    holidayFactors.add(generated.inputs.holidayLiability.factorPercent);
    add(holidayAdjustments, LEVEL2_MONTHS.map(month => generated.inputs.holidayLiability.monthlyAdjustments[month]));
    bankBuffers.add(generated.inputs.bank.buffer);

    const june = generated.derived.history[5];
    update(ranges.totalEmployees, generated.inputs.employeeCounts.hourly + generated.inputs.employeeCounts.salaried);
    update(ranges.juneGrossPayroll, june.hourlyTotals.grossSalary + june.salariedTotals.grossSalary);
    update(ranges.checkpointOperatingTotal, generated.derived.checkpoint.operatingTotal);
    update(ranges.bankStart, generated.inputs.bank.bankStart);
    update(ranges.finalBank, accountAmount(generated.derived.finalBalances, '5820'));
    update(ranges.holidayLiabilityJune, generated.inputs.holidayLiability.systemAssessedHolidayLiability);

    const fingerprint = createHash('sha256').update(canonicalStringify(generated)).digest('hex');
    const previous = fingerprints.get(fingerprint);
    if (previous !== undefined) duplicateFingerprints.push(previous + '/' + variant);
    else fingerprints.set(fingerprint, variant);
  }

  const sorted = (set: Set<number>): number[] => [...set].sort((left, right) => left - right);
  const audit: DistributionAudit = {
    variants: 4000,
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
    ranges,
    duplicateFingerprints,
  };
  writeFileSync('artifacts/j1b-level2-generator-audit.json', JSON.stringify(audit, null, 2) + String.fromCharCode(10));
  return audit;
}

describe('Niveau 2 Generator v1 stress og distribution', () => {
  let audit: DistributionAudit;

  beforeAll(() => {
    audit = runAudit();
  }, 120000);

  it('gennemfører 4.000/4.000 varianter uden invariantfejl eller dubletter', () => {
    expect(audit.variants).toBe(4000);
    expect(audit.duplicateFingerprints).toEqual([]);
  });

  it('observerer alle krævede endpoints og diskrete skatte-/fradragsværdier', () => {
    expect(audit.hourlyCounts).toEqual([3, 4, 5, 6]);
    expect(audit.salariedCounts).toEqual([3, 4, 5, 6]);
    expect(audit.hourlyRates).toContain(200);
    expect(audit.hourlyRates).toContain(300);
    expect(audit.hours).toContain(125);
    expect(audit.hours).toContain(180);
    expect(audit.monthlySalaries).toContain(38000);
    expect(audit.monthlySalaries).toContain(65000);
    expect(audit.taxRates).toEqual([36, 37, 38, 39, 40, 41, 42]);
    expect(audit.deductions).toEqual([4000, 4250, 4500, 4750, 5000, 5250, 5500, 5750, 6000]);
    expect(audit.holidayFactors).toEqual([70, 75, 80, 85, 90, 95, 100]);
    expect(audit.holidayAdjustments).toContain(2000);
    expect(audit.holidayAdjustments).toContain(10000);
    expect(audit.bankBuffers).toEqual([250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 750000]);
  });

  it('producerer endelige observerede min/max til rapporten', () => {
    for (const range of Object.values(audit.ranges)) {
      expect(Number.isSafeInteger(range.min)).toBe(true);
      expect(Number.isSafeInteger(range.max)).toBe(true);
      expect(range.max).toBeGreaterThanOrEqual(range.min);
    }
  });
});
