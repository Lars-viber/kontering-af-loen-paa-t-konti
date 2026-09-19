import {
  V2_ACCOUNT_NUMBERS,
  V2_DOCUMENT_IDS,
  type V2AccountNumber,
  type V2DocumentId,
} from '../../../domain/level2/v2';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  V2_STUDENT_PHASES,
  type V2CheckpointSectionId,
  type V2StudentDocumentState,
  type V2StudentState,
} from './types';

const SECTION_IDS = ['A', 'B', 'C', 'D', 'E'] as const satisfies readonly V2CheckpointSectionId[];
const GRADING_STATUSES = ['unchecked', 'incorrect', 'correct'] as const;

function isDocumentId(value: unknown): value is V2DocumentId {
  return typeof value === 'string' && (V2_DOCUMENT_IDS as readonly string[]).includes(value);
}

function assertDocument(document: V2StudentDocumentState, expectedId: V2DocumentId): void {
  if (document.documentId !== expectedId) throw new Error('Invalid V2.1 document order');
  if (!['pending', 'active', 'completed'].includes(document.status)) {
    throw new Error('Invalid V2.1 document status');
  }
  for (const row of document.rows) {
    if (!Number.isSafeInteger(row.rowId) || row.rowId < 1) throw new Error('Invalid V2.1 row ID');
    if (row.documentId !== document.documentId) throw new Error('V2.1 row belongs to wrong document');
    if (!(V2_ACCOUNT_NUMBERS as readonly string[]).includes(row.accountNumber)) {
      throw new Error('Invalid V2.1 row account');
    }
    if (row.side !== 'debit' && row.side !== 'credit') throw new Error('Invalid V2.1 row side');
    if (typeof row.rawAmount !== 'string' || typeof row.text !== 'string') {
      throw new Error('Invalid V2.1 row input');
    }
  }
  for (const group of document.groups) {
    if (!(V2_ACCOUNT_NUMBERS as readonly string[]).includes(group.accountNumber)) {
      throw new Error('Invalid V2.1 group account');
    }
    if (group.side !== 'debit' && group.side !== 'credit') throw new Error('Invalid V2.1 group side');
    if (!(GRADING_STATUSES as readonly string[]).includes(group.status)) {
      throw new Error('Invalid V2.1 group status');
    }
    if (group.status === 'correct' && group.issue !== undefined) {
      throw new Error('Correct V2.1 group cannot have an issue');
    }
  }
}

function allDocumentsCompleted(state: V2StudentState): boolean {
  return state.documents.every(document => document.status === 'completed');
}

function allSectionsCorrect(state: V2StudentState): boolean {
  return SECTION_IDS.every(sectionId => state.checkpoint[sectionId].status === 'correct');
}

function assertSequentialDocumentState(state: V2StudentState): void {
  if (state.currentDocumentId === null) throw new Error('V2.1 document phase needs a current document');
  const currentIndex = V2_DOCUMENT_IDS.indexOf(state.currentDocumentId);
  if (currentIndex < 0) throw new Error('Unknown current V2.1 document');
  state.documents.forEach((document, index) => {
    const expected = index < currentIndex
      ? 'completed'
      : index > currentIndex
        ? 'pending'
        : state.phase === 'documentEntry'
          ? 'active'
          : 'completed';
    if (document.status !== expected) throw new Error('Invalid sequential V2.1 document state');
  });
}

export function assertV2StudentState(state: V2StudentState): void {
  if (!(V2_STUDENT_PHASES as readonly string[]).includes(state.phase)) {
    throw new Error('Invalid V2.1 phase');
  }
  if (state.currentDocumentId !== null && !isDocumentId(state.currentDocumentId)) {
    throw new Error('Unknown current V2.1 document');
  }
  if (state.documents.length !== V2_DOCUMENT_IDS.length) {
    throw new Error('V2.1 state must contain nine documents');
  }
  state.documents.forEach((document, index) => assertDocument(document, V2_DOCUMENT_IDS[index]));

  const rowIds = state.documents.flatMap(document => document.rows.map(row => row.rowId));
  if (new Set(rowIds).size !== rowIds.length) throw new Error('Duplicate V2.1 row ID');
  if (!Number.isSafeInteger(state.nextRowId) || state.nextRowId < 1 ||
      rowIds.some(rowId => rowId >= state.nextRowId)) {
    throw new Error('Invalid V2.1 next row ID');
  }

  if ((Object.keys(state.checkpoint) as string[]).join(',') !== SECTION_IDS.join(',')) {
    throw new Error('Invalid V2.1 checkpoint sections');
  }
  for (const sectionId of SECTION_IDS) {
    if (!(GRADING_STATUSES as readonly string[]).includes(state.checkpoint[sectionId].status)) {
      throw new Error('Invalid V2.1 checkpoint status');
    }
  }
  if (
    state.checkpoint.E.balances.length !== V2_CHECKPOINT_BALANCE_ACCOUNTS.length ||
    state.checkpoint.E.balances.some((balance, index) =>
      balance.accountNumber !== V2_CHECKPOINT_BALANCE_ACCOUNTS[index] ||
      typeof balance.rawAmount !== 'string' ||
      !['D', 'K', 'blank'].includes(balance.side)
    )
  ) throw new Error('Invalid V2.1 checkpoint balances');

  if (state.phase === 'documentEntry' || state.phase === 'documentReview') {
    assertSequentialDocumentState(state);
    const current = state.documents.find(document => document.documentId === state.currentDocumentId);
    if (!current) throw new Error('Missing current V2.1 document');
    if (state.phase === 'documentReview' &&
        (current.groups.length === 0 || current.groups.some(group => group.status !== 'correct'))) {
      throw new Error('V2.1 document review requires a fully correct document');
    }
    return;
  }

  if (state.currentDocumentId !== null) throw new Error('V2.1 non-document phase cannot have a current document');
  if (!allDocumentsCompleted(state)) throw new Error('V2.1 checkpoint requires nine completed documents');
  if ((state.phase === 'checkpointReview' || state.phase === 'completed') && !allSectionsCorrect(state)) {
    throw new Error('V2.1 reviewed checkpoint requires all sections correct');
  }
}

export function isV2AccountNumber(value: string): value is V2AccountNumber {
  return (V2_ACCOUNT_NUMBERS as readonly string[]).includes(value);
}
