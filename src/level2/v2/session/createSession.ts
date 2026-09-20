import { deepFreezeLevel2 } from '../../../domain/level2/readonly';
import {
  V2_GENERATOR_VERSION,
  V2_RULESET_VERSION,
  V2_RULESET_YEAR,
} from '../../../domain/level2/v2/constants';
import type { V2StudentState } from '../state';
import { V2_SESSION_SCHEMA_VERSION } from './constants';
import { validateV2SessionCaseSnapshot } from './caseValidation';
import {
  isValidV2UtcTimestamp,
  validateV2PersistedSession,
} from './sessionValidation';
import { validateV2SessionStudentState } from './studentStateValidation';
import type {
  V2PersistedSession,
  V2SessionCaseSnapshot,
} from './types';
import { clonePlainData } from './validationUtils';

export function createV2PersistedSession(
  caseSnapshot: V2SessionCaseSnapshot,
  studentState: V2StudentState,
  savedAt: string,
): V2PersistedSession {
  if (!validateV2SessionCaseSnapshot(caseSnapshot).ok) {
    throw new TypeError('Invalid V2.1 case snapshot');
  }
  if (!validateV2SessionStudentState(studentState, caseSnapshot).ok) {
    throw new TypeError('Invalid V2.1 student state');
  }
  if (!isValidV2UtcTimestamp(savedAt)) {
    throw new TypeError('Invalid V2.1 savedAt timestamp');
  }
  const session: V2PersistedSession = {
    schemaVersion: V2_SESSION_SCHEMA_VERSION,
    rulesetYear: V2_RULESET_YEAR,
    rulesetVersion: V2_RULESET_VERSION,
    generatorVersion: V2_GENERATOR_VERSION,
    variant: caseSnapshot.variant,
    caseSnapshot: clonePlainData(caseSnapshot),
    studentState: clonePlainData(studentState),
    savedAt,
  };
  const validation = validateV2PersistedSession(session);
  if (!validation.ok) throw new TypeError('Invalid V2.1 session: ' + validation.reason);
  return deepFreezeLevel2(session) as V2PersistedSession;
}
