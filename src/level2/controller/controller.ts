import { deepFreezeLevel2 } from '../../domain/level2/readonly';
import {
  loadLevel2Session,
  removeLevel2Session,
  saveLevel2Session,
  validateLevel2PersistedSession,
  type Level2PersistedSession,
  type Level2Storage,
} from '../session';
import { resetStudentState, type Level2StudentState } from '../state';
import { createNewLevel2Session } from './newSession';
import type {
  Level2CaseFactory,
  Level2Clock,
  Level2ControllerState,
  Level2ValidControllerState,
} from './types';

export function inspectLevel2Session(storage: Level2Storage): Level2ControllerState {
  const result = loadLevel2Session(storage);
  if (result.status === 'none') return { lifecycle: 'none', session: null, saveStatus: 'idle' };
  if (result.status === 'storageFailure') return { lifecycle: 'storageError', session: null, saveStatus: 'error' };
  if (result.status === 'invalid') {
    return {
      lifecycle: 'invalid',
      session: null,
      saveStatus: 'idle',
      invalidReason: result.reason,
      removeError: false,
    };
  }
  return { lifecycle: 'valid', session: result.session, saveStatus: 'idle' };
}

export function resumeLevel2Session(state: Level2ValidControllerState): Level2PersistedSession {
  return state.session;
}

export function startNewLevel2Session(
  storage: Level2Storage,
  variant: number,
  clock: Level2Clock,
  caseFactory?: Level2CaseFactory,
): Level2ValidControllerState {
  const session = createNewLevel2Session(variant, clock, caseFactory);
  const save = saveLevel2Session(storage, session);
  return { lifecycle: 'valid', session, saveStatus: save.ok ? 'saved' : 'error' };
}

function sessionWithStudentState(
  session: Level2PersistedSession,
  studentState: Level2StudentState,
  savedAt: string,
): Level2PersistedSession {
  const candidate: Level2PersistedSession = { ...session, studentState, savedAt };
  const validation = validateLevel2PersistedSession(candidate);
  if (!validation.ok) throw new TypeError('Invalid Level 2 controller transition: ' + validation.reason);
  return deepFreezeLevel2(candidate) as Level2PersistedSession;
}

export function applyLevel2StudentState(
  storage: Level2Storage,
  state: Level2ValidControllerState,
  nextStudentState: Level2StudentState,
  clock: Level2Clock,
): Level2ValidControllerState {
  if (nextStudentState === state.session.studentState) return state;
  const session = sessionWithStudentState(state.session, nextStudentState, clock());
  const save = saveLevel2Session(storage, session);
  return { lifecycle: 'valid', session, saveStatus: save.ok ? 'saved' : 'error' };
}

export function retryLevel2Save(
  storage: Level2Storage,
  state: Level2ValidControllerState,
): Level2ValidControllerState {
  const save = saveLevel2Session(storage, state.session);
  return { ...state, saveStatus: save.ok ? 'saved' : 'error' };
}

export function resetLevel2Session(
  storage: Level2Storage,
  state: Level2ValidControllerState,
  clock: Level2Clock,
): Level2ValidControllerState {
  const initialStudentState = resetStudentState(state.session.caseSnapshot);
  return applyLevel2StudentState(storage, state, initialStudentState, clock);
}

export function removeInvalidLevel2Session(
  storage: Level2Storage,
  state: Level2ControllerState,
): Level2ControllerState {
  if (state.lifecycle !== 'invalid') return state;
  const removed = removeLevel2Session(storage);
  return removed.ok
    ? { lifecycle: 'none', session: null, saveStatus: 'idle' }
    : { ...state, saveStatus: 'error', removeError: true };
}

export function level2PhaseLabel(session: Level2PersistedSession): string {
  const phase = session.studentState.phase;
  if (phase.kind === 'document') return 'Bilag ' + phase.activeDocumentId;
  if (phase.kind === 'checkpoint') return 'Checkpoint';
  if (phase.kind === 'finalControl') return 'Slutkontrol';
  return 'Færdig';
}
