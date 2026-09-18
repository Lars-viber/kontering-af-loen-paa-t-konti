import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_IDS, GENERATOR_VERSION, generateExercise, generateExerciseWithRng,
  isValidVariant, validateSnapshot,
} from '../src/domain/payroll';

describe('Variantvalidering', () => {
  it.each([1, 42, 999999])('accepterer %s', variant => expect(isValidVariant(variant)).toBe(true));
  it.each([0, 1000000, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('afviser %s', variant => {
    expect(isValidVariant(variant)).toBe(false);
    expect(() => generateExercise(variant)).toThrow(RangeError);
  });
});

describe('Deterministisk generator v1', () => {
  it('har én central version og deterministisk gentagelse 100 gange', () => {
    expect(GENERATOR_VERSION).toBe(1);
    const expected = generateExercise(42);
    for (let index = 0; index < 100; index += 1) expect(generateExercise(42)).toEqual(expected);
  });

  it('producerer variation i et passende sample', () => {
    const serialized = new Set(Array.from({ length: 50 }, (_, index) => JSON.stringify(generateExercise(index + 1))));
    expect(serialized.size).toBeGreaterThan(45);
  });

  it('bruger præcis 1 + employeeCount × 5 draws', () => {
    let draws = 0;
    const snapshot = generateExerciseWithRng(42, () => {
      draws += 1;
      return 0.5;
    });
    expect(draws).toBe(1 + snapshot.employeeCount * 5);
  });

  it('returnerer serialiserbart, rekursivt frosset data', () => {
    const snapshot = generateExercise(1);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(visit);
    };
    visit(snapshot);
    expect(Reflect.set(snapshot.employees[0], 'grossSalary', 1)).toBe(false);
  });

  it('validerer facitkonti, totaler og hard invariants', () => {
    for (const variant of [1, 2, 3, 42, 999999]) {
      const snapshot = generateExercise(variant);
      expect(() => validateSnapshot(snapshot)).not.toThrow();
      expect(Object.keys(snapshot.answerKey).sort()).toEqual([...ACCOUNT_IDS].sort());
      const debit = Object.values(snapshot.answerKey).reduce((sum, posting) => sum + posting.debit, 0);
      const credit = Object.values(snapshot.answerKey).reduce((sum, posting) => sum + posting.credit, 0);
      expect(debit).toBe(snapshot.payslipTotals.grossSalary);
      expect(credit).toBe(snapshot.payslipTotals.grossSalary);
    }
  });

  it('afviser en præcis invariantfejl uden silent correction', () => {
    const snapshot = generateExercise(1);
    const broken = JSON.parse(JSON.stringify(snapshot));
    broken.employees[0].atp = 100;
    expect(() => validateSnapshot(broken)).toThrow(/employee 0: ATP/);
  });
});