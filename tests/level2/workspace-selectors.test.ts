import { describe, expect, it } from 'vitest';
import { generateLevel2Case } from '../../src/domain/level2';
import {
  addStudentPostingRow,
  checkActiveDocument,
  createInitialStudentState,
} from '../../src/level2/state';
import {
  selectApprovedHistory,
  selectCurrentAccountBalance,
  selectOpeningBalance,
  selectRunningHistory,
} from '../../src/level2/workspace';

const snapshot = generateLevel2Case(42);

describe('J3B workspace selectors', () => {
  it('bevarer elevens splitrækker i approved history', () => {
    const expected = snapshot.derived.documents[0].expectedPostings[0];
    let state = createInitialStudentState(snapshot);
    const first = Math.max(1, Math.floor(expected.amount / 3));
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(first));
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount - first));
    state = checkActiveDocument(snapshot, state);

    const rows = selectApprovedHistory(state, expected.accountNumber);
    expect(rows.map(row => row.amount)).toEqual([first, expected.amount - first]);
    expect(rows.every(row => row.documentId === 'B1')).toBe(true);
  });

  it('beregner saldo fra startsaldo og elevrækker uden pending facit', () => {
    let state = createInitialStudentState(snapshot);
    const opening = selectOpeningBalance(snapshot, '2210');
    const signedOpening = opening.side === 'credit' ? -opening.amount : opening.amount;
    expect(selectCurrentAccountBalance(snapshot, state, '2210')).toEqual(opening);

    state = addStudentPostingRow(state, '2210', 'debit', '1.000');
    expect(selectCurrentAccountBalance(snapshot, state, '2210')).toEqual({
      accountNumber: '2210',
      amount: Math.abs(signedOpening + 1000),
      side: signedOpening + 1000 > 0 ? 'debit' : 'credit',
    });
  });

  it('gør saldo utilgængelig ved meningsfuldt ugyldigt input', () => {
    let state = createInitialStudentState(snapshot);
    state = addStudentPostingRow(state, '5820', 'credit', 'ikke et tal');
    expect(selectCurrentAccountBalance(snapshot, state, '5820')).toBeNull();
  });

  it('fører løbende saldo i kronologisk elevhistorik', () => {
    const expected = snapshot.derived.documents[0].expectedPostings[0];
    let state = createInitialStudentState(snapshot);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount));
    state = checkActiveDocument(snapshot, state);
    const running = selectRunningHistory(snapshot, state, expected.accountNumber);
    expect(running).toHaveLength(1);
    expect(running[0].documentId).toBe('B1');
    expect(running[0].balance.accountNumber).toBe(expected.accountNumber);
  });
});
