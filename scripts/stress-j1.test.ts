import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateExercise, validateSnapshot } from '../src/domain/payroll';

describe('J1 generatorstress', () => {
  it('validerer 4.000 varianter og alle forventede udfald', () => {
    const employeeCounts = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 3, 0])) as Record<string, number>;
    const pensionRates = Object.fromEntries([4, 5, 6, 8, 10].map(value => [value, 0])) as Record<string, number>;
    const taxRates = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [index + 36, 0])) as Record<string, number>;
    const deductions = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [4000 + index * 250, 0])) as Record<string, number>;
    let totalEmployees = 0;
    let minGrossSalary = Number.POSITIVE_INFINITY;
    let maxGrossSalary = 0;

    for (let variant = 1; variant <= 4000; variant += 1) {
      const snapshot = generateExercise(variant);
      expect(() => validateSnapshot(snapshot)).not.toThrow();
      employeeCounts[snapshot.employeeCount] += 1;
      totalEmployees += snapshot.employeeCount;
      for (const employee of snapshot.employees) {
        pensionRates[employee.pensionRate] += 1;
        taxRates[employee.taxRate] += 1;
        deductions[employee.deduction] += 1;
        minGrossSalary = Math.min(minGrossSalary, employee.grossSalary);
        maxGrossSalary = Math.max(maxGrossSalary, employee.grossSalary);
        expect(employee.aTax).toBeGreaterThanOrEqual(0);
        expect(employee.netPay).toBeGreaterThanOrEqual(0);
      }
      const debit = Object.values(snapshot.answerKey).reduce((sum, posting) => sum + posting.debit, 0);
      const credit = Object.values(snapshot.answerKey).reduce((sum, posting) => sum + posting.credit, 0);
      expect(debit).toBe(credit);
    }

    expect(Object.values(employeeCounts).every(count => count > 0)).toBe(true);
    expect(Object.values(pensionRates).every(count => count > 0)).toBe(true);
    expect(Object.values(taxRates).every(count => count > 0)).toBe(true);
    expect(Object.values(deductions).every(count => count > 0)).toBe(true);

    const report = {
      variants: 4000,
      successful: 4000,
      generatorFailures: 0,
      invariantFailures: 0,
      debitCreditFailures: 0,
      negativeTaxFailures: 0,
      negativeNetPayFailures: 0,
      totalEmployees,
      employeeCounts,
      pensionRates,
      taxRates,
      deductions,
      minGrossSalary,
      maxGrossSalary,
    };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/j1-stress.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  });
});