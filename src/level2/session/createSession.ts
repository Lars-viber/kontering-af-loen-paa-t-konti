import { deepFreezeLevel2 } from '../../domain/level2/readonly';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from '../../domain/level2/ruleset';
import { LEVEL2_SESSION_SCHEMA_VERSION } from './constants';
import { validateLevel2CaseSnapshot } from './caseValidation';
import { isValidUtcTimestamp, validateLevel2PersistedSession } from './sessionValidation';
import { validateLevel2StudentState } from './studentStateValidation';
import type { Level2CaseSnapshot, Level2PersistedSession } from './types';
import type { Level2StudentState } from '../state';
import { clonePlainData } from './validationUtils';

export function createLevel2PersistedSession(
  caseSnapshot: Level2CaseSnapshot,
  studentState: Level2StudentState,
  savedAt: string,
): Level2PersistedSession {
  if (!validateLevel2CaseSnapshot(caseSnapshot).ok) throw new TypeError('Invalid Level 2 case snapshot');
  if (!validateLevel2StudentState(studentState, caseSnapshot).ok) throw new TypeError('Invalid Level 2 student state');
  if (!isValidUtcTimestamp(savedAt)) throw new TypeError('Invalid Level 2 savedAt timestamp');
  const session: Level2PersistedSession = {
    schemaVersion: LEVEL2_SESSION_SCHEMA_VERSION,
    rulesetYear: LEVEL2_RULESET_YEAR,
    rulesetVersion: LEVEL2_RULESET_VERSION,
    generatorVersion: LEVEL2_GENERATOR_VERSION,
    variant: caseSnapshot.variant,
    caseSnapshot: clonePlainData(caseSnapshot),
    studentState: clonePlainData(studentState),
    savedAt,
  };
  const validation = validateLevel2PersistedSession(session);
  if (!validation.ok) throw new TypeError('Invalid Level 2 session: ' + validation.reason);
  return deepFreezeLevel2(session) as Level2PersistedSession;
}

