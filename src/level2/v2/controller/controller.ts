import type {
  V2AccountNumber,
  V2PostingSide,
} from '../../../domain/level2/v2';
import {
  createV2PersistedSession,
  detectLegacyV1Session,
  loadV2Session,
  saveV2Session,
  type V2Storage,
} from '../session';
import {
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  completeV2Level,
  createInitialV2StudentState,
  editV2CheckpointAmount,
  editV2CheckpointBalance,
  editV2StudentPostingRow,
  removeV2StudentPostingRow,
  type V2AmountCheckpointSectionId,
  type V2CheckpointAmountField,
  type V2CheckpointBalanceAccount,
  type V2CheckpointBalanceSide,
  type V2CheckpointSectionId,
  type V2PostingRowChanges,
  type V2StudentState,
} from '../state';
import { createNewV2ControllerRuntime } from './newSession';
import {
  browserV2ControllerUint32,
  randomV2ControllerVariant,
} from './randomVariant';
import {
  currentFromPersistedV2Session,
  type V2ControllerCaseFactory,
  type V2ControllerClock,
  type V2ControllerCurrentSession,
  type V2ControllerLegacyPresence,
  type V2ControllerLoadResult,
  type V2ControllerStartResult,
  type V2ControllerUint32Source,
} from './types';

function legacyPresence(storage: V2Storage): V2ControllerLegacyPresence {
  const legacy = detectLegacyV1Session(storage);
  return legacy.status === 'available' ? legacy.legacyV1Present : null;
}

function persistV2ControllerState(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  studentState: V2StudentState,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  const savedAt = clock();
  const persisted = createV2PersistedSession(current.caseSnapshot, studentState, savedAt);
  const save = saveV2Session(storage, persisted);
  if (save.ok) {
    return {
      ...current,
      studentState,
      saveStatus: 'saved',
      lastSuccessfulSavedAt: savedAt,
      lastSaveFailure: null,
    };
  }
  return {
    ...current,
    studentState,
    saveStatus: 'saveFailed',
    lastSaveFailure: save.reason,
  };
}

function applyV2ControllerTransition(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  nextStudentState: V2StudentState,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  if (nextStudentState === current.studentState) return current;
  return persistV2ControllerState(storage, current, nextStudentState, clock);
}

export function startNewV2ControllerSession(
  storage: V2Storage,
  variant: number,
  clock: V2ControllerClock,
  caseFactory?: V2ControllerCaseFactory,
): V2ControllerStartResult {
  const created = createNewV2ControllerRuntime(variant, caseFactory);
  if (!created.ok) return created;
  const current: V2ControllerCurrentSession = {
    ...created.runtime,
    saveStatus: 'saveFailed',
    lastSuccessfulSavedAt: null,
    lastSaveFailure: null,
  };
  return {
    ok: true,
    current: persistV2ControllerState(
      storage,
      current,
      current.studentState,
      clock,
    ),
  };
}

export function startRandomV2ControllerSession(
  storage: V2Storage,
  clock: V2ControllerClock,
  randomSource: V2ControllerUint32Source = browserV2ControllerUint32,
  caseFactory?: V2ControllerCaseFactory,
): V2ControllerStartResult {
  let variant: number;
  try {
    variant = randomV2ControllerVariant(randomSource);
  } catch {
    return { ok: false, reason: 'randomFailure' };
  }
  return startNewV2ControllerSession(storage, variant, clock, caseFactory);
}

export function loadCurrentV2ControllerSession(
  storage: V2Storage,
): V2ControllerLoadResult {
  const legacyV1Present = legacyPresence(storage);
  const loaded = loadV2Session(storage);
  if (loaded.status === 'missing') return { status: 'missing', legacyV1Present };
  if (loaded.status === 'storageFailure') return { status: 'storageFailure', legacyV1Present };
  if (loaded.status === 'invalid') {
    return {
      status: 'invalid',
      reason: loaded.reason,
      legacyV1Present,
    };
  }
  return {
    status: 'loaded',
    current: currentFromPersistedV2Session(loaded.session),
    legacyV1Present,
  };
}

export function resetV2ControllerSession(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  return persistV2ControllerState(storage, current, createInitialV2StudentState(), clock);
}

export function retryV2ControllerSave(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  return persistV2ControllerState(storage, current, current.studentState, clock);
}

export function addV2ControllerPostingRow(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
  rawAmount = '',
  text = '',
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    addV2StudentPostingRow(current.studentState, accountNumber, side, rawAmount, text),
    clock,
  );
}

export function editV2ControllerPostingRow(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  rowId: number,
  changes: V2PostingRowChanges,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    editV2StudentPostingRow(current.studentState, rowId, changes),
    clock,
  );
}

export function removeV2ControllerPostingRow(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  rowId: number,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    removeV2StudentPostingRow(current.studentState, rowId),
    clock,
  );
}

export function checkV2ControllerCurrentDocument(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    checkV2CurrentDocument(current.caseSnapshot.answers, current.studentState),
    clock,
  );
}

export function advanceV2ControllerDocumentReview(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    advanceFromV2DocumentReview(current.studentState),
    clock,
  );
}

export function editV2ControllerCheckpointAmount(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  sectionId: V2AmountCheckpointSectionId,
  field: V2CheckpointAmountField,
  rawAmount: string,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    editV2CheckpointAmount(current.studentState, sectionId, field, rawAmount),
    clock,
  );
}

export function editV2ControllerCheckpointBalance(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  accountNumber: V2CheckpointBalanceAccount,
  changes: { readonly rawAmount?: string; readonly side?: V2CheckpointBalanceSide },
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    editV2CheckpointBalance(current.studentState, accountNumber, changes),
    clock,
  );
}

export function checkV2ControllerCheckpointSection(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  sectionId: V2CheckpointSectionId,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    checkV2CheckpointSection(current.caseSnapshot.answers, current.studentState, sectionId),
    clock,
  );
}

export function completeV2ControllerLevel(
  storage: V2Storage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  return applyV2ControllerTransition(
    storage,
    current,
    completeV2Level(current.studentState),
    clock,
  );
}
