import { describe, expect, it } from 'vitest';
import { R1_V2_ANSWER_KEY, V2_DOCUMENT_IDS } from '../../src/domain/level2/v2';
import {
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CurrentDocument,
  createInitialV2StudentState,
  editV2StudentPostingRow,
  removeV2StudentPostingRow,
  selectV2ApprovedRows,
  selectV2Progress,
} from '../../src/level2/v2/state';
import { completeCurrentV2Document } from './v2-state-helpers';

describe('V2.1 document state og review', () => {
  it('starter med præcis B1 entry og blank serialiserbar state', () => {
    const state = createInitialV2StudentState();
    expect(state.phase).toBe('documentEntry');
    expect(state.currentDocumentId).toBe('B1');
    expect(state.documents.map(document => document.documentId)).toEqual(V2_DOCUMENT_IDS);
    expect(state.documents[0].status).toBe('active');
    expect(state.documents.slice(1).every(document => document.status === 'pending')).toBe(true);
    expect(state.documents.every(document => document.rows.length === 0 && document.groups.length === 0)).toBe(true);
    expect(Object.values(state.checkpoint).every(section => section.status === 'unchecked')).toBe(true);
    expect(selectV2Progress(state)).toEqual({
      phase: 'documentEntry',
      currentDocumentId: 'B1',
      completedDocumentCount: 0,
      remainingDocumentCount: 9,
    });
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(Object.isFrozen(state)).toBe(true);
  });

  it('fører korrekt B1 til review uden at åbne B2', () => {
    const entry = createInitialV2StudentState();
    const review = completeCurrentV2Document(R1_V2_ANSWER_KEY, entry);
    expect(review.phase).toBe('documentReview');
    expect(review.currentDocumentId).toBe('B1');
    expect(review.documents[0].status).toBe('completed');
    expect(review.documents[1].status).toBe('pending');
    expect(review.documents[0].groups.every(group => group.status === 'correct')).toBe(true);
    expect(selectV2Progress(review)).toEqual({
      phase: 'documentReview',
      currentDocumentId: 'B1',
      completedDocumentCount: 1,
      remainingDocumentCount: 8,
    });
    expect(selectV2ApprovedRows(review, { documentId: 'B1' })).toEqual(review.documents[0].rows);
  });

  it('kræver explicit advance fra B1 review til B2 entry', () => {
    const review = completeCurrentV2Document(R1_V2_ANSWER_KEY, createInitialV2StudentState());
    const next = advanceFromV2DocumentReview(review);
    expect(next.phase).toBe('documentEntry');
    expect(next.currentDocumentId).toBe('B2');
    expect(next.documents[0].status).toBe('completed');
    expect(next.documents[1].status).toBe('active');
    expect(next.documents[0].rows).toEqual(review.documents[0].rows);
    expect(selectV2Progress(next).completedDocumentCount).toBe(1);
    expect(advanceFromV2DocumentReview(next)).toBe(next);
  });

  it('låser kun korrekte grupper og holder forkerte grupper editable', () => {
    const expected = R1_V2_ANSWER_KEY.documents[0].expectedPostings;
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(
      state,
      expected[0].accountNumber,
      expected[0].side,
      String(expected[0].amount),
    );
    state = addV2StudentPostingRow(state, expected[1].accountNumber, expected[1].side, '1');
    const correctRowId = state.documents[0].rows[0].rowId;
    const wrongRowId = state.documents[0].rows[1].rowId;
    state = checkV2CurrentDocument(R1_V2_ANSWER_KEY, state);

    expect(state.phase).toBe('documentEntry');
    expect(state.currentDocumentId).toBe('B1');
    expect(state.documents[0].groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        accountNumber: expected[0].accountNumber,
        side: expected[0].side,
        status: 'correct',
      }),
      expect.objectContaining({
        accountNumber: expected[1].accountNumber,
        side: expected[1].side,
        status: 'incorrect',
      }),
    ]));
    expect(editV2StudentPostingRow(state, correctRowId, { rawAmount: '2' })).toBe(state);
    const edited = editV2StudentPostingRow(state, wrongRowId, { rawAmount: String(expected[1].amount) });
    expect(edited).not.toBe(state);
    expect(edited.documents[0].groups.find(group =>
      group.accountNumber === expected[1].accountNumber && group.side === expected[1].side,
    )?.status).toBe('unchecked');
  });

  it('bevarer split rows gennem check, review og approved history', () => {
    const expectedDocument = R1_V2_ANSWER_KEY.documents[0];
    const split = expectedDocument.expectedPostings[0];
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(state, split.accountNumber, split.side, '10000', 'split 1');
    state = addV2StudentPostingRow(
      state,
      split.accountNumber,
      split.side,
      String(split.amount - 10000),
      'split 2',
    );
    for (const posting of expectedDocument.expectedPostings.slice(1)) {
      state = addV2StudentPostingRow(
        state,
        posting.accountNumber,
        posting.side,
        String(posting.amount),
        posting.text,
      );
    }
    state = checkV2CurrentDocument(R1_V2_ANSWER_KEY, state);
    const splitRows = state.documents[0].rows.filter(row =>
      row.accountNumber === split.accountNumber && row.side === split.side,
    );
    expect(state.phase).toBe('documentReview');
    expect(splitRows).toHaveLength(2);
    expect(splitRows.map(row => row.rawAmount)).toEqual(['10000', String(split.amount - 10000)]);
    expect(selectV2ApprovedRows(state, {
      documentId: 'B1',
      accountNumber: split.accountNumber,
      side: split.side,
    })).toEqual(splitRows);
  });

  it('gør hele dokumentet readonly i review', () => {
    const state = completeCurrentV2Document(R1_V2_ANSWER_KEY, createInitialV2StudentState());
    const rowId = state.documents[0].rows[0].rowId;
    expect(addV2StudentPostingRow(state, '2210', 'debit', '1')).toBe(state);
    expect(editV2StudentPostingRow(state, rowId, { rawAmount: '1' })).toBe(state);
    expect(removeV2StudentPostingRow(state, rowId)).toBe(state);
    expect(checkV2CurrentDocument(R1_V2_ANSWER_KEY, state)).toBe(state);
  });

  it('fører B1-B9 via review og kræver sidste explicit advance til checkpoint', () => {
    let state = createInitialV2StudentState();
    for (let index = 0; index < V2_DOCUMENT_IDS.length; index += 1) {
      expect(state.phase).toBe('documentEntry');
      expect(state.currentDocumentId).toBe(V2_DOCUMENT_IDS[index]);
      state = completeCurrentV2Document(R1_V2_ANSWER_KEY, state);
      expect(state.phase).toBe('documentReview');
      expect(state.currentDocumentId).toBe(V2_DOCUMENT_IDS[index]);
      expect(selectV2Progress(state).completedDocumentCount).toBe(index + 1);
      if (index < V2_DOCUMENT_IDS.length - 1) state = advanceFromV2DocumentReview(state);
    }
    expect(state.phase).toBe('documentReview');
    expect(state.currentDocumentId).toBe('B9');
    expect(selectV2Progress(state).remainingDocumentCount).toBe(0);

    state = advanceFromV2DocumentReview(state);
    expect(state.phase).toBe('checkpoint');
    expect(state.currentDocumentId).toBeNull();
    expect(selectV2Progress(state).completedDocumentCount).toBe(9);
  });
});
