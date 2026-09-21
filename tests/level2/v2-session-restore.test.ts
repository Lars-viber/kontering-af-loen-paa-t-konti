import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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
  selectAllV2StudentDerivedBalances,
  type V2StudentState,
} from '../../src/level2/v2/state';
import {
  createV2PersistedSession,
  decodeV2Session,
  encodeV2Session,
} from '../../src/level2/v2/session';
import {
  advanceV2ToCheckpoint,
  completeCurrentV2Document,
  completeV2Checkpoint,
} from './v2-state-helpers';
import {
  V2_SESSION_CASE_42,
  V2_SESSION_TIMESTAMP,
  createV2TestSession,
} from './v2-session-test-helpers';

function roundtrip(state: V2StudentState): V2StudentState {
  const session = createV2PersistedSession(
    V2_SESSION_CASE_42,
    state,
    V2_SESSION_TIMESTAMP,
  );
  const decoded = decodeV2Session(encodeV2Session(session));
  if (!decoded.ok) throw new Error('Expected valid V2.1 session: ' + decoded.reason);
  expect(decoded.value.caseSnapshot).toEqual(V2_SESSION_CASE_42);
  expect(decoded.value.studentState).toEqual(state);
  return decoded.value.studentState;
}

function reviewDocument(documentNumber: number): V2StudentState {
  let state = createInitialV2StudentState();
  for (let index = 1; index <= documentNumber; index += 1) {
    state = completeCurrentV2Document(V2_SESSION_CASE_42.answers, state);
    if (index < documentNumber) state = advanceFromV2DocumentReview(state);
  }
  return state;
}

describe('V2.1 document state restore', () => {
  it('roundtripper partial documentEntry med raw strings og mixed statuses', () => {
    const expected = V2_SESSION_CASE_42.answers.documents[0].expectedPostings;
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(
      state,
      expected[0].accountNumber,
      expected[0].side,
      '10.000',
      'første rå række',
    );
    state = addV2StudentPostingRow(
      state,
      expected[0].accountNumber,
      expected[0].side,
      String(expected[0].amount - 10000),
      'anden rå række',
    );
    state = addV2StudentPostingRow(
      state,
      expected[1].accountNumber,
      expected[1].side,
      '1',
      'forkert gruppe',
    );
    state = checkV2CurrentDocument(V2_SESSION_CASE_42.answers, state);
    expect(state.phase).toBe('documentEntry');
    expect(state.documents[0].groups.map(group => group.status)).toContain('correct');
    expect(state.documents[0].groups.map(group => group.status)).toContain('incorrect');

    const restored = roundtrip(state);
    expect(restored.phase).toBe('documentEntry');
    expect(restored.currentDocumentId).toBe('B1');
    expect(restored.documents[0].rows.map(row => row.rawAmount))
      .toEqual(['10.000', String(expected[0].amount - 10000), '1']);
    expect(restored.documents[0].groups).toEqual(state.documents[0].groups);
  });

  it('bevarer split rows separat og korrekt gruppelåsning', () => {
    const expected = V2_SESSION_CASE_42.answers.documents[0].expectedPostings[0];
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(state, expected.accountNumber, expected.side, '10000');
    state = addV2StudentPostingRow(
      state,
      expected.accountNumber,
      expected.side,
      String(expected.amount - 10000),
    );
    state = checkV2CurrentDocument(V2_SESSION_CASE_42.answers, state);
    const restored = roundtrip(state);
    const rows = restored.documents[0].rows.filter(row =>
      row.accountNumber === expected.accountNumber && row.side === expected.side,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.rowId)).toEqual([1, 2]);
    expect(restored.documents[0].groups.find(group =>
      group.accountNumber === expected.accountNumber && group.side === expected.side,
    )?.status).toBe('correct');
  });

  it('restorer documentReview B4 uden at åbne B5 og kan advance eksplicit bagefter', () => {
    const state = reviewDocument(4);
    expect(state.phase).toBe('documentReview');
    expect(state.currentDocumentId).toBe('B4');
    const restored = roundtrip(state);
    expect(restored.phase).toBe('documentReview');
    expect(restored.currentDocumentId).toBe('B4');
    expect(restored.documents[3].rows).toEqual(state.documents[3].rows);
    expect(restored.documents[3].groups.every(group => group.status === 'correct')).toBe(true);

    const advanced = advanceFromV2DocumentReview(restored);
    expect(advanced.phase).toBe('documentEntry');
    expect(advanced.currentDocumentId).toBe('B5');
  });

  it('restorer B9 review uden implicit checkpoint og åbner først checkpoint ved advance', () => {
    const restored = roundtrip(reviewDocument(9));
    expect(restored.phase).toBe('documentReview');
    expect(restored.currentDocumentId).toBe('B9');
    const checkpoint = advanceFromV2DocumentReview(restored);
    expect(checkpoint.phase).toBe('checkpoint');
    expect(checkpoint.currentDocumentId).toBeNull();
  });
});

describe('V2.1 checkpoint og completed restore', () => {
  it('roundtripper partial checkpoint med A/E locked og B/D incorrect', () => {
    const answers = V2_SESSION_CASE_42.answers;
    let state = advanceV2ToCheckpoint(answers);
    const expectedA = answers.reconciliation.A;
    state = editV2CheckpointAmount(state, 'A', 'wageAccountYtd', String(expectedA.wageAccountYtd));
    state = editV2CheckpointAmount(state, 'A', 'employeePensionYtd', String(expectedA.employeePensionYtd));
    state = editV2CheckpointAmount(state, 'A', 'employeeAtpYtd', String(expectedA.employeeAtpYtd));
    state = editV2CheckpointAmount(
      state,
      'A',
      'calculatedGrossPayYtd',
      String(expectedA.calculatedGrossPayYtd),
    );
    state = checkV2CheckpointSection(answers, state, 'A');
    state = editV2CheckpointAmount(state, 'B', 'wageAccountYtd', '1');
    state = checkV2CheckpointSection(answers, state, 'B');
    state = editV2CheckpointAmount(state, 'D', 'operatingTotal', '1');
    state = checkV2CheckpointSection(answers, state, 'D');
    for (const expected of answers.reconciliation.E) {
      state = editV2CheckpointBalance(state, expected.accountNumber, {
        rawAmount: String(expected.bookedAmount),
        side: 'K',
      });
    }
    state = checkV2CheckpointSection(answers, state, 'E');

    const restored = roundtrip(state);
    expect(restored.phase).toBe('checkpoint');
    expect([
      restored.checkpoint.A.status,
      restored.checkpoint.B.status,
      restored.checkpoint.C.status,
      restored.checkpoint.D.status,
      restored.checkpoint.E.status,
    ]).toEqual(['correct', 'incorrect', 'unchecked', 'incorrect', 'correct']);
    expect(restored.checkpoint.B.values.wageAccountYtd).toBe('1');
    expect(editV2CheckpointAmount(restored, 'A', 'wageAccountYtd', '1')).toBe(restored);
    expect(editV2CheckpointBalance(restored, '6920', { rawAmount: '1' })).toBe(restored);
  });

  it('roundtripper partial C med den nye raw checkpointshape', () => {
    let state = advanceV2ToCheckpoint(V2_SESSION_CASE_42.answers);
    state = editV2CheckpointAmount(state, 'C', 'pensionBookBalance', '260.588');
    state = editV2CheckpointAmount(state, 'C', 'hourlyEmployeePensionYtd', '38 262');
    state = editV2CheckpointAmount(state, 'C', 'atpBookBalance', '14256');
    state = editV2CheckpointAmount(state, 'C', 'holidayPayGrossYtd', '');
    const restored = roundtrip(state);
    expect(restored.checkpoint.C.status).toBe('unchecked');
    expect(restored.checkpoint.C.values).toMatchObject({
      pensionBookBalance: '260.588',
      hourlyEmployeePensionYtd: '38 262',
      atpBookBalance: '14256',
      holidayPayGrossYtd: '',
    });
  });
  it('restorer checkpointReview uden auto-complete og kan complete eksplicit', () => {
    const review = completeV2Checkpoint(
      V2_SESSION_CASE_42.answers,
      advanceV2ToCheckpoint(V2_SESSION_CASE_42.answers),
    );
    const restored = roundtrip(review);
    expect(restored.phase).toBe('checkpointReview');
    expect(Object.values(restored.checkpoint).every(section => section.status === 'correct')).toBe(true);
    expect(completeV2Level(restored).phase).toBe('completed');
  });

  it('roundtripper completed og bevarer write protection', () => {
    const completed = completeV2Level(completeV2Checkpoint(
      V2_SESSION_CASE_42.answers,
      advanceV2ToCheckpoint(V2_SESSION_CASE_42.answers),
    ));
    const restored = roundtrip(completed);
    expect(restored.phase).toBe('completed');
    expect(restored.documents.every(document => document.status === 'completed')).toBe(true);
    expect(Object.values(restored.checkpoint).every(section => section.status === 'correct')).toBe(true);
    const rowId = restored.documents[0].rows[0].rowId;
    expect(addV2StudentPostingRow(restored, '2210', 'debit', '1')).toBe(restored);
    expect(editV2StudentPostingRow(restored, rowId, { rawAmount: '1' })).toBe(restored);
    expect(removeV2StudentPostingRow(restored, rowId)).toBe(restored);
    expect(checkV2CurrentDocument(V2_SESSION_CASE_42.answers, restored)).toBe(restored);
    expect(advanceFromV2DocumentReview(restored)).toBe(restored);
    expect(editV2CheckpointAmount(restored, 'A', 'wageAccountYtd', '1')).toBe(restored);
    expect(checkV2CheckpointSection(V2_SESSION_CASE_42.answers, restored, 'A')).toBe(restored);
    expect(completeV2Level(restored)).toBe(restored);
  });

  it('bevarer alle 13 student-derived balances over checkpoint save/load', () => {
    const checkpoint = advanceV2ToCheckpoint(V2_SESSION_CASE_42.answers);
    const before = selectAllV2StudentDerivedBalances(
      V2_SESSION_CASE_42.source.startBalances,
      checkpoint,
    );
    const restored = roundtrip(checkpoint);
    const after = selectAllV2StudentDerivedBalances(
      V2_SESSION_CASE_42.source.startBalances,
      restored,
    );
    expect(after).toEqual(before);
    expect(after).toEqual(V2_SESSION_CASE_42.answers.finalBalances);
  });
});

describe('V2.1 restore authority og dependencies', () => {
  it('restorer udelukkende persisted snapshot og har ingen generatorimport eller generatorcall', () => {
    const session = createV2TestSession();
    const persisted = encodeV2Session(session);
    const restored = decodeV2Session(persisted);
    if (!restored.ok) throw new Error('Expected valid session');
    expect(restored.value.caseSnapshot).toEqual(session.caseSnapshot);

    const folder = 'src/level2/v2/session';
    const source = readdirSync(folder)
      .filter(file => file.endsWith('.ts'))
      .map(file => readFileSync(folder + '/' + file, 'utf8'))
      .join(String.fromCharCode(10));
    for (const forbidden of [
      'generateV2Case',
      'generateLevel2Case',
      '/generator',
      'localStorage',
      'sessionStorage',
      '/controller',
      'React',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
