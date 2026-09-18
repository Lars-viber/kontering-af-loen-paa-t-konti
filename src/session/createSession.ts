import { generateExercise, type ExerciseSnapshot } from '../domain/payroll';
import { deepFreeze } from '../domain/payroll/readonly';
import { SCHEMA_VERSION } from './constants';
import { createInitialStudentState } from './studentState';
import type { PayrollSession } from './types';

export type ExerciseGenerator = (variant: number) => ExerciseSnapshot;

export function createSessionFromVariant(
  variant: number,
  now: () => string = () => new Date().toISOString(),
  generator: ExerciseGenerator = generateExercise,
): PayrollSession {
  const exerciseSnapshot = generator(variant);
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: exerciseSnapshot.generatorVersion,
    variant: exerciseSnapshot.variant,
    exerciseSnapshot,
    studentState: createInitialStudentState(),
    completed: false,
    savedAt: now(),
  }) as PayrollSession;
}

