import { ACCOUNTS } from './accounts';
import { calculateEmployee, sumEmployees } from './calculations';
import { isValidVariant, validateSnapshot } from './invariants';
import { deepFreeze } from './readonly';
import { createVariantRng, type Rng } from './rng';
import { buildAnswerKey } from './solve';
import type { ExerciseSnapshot, PensionRate, PayrollEmployee } from './types';

export const GENERATOR_VERSION = 1 as const;
export const MIN_VARIANT = 1 as const;
export const MAX_VARIANT = 999999 as const;
const PENSION_RATES = [4, 5, 6, 8, 10] as const;

export function generateExercise(variant: number): ExerciseSnapshot {
  return generateExerciseWithRng(variant, createVariantRng(variant));
}

export function generateExerciseWithRng(variant: number, rng: Rng): ExerciseSnapshot {
  if (!isValidVariant(variant)) throw new RangeError('Variant must be an integer from 1 to 999999.');
  const employeeCount = 3 + Math.floor(rng() * 8);
  const employees: PayrollEmployee[] = [];
  for (let index = 0; index < employeeCount; index += 1) {
    const grossThousands = 28 + Math.floor(rng() * 45);
    const gross25Step = Math.floor(rng() * 20);
    const pensionRate = PENSION_RATES[Math.floor(rng() * 5)] as PensionRate;
    const taxRate = 36 + Math.floor(rng() * 7);
    const deduction = 4000 + Math.floor(rng() * 9) * 250;
    employees.push(calculateEmployee({
      grossSalary: grossThousands * 1000 + gross25Step * 25,
      pensionRate,
      taxRate,
      deduction,
    }));
  }
  const payslipTotals = sumEmployees(employees);
  const snapshot: ExerciseSnapshot = {
    generatorVersion: GENERATOR_VERSION,
    variant,
    employeeCount,
    employees,
    payslipTotals,
    accounts: ACCOUNTS,
    answerKey: buildAnswerKey(payslipTotals),
  };
  validateSnapshot(snapshot);
  return deepFreeze(snapshot) as ExerciseSnapshot;
}