import { generateLevel2Case } from '../../src/domain/level2';
import { createInitialStudentState, type Level2StudentState } from '../../src/level2/state';
import {
  createLevel2PersistedSession,
  type Level2PersistedSession,
} from '../../src/level2/session';

export const SESSION_CASE_42 = generateLevel2Case(42);
export const SESSION_TIMESTAMP = '2026-09-18T12:34:56.000Z';

export function createTestSession(
  studentState: Level2StudentState = createInitialStudentState(SESSION_CASE_42),
): Level2PersistedSession {
  return createLevel2PersistedSession(SESSION_CASE_42, studentState, SESSION_TIMESTAMP);
}

export function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

