import { describe, expect, it } from 'vitest';
import {
  R1_V2_ANSWER_KEY,
  R1_V2_EXPECTED_DOCUMENTS,
  R1_V2_HOURLY_EMPLOYEES,
  R1_V2_SALARIED_EMPLOYEES,
  R1_V2_SOURCE,
  R1_V2_START_BALANCES,
  getV2Balance,
} from '../../src/domain/level2/v2';

describe('Niveau 2 V2.1 håndfrosset R1 og ledger', () => {
  it('bevarer de godkendte medarbejderdata', () => {
    expect(R1_V2_HOURLY_EMPLOYEES).toEqual([
      { id: 'T1', hourlyRate: 240, taxRate: 36, monthlyDeduction: 4500, hours: { jan: 145, feb: 148, mar: 152, apr: 154, may: 156, jun: 155 } },
      { id: 'T2', hourlyRate: 240, taxRate: 37, monthlyDeduction: 4750, hours: { jan: 155, feb: 160, mar: 163, apr: 162, may: 164, jun: 165 } },
      { id: 'T3', hourlyRate: 230, taxRate: 38, monthlyDeduction: 5000, hours: { jan: 172, feb: 174, mar: 176, apr: 178, may: 177, jun: 180 } },
      { id: 'T4', hourlyRate: 250, taxRate: 39, monthlyDeduction: 5250, hours: { jan: 172, feb: 170, mar: 176, apr: 174, may: 178, jun: 180 } },
    ]);
    expect(R1_V2_SALARIED_EMPLOYEES.map(employee => [
      employee.id,
      employee.monthlySalary,
      employee.taxRate,
      employee.monthlyDeduction,
    ])).toEqual([
      ['M1', 42000, 37, 5000],
      ['M2', 47500, 38, 5250],
      ['M3', 52500, 39, 5500],
      ['M4', 60500, 40, 5750],
    ]);
  });

  it('afleder de seks måneders R1-lønhistorik matematisk', () => {
    expect(R1_V2_SOURCE.history.map(month => [
      month.hourlyTotals.grossSalary,
      month.hourlyTotals.employeePension,
      month.hourlyTotals.employerPension,
      month.hourlyTotals.employeeAtp,
      month.hourlyTotals.employerAtp,
      month.hourlyHolidayTotals.grossHolidayPay,
    ])).toEqual([
      [154560, 6182, 12365, 396, 792, 19320],
      [156440, 6258, 12516, 396, 792, 19556],
      [160080, 6403, 12806, 396, 792, 20010],
      [160280, 6411, 12822, 396, 792, 20036],
      [162010, 6480, 12961, 396, 792, 20252],
      [163200, 6528, 13056, 396, 792, 20400],
    ]);
  });

  it('matcher B1-B9 exact postings og balancerer 9/9', () => {
    const simplified = R1_V2_EXPECTED_DOCUMENTS.map(document => document.expectedPostings.map(posting => [
      posting.side,
      posting.accountNumber,
      posting.amount,
    ]));
    expect(simplified).toEqual([
      [['debit', '6920', 113988], ['debit', '6930', 29551], ['credit', '5820', 143539]],
      [['debit', '6922', 43741], ['credit', '5820', 43741]],
      [['debit', '6923', 11632], ['credit', '5820', 11632]],
      [['debit', '2210', 156276], ['debit', '2215', 6528], ['debit', '2223', 396], ['credit', '6920', 46702], ['credit', '6930', 12502], ['credit', '6922', 6528], ['credit', '6921', 396], ['credit', '5820', 97072]],
      [['debit', '2215', 13056], ['debit', '2223', 792], ['credit', '6922', 13056], ['credit', '6921', 792]],
      [['debit', '2230', 20400], ['credit', '6930', 1632], ['credit', '6920', 7052], ['credit', '6923', 11716]],
      [['debit', '2211', 194004], ['debit', '2215', 8100], ['debit', '2223', 396], ['credit', '6920', 60693], ['credit', '6930', 15520], ['credit', '6922', 8100], ['credit', '6921', 396], ['credit', '5820', 117791]],
      [['debit', '2215', 16200], ['debit', '2223', 792], ['credit', '6922', 16200], ['credit', '6921', 792]],
      [['debit', '2235', 8500], ['credit', '6924', 8500]],
    ]);
    expect(R1_V2_EXPECTED_DOCUMENTS).toHaveLength(9);
    for (const document of R1_V2_EXPECTED_DOCUMENTS) {
      expect(document.balanced).toBe(true);
      expect(document.debitTotal).toBe(document.creditTotal);
      expect(document.expectedPostings.every(posting => Number.isInteger(posting.amount) && posting.amount > 0)).toBe(true);
    }
  });

  it('bevarer alle 13 frosne startsaldi', () => {
    expect(R1_V2_START_BALANCES).toEqual([
      { accountNumber: '2210', amount: 759656, side: 'debit' },
      { accountNumber: '2211', amount: 970020, side: 'debit' },
      { accountNumber: '2215', amount: 216704, side: 'debit' },
      { accountNumber: '2223', amount: 11880, side: 'debit' },
      { accountNumber: '2230', amount: 99174, side: 'debit' },
      { accountNumber: '2235', amount: 24000, side: 'debit' },
      { accountNumber: '5820', amount: 1500000, side: 'debit' },
      { accountNumber: '6920', amount: 113988, side: 'credit' },
      { accountNumber: '6921', amount: 11880, side: 'credit' },
      { accountNumber: '6922', amount: 43741, side: 'credit' },
      { accountNumber: '6923', amount: 11632, side: 'credit' },
      { accountNumber: '6924', amount: 174000, side: 'credit' },
      { accountNumber: '6930', amount: 29551, side: 'credit' },
    ]);
  });

  it('afleder samtlige 13 frosne slutsaldi pr. 30/6', () => {
    expect(R1_V2_ANSWER_KEY.finalBalances).toEqual([
      { accountNumber: '2210', amount: 915932, side: 'debit' },
      { accountNumber: '2211', amount: 1164024, side: 'debit' },
      { accountNumber: '2215', amount: 260588, side: 'debit' },
      { accountNumber: '2223', amount: 14256, side: 'debit' },
      { accountNumber: '2230', amount: 119574, side: 'debit' },
      { accountNumber: '2235', amount: 32500, side: 'debit' },
      { accountNumber: '5820', amount: 1086225, side: 'debit' },
      { accountNumber: '6920', amount: 114447, side: 'credit' },
      { accountNumber: '6921', amount: 14256, side: 'credit' },
      { accountNumber: '6922', amount: 43884, side: 'credit' },
      { accountNumber: '6923', amount: 11716, side: 'credit' },
      { accountNumber: '6924', amount: 182500, side: 'credit' },
      { accountNumber: '6930', amount: 29654, side: 'credit' },
    ]);
    expect(getV2Balance(R1_V2_ANSWER_KEY.finalBalances, '5820')).toEqual({
      accountNumber: '5820', amount: 1086225, side: 'debit',
    });
  });

  it('beregner driftskontienes total fra ledger til 2.506.874', () => {
    const operating = ['2210', '2211', '2215', '2223', '2230', '2235'] as const;
    const total = operating.reduce(
      (sum, accountNumber) => sum + getV2Balance(R1_V2_ANSWER_KEY.finalBalances, accountNumber).amount,
      0,
    );
    expect(total).toBe(2506874);
    expect(R1_V2_ANSWER_KEY.operatingTotal).toBe(total);
  });
});
