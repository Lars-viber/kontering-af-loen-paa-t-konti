import { describe, expect, it } from 'vitest';
import { buildAnswerKey, calculateEmployee, sumEmployees } from '../src/domain/payroll';

describe('J0 manuelt eksempel', () => {
  const employees = [
    calculateEmployee({ grossSalary: 28000, pensionRate: 4, taxRate: 36, deduction: 4000 }),
    calculateEmployee({ grossSalary: 35000, pensionRate: 5, taxRate: 37, deduction: 4250 }),
    calculateEmployee({ grossSalary: 42475, pensionRate: 8, taxRate: 42, deduction: 6000 }),
  ];

  it('beregner hver medarbejder præcist', () => {
    expect(employees).toEqual([
      { grossSalary: 28000, pensionRate: 4, taxRate: 36, deduction: 4000, atp: 99, pension: 1125, amBase: 26776, amContribution: 2142, aTax: 7428, netPay: 17206 },
      { grossSalary: 35000, pensionRate: 5, taxRate: 37, deduction: 4250, atp: 99, pension: 1750, amBase: 33151, amContribution: 2652, aTax: 9712, netPay: 20787 },
      { grossSalary: 42475, pensionRate: 8, taxRate: 42, deduction: 6000, atp: 99, pension: 3400, amBase: 38976, amContribution: 3118, aTax: 12540, netPay: 23318 },
    ]);
  });

  it('summerer individuelt afrundede beløb præcist', () => {
    expect(sumEmployees(employees)).toEqual({
      grossSalary: 105475, atp: 297, pension: 6275, amBase: 98903,
      amContribution: 7912, aTax: 29680, netPay: 61311,
    });
  });

  it('bygger det låste facit og balancerer med bruttolønnen', () => {
    const totals = sumEmployees(employees);
    const answer = buildAnswerKey(totals);
    expect(answer).toEqual({
      '2210': { debit: 98903, credit: 0 },
      '2215': { debit: 6275, credit: 0 },
      '2223': { debit: 297, credit: 0 },
      '6920': { debit: 0, credit: 29680 },
      '6921': { debit: 0, credit: 297 },
      '6922': { debit: 0, credit: 6275 },
      '6930': { debit: 0, credit: 7912 },
      '5820': { debit: 0, credit: 61311 },
    });
    expect(Object.values(answer).reduce((sum, posting) => sum + posting.debit, 0)).toBe(105475);
    expect(Object.values(answer).reduce((sum, posting) => sum + posting.credit, 0)).toBe(105475);
  });

  it('muterer ikke input', () => {
    const input = Object.freeze({ grossSalary: 28000, pensionRate: 4 as const, taxRate: 36, deduction: 4000 });
    expect(() => calculateEmployee(input)).not.toThrow();
    expect(input).toEqual({ grossSalary: 28000, pensionRate: 4, taxRate: 36, deduction: 4000 });
  });
});