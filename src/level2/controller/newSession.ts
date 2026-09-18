import { generateLevel2Case } from '../../domain/level2/generator';
import { createInitialStudentState } from '../state';
import { createLevel2PersistedSession, type Level2PersistedSession } from '../session';
import type { Level2CaseFactory, Level2Clock } from './types';

export function createNewLevel2Session(
  variant: number,
  clock: Level2Clock,
  caseFactory: Level2CaseFactory = generateLevel2Case,
): Level2PersistedSession {
  const caseSnapshot = caseFactory(variant);
  const studentState = createInitialStudentState(caseSnapshot);
  return createLevel2PersistedSession(caseSnapshot, studentState, clock());
}
