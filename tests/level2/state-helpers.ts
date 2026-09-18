import type { Level2StateCase, Level2StudentState } from '../../src/level2/state';
import {
  CHECKPOINT_BALANCE_ACCOUNTS,
  FINAL_CONTROL_EXPECTED_REASONS,
  FINAL_CONTROL_ITEM_IDS,
  addStudentPostingRow,
  checkActiveDocument,
  checkCheckpointSection,
  checkFinalControlItem,
  createInitialStudentState,
  editCheckpointAmount,
  editCheckpointBalance,
  getLevel2CaseData,
  selectFinalControlReason,
} from '../../src/level2/state';

export function completeActiveDocument(
  source: Level2StateCase,
  state: Level2StudentState,
): Level2StudentState {
  if (state.phase.kind !== 'document') throw new Error('Expected document phase');
  const documentId = state.phase.activeDocumentId;
  const expected = getLevel2CaseData(source).documents.find(document => document.id === documentId);
  if (!expected) throw new Error('Missing expected document');
  let next = state;
  for (const posting of expected.expectedPostings) {
    next = addStudentPostingRow(next, posting.accountNumber, posting.side, String(posting.amount), posting.text);
  }
  return checkActiveDocument(source, next);
}

export function advanceToCheckpoint(source: Level2StateCase): Level2StudentState {
  let state = createInitialStudentState(source);
  for (let index = 0; index < 9; index += 1) state = completeActiveDocument(source, state);
  if (state.phase.kind !== 'checkpoint') throw new Error('Checkpoint not reached');
  return state;
}

export function completeCheckpoint(
  source: Level2StateCase,
  initial: Level2StudentState,
): Level2StudentState {
  const expected = getLevel2CaseData(source);
  let state = initial;

  for (const [field, amount] of Object.entries(expected.checkpoint.hourlyGrossPayroll)) {
    state = editCheckpointAmount(state, 'A', field as never, String(amount));
  }
  state = checkCheckpointSection(source, state, 'A');

  for (const [field, amount] of Object.entries(expected.checkpoint.salariedGrossPayroll)) {
    state = editCheckpointAmount(state, 'B', field as never, String(amount));
  }
  state = checkCheckpointSection(source, state, 'B');

  for (const [field, amount] of Object.entries(expected.checkpoint.otherPayrollCosts)) {
    state = editCheckpointAmount(state, 'C', field as never, String(amount));
  }
  state = checkCheckpointSection(source, state, 'C');

  state = editCheckpointAmount(state, 'D', 'operatingTotal', String(expected.checkpoint.operatingTotal));
  state = checkCheckpointSection(source, state, 'D');

  for (const accountNumber of CHECKPOINT_BALANCE_ACCOUNTS) {
    const balance = expected.checkpointBalances.find(candidate => candidate.accountNumber === accountNumber);
    if (!balance) throw new Error('Missing checkpoint balance');
    state = editCheckpointBalance(state, accountNumber, { rawAmount: String(balance.amount), side: balance.side });
  }
  return checkCheckpointSection(source, state, 'E');
}

export function advanceToFinalControl(source: Level2StateCase): Level2StudentState {
  let state = completeCheckpoint(source, advanceToCheckpoint(source));
  for (let index = 0; index < 4; index += 1) state = completeActiveDocument(source, state);
  if (state.phase.kind !== 'finalControl') throw new Error('Final control not reached');
  return state;
}

export function completeFinalControl(state: Level2StudentState): Level2StudentState {
  let next = state;
  for (const itemId of FINAL_CONTROL_ITEM_IDS) {
    next = selectFinalControlReason(next, itemId, FINAL_CONTROL_EXPECTED_REASONS[itemId]);
    next = checkFinalControlItem(next, itemId);
  }
  return next;
}
