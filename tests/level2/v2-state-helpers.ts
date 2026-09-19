import type { V2AnswerKey } from '../../src/domain/level2/v2';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  createInitialV2StudentState,
  editV2CheckpointAmount,
  editV2CheckpointBalance,
  type V2StudentState,
} from '../../src/level2/v2/state';

export function completeCurrentV2Document(
  answers: V2AnswerKey,
  state: V2StudentState,
): V2StudentState {
  if (state.phase !== 'documentEntry' || state.currentDocumentId === null) {
    throw new Error('Expected V2.1 document entry');
  }
  const expected = answers.documents.find(document => document.id === state.currentDocumentId);
  if (!expected) throw new Error('Missing V2.1 answer document');
  let next = state;
  for (const posting of expected.expectedPostings) {
    next = addV2StudentPostingRow(
      next,
      posting.accountNumber,
      posting.side,
      String(posting.amount),
      posting.text,
    );
  }
  next = checkV2CurrentDocument(answers, next);
  if (next.phase !== 'documentReview') throw new Error('V2.1 document did not reach review');
  return next;
}

export function advanceV2ToCheckpoint(answers: V2AnswerKey): V2StudentState {
  let state = createInitialV2StudentState();
  for (let index = 0; index < answers.documents.length; index += 1) {
    state = completeCurrentV2Document(answers, state);
    state = advanceFromV2DocumentReview(state);
  }
  if (state.phase !== 'checkpoint') throw new Error('V2.1 checkpoint not reached');
  return state;
}

export function completeV2Checkpoint(
  answers: V2AnswerKey,
  initial: V2StudentState,
): V2StudentState {
  let state = initial;
  for (const sectionId of ['A', 'B'] as const) {
    const expected = answers.reconciliation[sectionId];
    state = editV2CheckpointAmount(state, sectionId, 'wageAccountYtd', String(expected.wageAccountYtd));
    state = editV2CheckpointAmount(state, sectionId, 'employeePensionYtd', String(expected.employeePensionYtd));
    state = editV2CheckpointAmount(state, sectionId, 'employeeAtpYtd', String(expected.employeeAtpYtd));
    state = editV2CheckpointAmount(state, sectionId, 'calculatedGrossPayYtd', String(expected.calculatedGrossPayYtd));
    state = checkV2CheckpointSection(answers, state, sectionId);
  }
  const expectedC = answers.reconciliation.C;
  state = editV2CheckpointAmount(state, 'C', 'employerPension', String(expectedC.employerPension.bookedAmount));
  state = editV2CheckpointAmount(state, 'C', 'employerAtp', String(expectedC.employerAtp.bookedAmount));
  state = editV2CheckpointAmount(state, 'C', 'grossHolidayPay', String(expectedC.grossHolidayPay.bookedAmount));
  state = editV2CheckpointAmount(
    state,
    'C',
    'holidayLiabilityAdjustment',
    String(expectedC.holidayLiabilityAdjustment.bookedAmount),
  );
  state = checkV2CheckpointSection(answers, state, 'C');
  state = editV2CheckpointAmount(state, 'D', 'operatingTotal', String(answers.reconciliation.D.bookedAmount));
  state = checkV2CheckpointSection(answers, state, 'D');
  for (const accountNumber of V2_CHECKPOINT_BALANCE_ACCOUNTS) {
    const expected = answers.reconciliation.E.find(item => item.accountNumber === accountNumber);
    if (!expected) throw new Error('Missing V2.1 balance answer');
    state = editV2CheckpointBalance(state, accountNumber, {
      rawAmount: String(expected.bookedAmount),
      side: expected.bookedSide === 'credit' ? 'K' : 'D',
    });
  }
  state = checkV2CheckpointSection(answers, state, 'E');
  if (state.phase !== 'checkpointReview') throw new Error('V2.1 checkpoint review not reached');
  return state;
}
