import { describe, expect, it } from 'vitest';
import { R1_HISTORY, R1_START_BALANCES } from '../../src/domain/level2';

const expectedHourly = [
  [154560, 6182, 12365, 11838, 43848, 92296],
  [156440, 6258, 12516, 11983, 44451, 93352],
  [160080, 6403, 12806, 12262, 45663, 95356],
  [160280, 6411, 12822, 12278, 45718, 95477],
  [162010, 6480, 12961, 12411, 46295, 96428],
  [163200, 6528, 13056, 12502, 46702, 97072],
] as const;

describe('Niveau 2 R1-historik og startsaldi', () => {
  it('reproducerer de seks måneders timelønstotaler fra medarbejderdata', () => {
    expect(Object.values(R1_HISTORY).map(month => [
      month.hourlyTotals.grossSalary,
      month.hourlyTotals.employeePension,
      month.hourlyTotals.employerPension,
      month.hourlyTotals.amContribution,
      month.hourlyTotals.aTax,
      month.hourlyTotals.netPay,
    ])).toEqual(expectedHourly);
  });

  it('reproducerer månedslønnede ens for januar-juni', () => {
    for (const month of Object.values(R1_HISTORY)) {
      expect(month.salariedTotals).toMatchObject({
        grossSalary: 202500, employeePension: 8100, employerPension: 16200,
        employeeAtp: 396, employerAtp: 792, amBase: 194004,
        amContribution: 15520, aTax: 60693, netPay: 117791,
      });
    }
  });

  it('afleder drift og maj-forpligtelser; kun bank og ferieforpligtelse er caseinput', () => {
    expect(R1_START_BALANCES).toEqual([
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
});
