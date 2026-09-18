import { describe, expect, it } from 'vitest';
import { REFERENCE_R1_FIXTURE } from '../../src/domain/level2';
import {
  addStudentPostingRow,
  checkActiveDocument,
  createInitialStudentState,
  editStudentPostingRow,
  removeStudentPostingRow,
  selectActiveDocumentTotals,
} from '../../src/level2/state';
import { completeActiveDocument } from './state-helpers';

const source = REFERENCE_R1_FIXTURE;

function addExpectedExcept(
  state: ReturnType<typeof createInitialStudentState>,
  excludedAccount: string,
  excludedSide: string,
): ReturnType<typeof createInitialStudentState> {
  let next = state;
  const document = source.documents[0];
  for (const posting of document.expectedPostings) {
    if (posting.accountNumber === excludedAccount && posting.side === excludedSide) continue;
    next = addStudentPostingRow(next, posting.accountNumber, posting.side, String(posting.amount));
  }
  return next;
}

describe('Niveau 2 initial elevstate', () => {
  it('starter deterministisk med B1 aktiv og resten pending', () => {
    const state = createInitialStudentState(source);
    expect(state.phase).toEqual({ kind: 'document', activeDocumentId: 'B1' });
    expect(state.documents[0].status).toBe('active');
    expect(state.documents.slice(1).every(document => document.status === 'pending')).toBe(true);
    expect(state.documents.every(document => document.rows.length === 0)).toBe(true);
    expect(Object.values(state.checkpoint).every(section => section.status === 'unchecked')).toBe(true);
    expect(state.finalControl.items.every(item => item.status === 'unchecked')).toBe(true);
    expect(state.nextRowId).toBe(1);
    expect(state.completed).toBe(false);
  });
});

describe('Niveau 2 dokumentgrading', () => {
  it('accepterer splitpostering og låser hele gruppen', () => {
    const expected = source.documents[0].expectedPostings[0];
    let state = createInitialStudentState(source);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, '10000');
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount - 10000));
    state = addExpectedExcept(state, expected.accountNumber, expected.side);
    const previous = state;
    state = checkActiveDocument(source, state);

    const completed = state.documents[0];
    expect(completed.status).toBe('completed');
    expect(completed.rows.filter(row => row.accountNumber === expected.accountNumber && row.side === expected.side)).toHaveLength(2);
    expect(completed.groups.find(group => group.accountNumber === expected.accountNumber && group.side === expected.side)?.status).toBe('correct');
    expect(state.phase).toEqual({ kind: 'document', activeDocumentId: 'B2' });
    expect(previous.documents[0].status).toBe('active');
  });

  it('afviser nettomodregning mellem Debet og Kredit', () => {
    const expected = source.documents[0].expectedPostings[0];
    let state = createInitialStudentState(source);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount + 2000));
    state = addStudentPostingRow(state, expected.accountNumber, expected.side === 'debit' ? 'credit' : 'debit', '2000');
    state = addExpectedExcept(state, expected.accountNumber, expected.side);
    state = checkActiveDocument(source, state);

    expect(state.documents[0].status).toBe('active');
    const groups = state.documents[0].groups.filter(group => group.accountNumber === expected.accountNumber);
    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ side: expected.side, status: 'incorrect', issue: 'incorrectSum' }),
      expect.objectContaining({ status: 'incorrect', issue: 'unexpected' }),
    ]));
  });

  it('låser korrekte grupper og nulstiller kun redigerede incorrect grupper', () => {
    const [correctPosting, wrongPosting] = source.documents[0].expectedPostings;
    let state = createInitialStudentState(source);
    state = addStudentPostingRow(state, correctPosting.accountNumber, correctPosting.side, String(correctPosting.amount));
    state = addStudentPostingRow(state, wrongPosting.accountNumber, wrongPosting.side, '1');
    const correctRowId = state.documents[0].rows[0].rowId;
    const wrongRowId = state.documents[0].rows[1].rowId;
    state = checkActiveDocument(source, state);

    expect(state.documents[0].groups.find(group => group.accountNumber === correctPosting.accountNumber)?.status).toBe('correct');
    expect(state.documents[0].groups.find(group => group.accountNumber === wrongPosting.accountNumber)?.status).toBe('incorrect');

    const lockedAttempt = editStudentPostingRow(state, correctRowId, { rawAmount: '2' });
    expect(lockedAttempt).toBe(state);

    state = editStudentPostingRow(state, wrongRowId, { rawAmount: String(wrongPosting.amount) });
    expect(state.documents[0].groups.find(group => group.accountNumber === wrongPosting.accountNumber)?.status).toBe('unchecked');
    expect(state.documents[0].groups.find(group => group.accountNumber === correctPosting.accountNumber)?.status).toBe('correct');
  });

  it('afviser en ekstra konto, men kan gennemføre efter fjernelse', () => {
    let state = createInitialStudentState(source);
    for (const posting of source.documents[0].expectedPostings) {
      state = addStudentPostingRow(state, posting.accountNumber, posting.side, String(posting.amount));
    }
    state = addStudentPostingRow(state, '2210', 'debit', '100');
    const extraRowId = state.documents[0].rows.at(-1)?.rowId;
    if (extraRowId === undefined) throw new Error('Missing extra row');
    state = checkActiveDocument(source, state);
    expect(state.documents[0].groups).toContainEqual({
      accountNumber: '2210', side: 'debit', status: 'incorrect', issue: 'unexpected',
    });

    state = removeStudentPostingRow(state, extraRowId);
    state = checkActiveDocument(source, state);
    expect(state.documents[0].status).toBe('completed');
  });

  it('pruner helt tomme drafts og lader tekst uden beløb blokere gruppen', () => {
    let state = createInitialStudentState(source);
    state = addStudentPostingRow(state, '2210', 'debit');
    state = addStudentPostingRow(state, '2215', 'debit', '', 'forklaring');
    state = checkActiveDocument(source, state);
    expect(state.documents[0].rows.some(row => row.accountNumber === '2210')).toBe(false);
    expect(state.documents[0].groups).toContainEqual({
      accountNumber: '2215', side: 'debit', status: 'incorrect', issue: 'invalid',
    });
  });

  it('beregner elevtotaler uden facit', () => {
    let state = createInitialStudentState(source);
    expect(selectActiveDocumentTotals(state).balanceState).toBe('none');
    state = addStudentPostingRow(state, '2210', 'debit', '10.000');
    state = addStudentPostingRow(state, '5820', 'credit', '10 000');
    expect(selectActiveDocumentTotals(state)).toEqual({
      debit: { total: 10000, hasInvalidInput: false },
      credit: { total: 10000, hasInvalidInput: false },
      balanceState: 'balanced',
    });
    state = addStudentPostingRow(state, '2215', 'debit', 'bad');
    expect(selectActiveDocumentTotals(state).debit).toEqual({ total: null, hasInvalidInput: true });
    expect(selectActiveDocumentTotals(state).balanceState).toBe('unbalanced');
  });

  it('fører B1 til B9 sekventielt og stopper ved checkpoint', () => {
    let state = createInitialStudentState(source);
    for (let index = 0; index < 9; index += 1) {
      expect(state.phase).toEqual({ kind: 'document', activeDocumentId: 'B' + (index + 1) });
      state = completeActiveDocument(source, state);
    }
    expect(state.phase).toEqual({ kind: 'checkpoint' });
    expect(state.documents.slice(0, 9).every(document => document.status === 'completed')).toBe(true);
    expect(state.documents[9].status).toBe('pending');
  });
});
