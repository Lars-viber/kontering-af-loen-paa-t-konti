import { useState } from 'react';
import { generateV2Case } from '../../src/domain/level2/v2';
import {
  addV2ControllerPostingRow,
  advanceV2ControllerDocumentReview,
  checkV2ControllerCheckpointSection,
  checkV2ControllerCurrentDocument,
  completeV2ControllerLevel,
  editV2ControllerCheckpointAmount,
  editV2ControllerCheckpointBalance,
  editV2ControllerPostingRow,
  removeV2ControllerPostingRow,
  retryV2ControllerSave,
  type V2ControllerCurrentSession,
} from '../../src/level2/v2/controller';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  completeV2Level,
  createInitialV2StudentState,
  editV2CheckpointAmount,
  editV2CheckpointBalance,
  type V2CheckpointSectionId,
  type V2StudentState,
} from '../../src/level2/v2/state';
import {
  Level2V2Workspace,
  type Level2V2WorkspaceActions,
} from '../../src/level2/v2/workspace';
import {
  completeCurrentV2Document,
  advanceV2ToCheckpoint,
  completeV2Checkpoint,
} from './v2-state-helpers';
import {
  V2ControllerStorage,
  sequenceClock,
} from './v2-controller-test-helpers';

export const V2_WORKSPACE_CASE = generateV2Case(42);

export function v2WorkspaceCurrent(
  studentState: V2StudentState = createInitialV2StudentState(),
  saveStatus: V2ControllerCurrentSession['saveStatus'] = 'saved',
): V2ControllerCurrentSession {
  return {
    variant: 42,
    caseSnapshot: V2_WORKSPACE_CASE,
    studentState,
    saveStatus,
    lastSuccessfulSavedAt: saveStatus === 'saved' ? '2026-09-20T15:00:00.000Z' : null,
    lastSaveFailure: saveStatus === 'saveFailed' ? 'storageFailure' : null,
  };
}

export function v2DocumentEntryAt(number: number): V2StudentState {
  let state = createInitialV2StudentState();
  for (let current = 1; current < number; current += 1) {
    state = completeCurrentV2Document(V2_WORKSPACE_CASE.answers, state);
    state = advanceFromV2DocumentReview(state);
  }
  return state;
}

export function v2DocumentReviewAt(number: number): V2StudentState {
  return completeCurrentV2Document(V2_WORKSPACE_CASE.answers, v2DocumentEntryAt(number));
}

export function v2CheckpointState(): V2StudentState {
  return advanceV2ToCheckpoint(V2_WORKSPACE_CASE.answers);
}

export function completeV2WorkspaceSection(
  initial: V2StudentState,
  sectionId: V2CheckpointSectionId,
): V2StudentState {
  let state = initial;
  if (sectionId === 'A' || sectionId === 'B') {
    const values = V2_WORKSPACE_CASE.answers.reconciliation[sectionId];
    state = editV2CheckpointAmount(state, sectionId, 'wageAccountYtd', String(values.wageAccountYtd));
    state = editV2CheckpointAmount(state, sectionId, 'employeePensionYtd', String(values.employeePensionYtd));
    state = editV2CheckpointAmount(state, sectionId, 'employeeAtpYtd', String(values.employeeAtpYtd));
    state = editV2CheckpointAmount(state, sectionId, 'calculatedGrossPayYtd', String(values.calculatedGrossPayYtd));
  } else if (sectionId === 'C') {
    const values = V2_WORKSPACE_CASE.answers.reconciliation.C;
    state = editV2CheckpointAmount(state, 'C', 'employerPension', String(values.employerPension.bookedAmount));
    state = editV2CheckpointAmount(state, 'C', 'employerAtp', String(values.employerAtp.bookedAmount));
    state = editV2CheckpointAmount(state, 'C', 'grossHolidayPay', String(values.grossHolidayPay.bookedAmount));
    state = editV2CheckpointAmount(state, 'C', 'holidayLiabilityAdjustment', String(values.holidayLiabilityAdjustment.bookedAmount));
  } else if (sectionId === 'D') {
    state = editV2CheckpointAmount(
      state,
      'D',
      'operatingTotal',
      String(V2_WORKSPACE_CASE.answers.reconciliation.D.bookedAmount),
    );
  } else {
    for (const accountNumber of V2_CHECKPOINT_BALANCE_ACCOUNTS) {
      const value = V2_WORKSPACE_CASE.answers.reconciliation.E
        .find(item => item.accountNumber === accountNumber);
      if (!value) throw new Error('Missing balance value');
      state = editV2CheckpointBalance(state, accountNumber, {
        rawAmount: String(value.bookedAmount),
        side: value.bookedSide === 'credit' ? 'K' : 'D',
      });
    }
  }
  return checkV2CheckpointSection(V2_WORKSPACE_CASE.answers, state, sectionId);
}

export function v2CheckpointReviewState(): V2StudentState {
  return completeV2Checkpoint(V2_WORKSPACE_CASE.answers, v2CheckpointState());
}

export function v2CompletedState(): V2StudentState {
  return completeV2Level(v2CheckpointReviewState());
}

export function inertV2WorkspaceActions(
  overrides: Partial<Level2V2WorkspaceActions> = {},
): Level2V2WorkspaceActions {
  return {
    addPosting: () => undefined,
    editPosting: () => undefined,
    removePosting: () => undefined,
    checkDocument: () => undefined,
    advanceDocument: () => undefined,
    editCheckpointAmount: () => undefined,
    editCheckpointBalance: () => undefined,
    checkCheckpointSection: () => undefined,
    complete: () => undefined,
    retrySave: () => undefined,
    ...overrides,
  };
}

export function V2WorkspaceHarness({
  initial = v2WorkspaceCurrent(),
  storage = new V2ControllerStorage(),
}: {
  readonly initial?: V2ControllerCurrentSession;
  readonly storage?: V2ControllerStorage;
}) {
  const [current, setCurrent] = useState(initial);
  const clock = sequenceClock(100);
  const update = (
    transition: (value: V2ControllerCurrentSession) => V2ControllerCurrentSession,
  ) => setCurrent(value => transition(value));
  const actions: Level2V2WorkspaceActions = {
    addPosting: (accountNumber, side, rawAmount, text) => update(value =>
      addV2ControllerPostingRow(storage, value, clock, accountNumber, side, rawAmount, text)),
    editPosting: (rowId, changes) => update(value =>
      editV2ControllerPostingRow(storage, value, clock, rowId, changes)),
    removePosting: rowId => update(value =>
      removeV2ControllerPostingRow(storage, value, clock, rowId)),
    checkDocument: () => update(value =>
      checkV2ControllerCurrentDocument(storage, value, clock)),
    advanceDocument: () => update(value =>
      advanceV2ControllerDocumentReview(storage, value, clock)),
    editCheckpointAmount: (sectionId, field, rawAmount) => update(value =>
      editV2ControllerCheckpointAmount(storage, value, clock, sectionId, field, rawAmount)),
    editCheckpointBalance: (accountNumber, changes) => update(value =>
      editV2ControllerCheckpointBalance(storage, value, clock, accountNumber, changes)),
    checkCheckpointSection: sectionId => update(value =>
      checkV2ControllerCheckpointSection(storage, value, clock, sectionId)),
    complete: () => update(value => completeV2ControllerLevel(storage, value, clock)),
    retrySave: () => update(value => retryV2ControllerSave(storage, value, clock)),
  };
  return <Level2V2Workspace
    variant={current.variant}
    source={current.caseSnapshot.source}
    studentState={current.studentState}
    saveStatus={current.saveStatus}
    actions={actions}
  />;
}
