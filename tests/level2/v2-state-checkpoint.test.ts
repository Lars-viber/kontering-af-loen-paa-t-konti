import { describe, expect, it } from 'vitest';
import {
  R1_V2_ANSWER_KEY,
  generateV2Case,
} from '../../src/domain/level2/v2';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  completeV2Level,
  editV2CheckpointAmount,
  editV2CheckpointBalance,
  editV2StudentPostingRow,
  parseV2CheckpointAmount,
  parseV2PostingAmount,
  removeV2StudentPostingRow,
} from '../../src/level2/v2/state';
import {
  advanceV2ToCheckpoint,
  completeV2Checkpoint,
} from './v2-state-helpers';

function fillGrossSection(
  answers: typeof R1_V2_ANSWER_KEY,
  state: ReturnType<typeof advanceV2ToCheckpoint>,
  sectionId: 'A' | 'B',
): ReturnType<typeof advanceV2ToCheckpoint> {
  const expected = answers.reconciliation[sectionId];
  let next = state;
  next = editV2CheckpointAmount(next, sectionId, 'wageAccountYtd', String(expected.wageAccountYtd));
  next = editV2CheckpointAmount(next, sectionId, 'employeePensionYtd', String(expected.employeePensionYtd));
  next = editV2CheckpointAmount(next, sectionId, 'employeeAtpYtd', String(expected.employeeAtpYtd));
  next = editV2CheckpointAmount(
    next,
    sectionId,
    'calculatedGrossPayYtd',
    String(expected.calculatedGrossPayYtd),
  );
  return next;
}

describe('V2.1 beløbsparser', () => {
  it.each([
    ['145812', 145812],
    ['145.812', 145812],
    ['145 812', 145812],
    ['145 812', 145812],
    ['145 812', 145812],
  ])('accepterer postingbeløbet %s og bevarer raw input i state', (raw, expected) => {
    expect(parseV2PostingAmount(raw)).toEqual({ kind: 'valid', value: expected });
  });

  it.each(['', '0', '-1', '1,5', 'NaN', 'Infinity', 'tekst', '1e5', '001'])(
    'afviser postingbeløbet %s',
    raw => {
      const expectedKind = raw === '' ? 'empty' : 'invalid';
      expect(parseV2PostingAmount(raw).kind).toBe(expectedKind);
    },
  );

  it('accepterer nul i checkpoint, men afviser negative, decimaler og tekst', () => {
    expect(parseV2CheckpointAmount('0')).toEqual({ kind: 'valid', value: 0 });
    for (const raw of ['-1', '1,5', 'NaN', 'tekst']) {
      expect(parseV2CheckpointAmount(raw)).toEqual({ kind: 'invalid' });
    }
  });
});

describe('V2.1 checkpoint review og explicit completion', () => {
  it('låser korrekte sektioner individuelt og holder øvrige editable', () => {
    let state = advanceV2ToCheckpoint(R1_V2_ANSWER_KEY);
    state = fillGrossSection(R1_V2_ANSWER_KEY, state, 'A');
    state = checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'A');

    state = editV2CheckpointAmount(state, 'B', 'wageAccountYtd', '1');
    state = checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'B');

    for (const accountNumber of V2_CHECKPOINT_BALANCE_ACCOUNTS) {
      const expected = R1_V2_ANSWER_KEY.reconciliation.E
        .find(item => item.accountNumber === accountNumber);
      if (!expected) throw new Error('Missing balance answer');
      state = editV2CheckpointBalance(state, accountNumber, {
        rawAmount: String(expected.bookedAmount),
        side: 'K',
      });
    }
    state = checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'E');

    expect(state.phase).toBe('checkpoint');
    expect(state.checkpoint.A.status).toBe('correct');
    expect(state.checkpoint.B.status).toBe('incorrect');
    expect(state.checkpoint.C.status).toBe('unchecked');
    expect(state.checkpoint.D.status).toBe('unchecked');
    expect(state.checkpoint.E.status).toBe('correct');

    expect(editV2CheckpointAmount(state, 'A', 'wageAccountYtd', '1')).toBe(state);
    expect(editV2CheckpointBalance(state, '6920', { rawAmount: '1' })).toBe(state);
    const edited = editV2CheckpointAmount(state, 'B', 'wageAccountYtd', '2');
    expect(edited.checkpoint.B.status).toBe('unchecked');
  });

  it('graderer den nye C fuldt, lader incorrect være editable og låser correct', () => {
    const expected = R1_V2_ANSWER_KEY.reconciliation.C;
    let state = advanceV2ToCheckpoint(R1_V2_ANSWER_KEY);
    const fields = [
      ['pensionBookBalance', expected.pension.bookedAmount],
      ['hourlyEmployeePensionYtd', expected.pension.hourlyEmployeePensionYtd],
      ['hourlyEmployerPensionYtd', expected.pension.hourlyEmployerPensionYtd],
      ['salariedEmployeePensionYtd', expected.pension.salariedEmployeePensionYtd],
      ['salariedEmployerPensionYtd', expected.pension.salariedEmployerPensionYtd],
      ['atpBookBalance', expected.atp.bookedAmount],
      ['hourlyEmployeeAtpYtd', expected.atp.hourlyEmployeeAtpYtd],
      ['hourlyEmployerAtpYtd', expected.atp.hourlyEmployerAtpYtd],
      ['salariedEmployeeAtpYtd', expected.atp.salariedEmployeeAtpYtd],
      ['salariedEmployerAtpYtd', expected.atp.salariedEmployerAtpYtd],
      ['holidayPayBookBalance', expected.holidayPay.bookedAmount],
      ['holidayPayGrossYtd', expected.holidayPay.grossHolidayPayYtd],
    ] as const;
    for (const [field, amount] of fields) {
      state = editV2CheckpointAmount(state, 'C', field, String(amount));
    }
    state = editV2CheckpointAmount(state, 'C', 'holidayPayGrossYtd', '1');
    state = checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'C');
    expect(state.checkpoint.C.status).toBe('incorrect');

    state = editV2CheckpointAmount(
      state,
      'C',
      'holidayPayGrossYtd',
      String(expected.holidayPay.grossHolidayPayYtd),
    );
    expect(state.checkpoint.C.status).toBe('unchecked');
    state = checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'C');
    expect(state.checkpoint.C.status).toBe('correct');
    expect(editV2CheckpointAmount(state, 'C', 'pensionBookBalance', '1')).toBe(state);
  });
  it('går til checkpointReview, bevarer inputs og venter på explicit complete', () => {
    const checkpoint = advanceV2ToCheckpoint(R1_V2_ANSWER_KEY);
    const review = completeV2Checkpoint(R1_V2_ANSWER_KEY, checkpoint);
    expect(review.phase).toBe('checkpointReview');
    expect(review.currentDocumentId).toBeNull();
    expect(Object.values(review.checkpoint).every(section => section.status === 'correct')).toBe(true);
    expect(review.checkpoint.A.values.wageAccountYtd)
      .toBe(String(R1_V2_ANSWER_KEY.reconciliation.A.wageAccountYtd));

    expect(editV2CheckpointAmount(review, 'A', 'wageAccountYtd', '1')).toBe(review);
    expect(editV2CheckpointBalance(review, '6920', { rawAmount: '1' })).toBe(review);
    expect(checkV2CheckpointSection(R1_V2_ANSWER_KEY, review, 'A')).toBe(review);
    expect(review.phase).toBe('checkpointReview');

    const completed = completeV2Level(review);
    expect(completed.phase).toBe('completed');
    expect(completed.currentDocumentId).toBeNull();
    expect(completed.checkpoint).toEqual(review.checkpoint);
  });

  it('gør completed write-protected for alle stateactions', () => {
    const review = completeV2Checkpoint(
      R1_V2_ANSWER_KEY,
      advanceV2ToCheckpoint(R1_V2_ANSWER_KEY),
    );
    const state = completeV2Level(review);
    const rowId = state.documents[0].rows[0].rowId;

    expect(addV2StudentPostingRow(state, '2210', 'debit', '1')).toBe(state);
    expect(editV2StudentPostingRow(state, rowId, { rawAmount: '1' })).toBe(state);
    expect(removeV2StudentPostingRow(state, rowId)).toBe(state);
    expect(checkV2CurrentDocument(R1_V2_ANSWER_KEY, state)).toBe(state);
    expect(advanceFromV2DocumentReview(state)).toBe(state);
    expect(editV2CheckpointAmount(state, 'A', 'wageAccountYtd', '1')).toBe(state);
    expect(editV2CheckpointBalance(state, '6920', { rawAmount: '1', side: 'D' })).toBe(state);
    expect(checkV2CheckpointSection(R1_V2_ANSWER_KEY, state, 'A')).toBe(state);
    expect(completeV2Level(state)).toBe(state);
  });

  it('gennemfører variant 42 til checkpointReview uden at state importerer generatoren', () => {
    const generated = generateV2Case(42);
    const checkpoint = advanceV2ToCheckpoint(generated.answers);
    const review = completeV2Checkpoint(generated.answers, checkpoint);
    expect(review.phase).toBe('checkpointReview');
    expect(review.checkpoint.D.values.operatingTotal)
      .toBe(String(generated.answers.reconciliation.D.operatingTotal));
    expect(completeV2Level(review).phase).toBe('completed');
  });
});
