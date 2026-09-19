import { describe, expect, it } from 'vitest';
import {
  V2_DOCUMENT_IDS,
  V2_MONTHS,
  V2_RATES,
  assertGeneratedV2Case,
  expectedV2DrawCount,
  generateV2Case,
  generateV2CaseWithRandom,
  getV2Balance,
  getV2Tally,
  isValidV2Variant,
  v2EconomicFingerprintPayload,
  v2SeedString,
} from '../../src/domain/level2/v2';
import { canonicalStringify, fnv1a32, generateLevel2Case } from '../../src/domain/level2';

function differences(generated: ReturnType<typeof generateV2Case>): readonly number[] {
  const reconciliation = generated.answers.reconciliation;
  return [
    reconciliation.A.difference,
    reconciliation.B.difference,
    ...Object.values(reconciliation.C).map(item => item.difference),
    reconciliation.D.difference,
    ...reconciliation.E.map(item => item.difference),
  ];
}

function sumBankCredits(generated: ReturnType<typeof generateV2Case>): number {
  return generated.answers.documents.flatMap(document => document.expectedPostings)
    .filter(posting => posting.accountNumber === '5820' && posting.side === 'credit')
    .reduce((sum, posting) => sum + posting.amount, 0);
}

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(assertDeepFrozen);
}

describe('Niveau 2 V2.1 Generator V2', () => {
  it('fryser seed-kontrakten og FNV-1a 32-bit', () => {
    const seed = 'payroll-level2:ruleset-2026-v2:generator-v2:42';
    expect(v2SeedString(42)).toBe(seed);
    expect(fnv1a32(seed)).toBe(245780607);
  });

  it('afviser alle varianter uden for heltalsintervallet 1–999999', () => {
    for (const variant of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1000000]) {
      expect(isValidV2Variant(variant)).toBe(false);
      expect(() => generateV2Case(variant)).toThrow(RangeError);
    }
    expect(isValidV2Variant(1)).toBe(true);
    expect(isValidV2Variant(999999)).toBe(true);
  });

  it('bruger præcis 10 + 9H + 3M draws uden betingede ekstratræk', () => {
    let draws = 0;
    const generated = generateV2CaseWithRandom(42, () => {
      draws += 1;
      return 0.5;
    });
    expect(generated.inputs.employeeCounts).toEqual({ hourly: 5, salaried: 5 });
    expect(draws).toBe(70);
    expect(generated.drawCount).toBe(expectedV2DrawCount(5, 5));
  });

  it.each([1, 2, 3, 42, 999999])('er deterministisk og isoleret for variant %i', variant => {
    const first = generateV2Case(variant);
    const second = generateV2Case(variant);
    expect(second).toEqual(first);
    expect(canonicalStringify(second)).toBe(canonicalStringify(first));
    expect(second).not.toBe(first);
    expect(second.inputs.hourlyEmployees).not.toBe(first.inputs.hourlyEmployees);
    assertDeepFrozen(first);
    expect(Reflect.set(first.inputs.hourlyEmployees[0], 'hourlyRate', 999)).toBe(false);
    expect(second).toEqual(generateV2Case(variant));
  });

  it('bruger en ny seed-identitet og giver andre medarbejdere end Generator V1', () => {
    const v1 = generateLevel2Case(42);
    const v2 = generateV2Case(42);
    expect(v2.inputs.hourlyEmployees).not.toEqual(v1.inputs.hourlyEmployees);
    expect(v2.inputs.salariedEmployees).not.toEqual(v1.inputs.salariedEmployees);
  });

  it('giver forskellige økonomiske source-inputs for de frosne fixturevarianter', () => {
    const payloads = [1, 2, 3, 42, 999999]
      .map(variant => canonicalStringify(v2EconomicFingerprintPayload(generateV2Case(variant))));
    expect(new Set(payloads).size).toBe(payloads.length);
  });

  it('holder alle medarbejderinputs inden for de frosne ranges og steps', () => {
    const generated = generateV2Case(42);
    expect(generated.inputs.employeeCounts.hourly).toBeGreaterThanOrEqual(3);
    expect(generated.inputs.employeeCounts.hourly).toBeLessThanOrEqual(6);
    expect(generated.inputs.employeeCounts.salaried).toBeGreaterThanOrEqual(3);
    expect(generated.inputs.employeeCounts.salaried).toBeLessThanOrEqual(6);
    for (const employee of generated.inputs.hourlyEmployees) {
      expect(employee.hourlyRate).toBeGreaterThanOrEqual(200);
      expect(employee.hourlyRate).toBeLessThanOrEqual(300);
      expect(employee.hourlyRate % 5).toBe(0);
      expect(employee.taxRate).toBeGreaterThanOrEqual(36);
      expect(employee.taxRate).toBeLessThanOrEqual(42);
      expect((employee.monthlyDeduction - 4000) % 250).toBe(0);
      for (const month of V2_MONTHS) {
        expect(employee.hours[month]).toBeGreaterThanOrEqual(125);
        expect(employee.hours[month]).toBeLessThanOrEqual(180);
      }
    }
    for (const employee of generated.inputs.salariedEmployees) {
      expect(employee.monthlySalary).toBeGreaterThanOrEqual(38000);
      expect(employee.monthlySalary).toBeLessThanOrEqual(65000);
      expect((employee.monthlySalary - 38000) % 500).toBe(0);
      expect(employee.taxRate).toBeGreaterThanOrEqual(36);
      expect(employee.taxRate).toBeLessThanOrEqual(42);
      expect((employee.monthlyDeduction - 4000) % 250).toBe(0);
    }
  });

  it('afleder pension, ATP, skat og feriepenge pr. medarbejder med V1-reglerne', () => {
    const generated = generateV2Case(42);
    for (const month of generated.source.history) {
      for (const payroll of [...month.hourlyPayroll, ...month.salariedPayroll]) {
        expect(payroll.employeePension).toBe(Math.round(payroll.grossSalary * V2_RATES.employeePensionPercent / 100));
        expect(payroll.employerPension).toBe(Math.round(payroll.grossSalary * V2_RATES.employerPensionPercent / 100));
        expect(payroll.employeeAtp).toBe(99);
        expect(payroll.employerAtp).toBe(198);
        expect(payroll.amBase).toBe(payroll.grossSalary - payroll.employeePension - payroll.employeeAtp);
        expect(payroll.amContribution).toBe(Math.round(payroll.amBase * 0.08));
        expect(payroll.taxBase).toBe(Math.max(0, payroll.amBase - payroll.amContribution - payroll.monthlyDeduction));
        expect(payroll.aTax).toBe(Math.round(payroll.taxBase * payroll.taxRate / 100));
        expect(payroll.netPay).toBe(payroll.amBase - payroll.amContribution - payroll.aTax);
      }
      for (const holiday of month.hourlyHolidayPay) {
        expect(holiday.grossHolidayPay).toBe(Math.round(holiday.holidayEligibleSalary * 0.125));
        expect(holiday.amContribution).toBe(Math.round(holiday.grossHolidayPay * 0.08));
        expect(holiday.taxBase).toBe(holiday.grossHolidayPay - holiday.amContribution);
        expect(holiday.aTax).toBe(Math.round(holiday.taxBase * holiday.taxRate / 100));
        expect(holiday.netHolidayPay).toBe(holiday.grossHolidayPay - holiday.amContribution - holiday.aTax);
      }
    }
  });

  it('afleder Jan-May-startsaldi og juni-slutsaldi fra den seksmåneders historik', () => {
    const generated = generateV2Case(42);
    const history = generated.source.history;
    const firstFive = history.slice(0, 5);
    const sum = (select: (month: typeof history[number]) => number): number =>
      firstFive.reduce((total, month) => total + select(month), 0);
    expect(getV2Balance(generated.source.startBalances, '2210').amount)
      .toBe(sum(month => month.hourlyTotals.amBase));
    expect(getV2Balance(generated.source.startBalances, '2211').amount)
      .toBe(sum(month => month.salariedTotals.amBase));
    expect(getV2Balance(generated.source.startBalances, '2230').amount)
      .toBe(sum(month => month.hourlyHolidayTotals.grossHolidayPay));
    const may = history[4];
    const june = history[5];
    const employeeCount = generated.inputs.employeeCounts.hourly + generated.inputs.employeeCounts.salaried;
    expect(getV2Balance(generated.source.startBalances, '6920').amount)
      .toBe(may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax);
    expect(getV2Balance(generated.source.startBalances, '6921').amount).toBe(employeeCount * 5 * 297);
    expect(getV2Balance(generated.answers.finalBalances, '6920').amount)
      .toBe(june.hourlyTotals.aTax + june.salariedTotals.aTax + june.hourlyHolidayTotals.aTax);
    expect(getV2Balance(generated.answers.finalBalances, '6930').amount)
      .toBe(june.hourlyTotals.amContribution + june.salariedTotals.amContribution + june.hourlyHolidayTotals.amContribution);
    expect(getV2Balance(generated.answers.finalBalances, '6922').amount)
      .toBe(june.hourlyTotals.employeePension + june.hourlyTotals.employerPension +
        june.salariedTotals.employeePension + june.salariedTotals.employerPension);
    expect(getV2Balance(generated.answers.finalBalances, '6923').amount)
      .toBe(june.hourlyHolidayTotals.netHolidayPay);
    expect(getV2Balance(generated.answers.finalBalances, '6921').amount).toBe(employeeCount * 6 * 297);
  });

  it('bevarer V2.1-feriepengeforpligtelsens opening-, juni- og ÅTD-relationer', () => {
    const generated = generateV2Case(42);
    const holiday = generated.inputs.holidayLiability;
    const januaryThroughMay = V2_MONTHS.slice(0, 5)
      .reduce((sum, month) => sum + holiday.monthlyAdjustments[month], 0);
    const januaryThroughJune = januaryThroughMay + holiday.monthlyAdjustments.jun;
    expect(getV2Balance(generated.source.startBalances, '2235').amount).toBe(januaryThroughMay);
    expect(getV2Balance(generated.answers.finalBalances, '2235').amount).toBe(januaryThroughJune);
    expect(holiday.holidayLiabilityBeforeAdjustment).toBe(holiday.yearStartLiability + januaryThroughMay);
    expect(holiday.systemAssessedHolidayLiability)
      .toBe(holiday.holidayLiabilityBeforeAdjustment + holiday.monthlyAdjustments.jun);
    expect(getV2Balance(generated.source.startBalances, '6924').amount)
      .toBe(holiday.holidayLiabilityBeforeAdjustment);
    expect(getV2Balance(generated.answers.finalBalances, '6924').amount)
      .toBe(holiday.systemAssessedHolidayLiability);
    expect(getV2Tally(generated.source.tallies, 'holiday-liability-adjustment-ytd').amount)
      .toBe(januaryThroughJune);
  });

  it('genererer præcis B1-B9, balancerer 9/9 og har 13 slutsaldi', () => {
    const generated = generateV2Case(42);
    expect(generated.source.documentSources.map(document => document.id)).toEqual(V2_DOCUMENT_IDS);
    expect(generated.answers.documents.map(document => document.id)).toEqual(V2_DOCUMENT_IDS);
    expect(generated.answers.documents).toHaveLength(9);
    expect(generated.answers.finalBalances).toHaveLength(13);
    for (const document of generated.answers.documents) {
      expect(document.expectedPostings.length).toBeGreaterThan(0);
      expect(document.balanced).toBe(true);
      expect(document.debitTotal).toBe(document.creditTotal);
      expect(document.expectedPostings.every(posting => Number.isInteger(posting.amount) && posting.amount > 0)).toBe(true);
    }
  });

  it('afleder komplette tælleværker og balancekontroller samt A-E med difference 0', () => {
    const generated = generateV2Case(42);
    expect(generated.source.tallies).toHaveLength(13);
    expect(generated.source.liabilityControls).toHaveLength(6);
    expect(differences(generated)).toHaveLength(13);
    expect(differences(generated)).toEqual(Array(13).fill(0));
    assertGeneratedV2Case(generated);
  });

  it('beregner bankguardrailen alene fra B1-B9-bankcredits', () => {
    const generated = generateV2Case(42);
    const requiredCash = sumBankCredits(generated);
    const finalBank = getV2Balance(generated.answers.finalBalances, '5820');
    expect(generated.inputs.bank.requiredCash).toBe(requiredCash);
    expect(generated.inputs.bank.bankStart).toBe(Math.ceil(
      (requiredCash + generated.inputs.bank.buffer) / 50000,
    ) * 50000);
    expect(finalBank.side).toBe('debit');
    expect(finalBank.amount).toBe(generated.inputs.bank.bankStart - requiredCash);
    expect(finalBank.amount).toBeGreaterThanOrEqual(generated.inputs.bank.buffer);
  });

  it('adskiller source fra answers og skjuler juni-reguleringen i B9-source', () => {
    const generated = generateV2Case(42);
    const forbidden = new Set(['expectedPostings', 'answerKey', 'expectedCheckpoint', 'expectedSide']);
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        expect(forbidden.has(key)).toBe(false);
        visit(child);
      }
    };
    visit(generated.source);
    const b9 = generated.source.documentSources.find(document => document.id === 'B9');
    expect(b9?.fields.map(field => field.id)).toEqual([
      'holiday-liability-before-adjustment',
      'holiday-liability-system-assessed',
    ]);
    expect(b9?.fields.some(field => field.amount === generated.inputs.holidayLiability.monthlyAdjustments.jun))
      .toBe(false);
  });
});
