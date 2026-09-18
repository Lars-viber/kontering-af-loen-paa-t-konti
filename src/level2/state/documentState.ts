import type { Level2AccountNumber, PostingSide } from '../../domain/level2';
import { LEVEL2_ACCOUNT_NUMBERS, LEVEL2_DOCUMENT_IDS } from '../../domain/level2';
import { createEmptyCheckpointState } from './checkpointState';
import { createEmptyFinalControlState } from './finalControl';
import { freezeStudentState } from './stateUtils';
import type {
  DocumentGroupState,
  Level2StateCase,
  Level2StudentState,
  StudentDocumentState,
  StudentPostingRow,
} from './types';
import { getLevel2CaseData } from './case';

function isKnownAccount(accountNumber: string): accountNumber is Level2AccountNumber {
  return (LEVEL2_ACCOUNT_NUMBERS as readonly string[]).includes(accountNumber);
}

function isKnownSide(side: string): side is PostingSide {
  return side === 'debit' || side === 'credit';
}

function activeDocument(state: Level2StudentState): StudentDocumentState | undefined {
  if (state.phase.kind !== 'document') return undefined;
  const activeDocumentId = state.phase.activeDocumentId;
  return state.documents.find(document => document.documentId === activeDocumentId);
}

function groupFor(
  document: StudentDocumentState,
  accountNumber: Level2AccountNumber,
  side: PostingSide,
): DocumentGroupState | undefined {
  return document.groups.find(group => group.accountNumber === accountNumber && group.side === side);
}

function withResetGroup(
  groups: readonly DocumentGroupState[],
  accountNumber: Level2AccountNumber,
  side: PostingSide,
): readonly DocumentGroupState[] {
  return groups.map(group =>
    group.accountNumber === accountNumber && group.side === side && group.status === 'incorrect'
      ? { accountNumber, side, status: 'unchecked' as const }
      : group,
  );
}

function replaceDocument(
  state: Level2StudentState,
  updated: StudentDocumentState,
  nextRowId = state.nextRowId,
): Level2StudentState {
  return freezeStudentState({
    ...state,
    nextRowId,
    documents: state.documents.map(document =>
      document.documentId === updated.documentId ? updated : document,
    ),
  });
}

export function createInitialStudentState(source: Level2StateCase): Level2StudentState {
  const caseData = getLevel2CaseData(source);
  if (
    caseData.documents.length !== LEVEL2_DOCUMENT_IDS.length ||
    caseData.documents.some((document, index) => document.id !== LEVEL2_DOCUMENT_IDS[index])
  ) {
    throw new Error('Level 2 case has an invalid document contract');
  }

  return freezeStudentState({
    phase: { kind: 'document', activeDocumentId: 'B1' },
    documents: LEVEL2_DOCUMENT_IDS.map((documentId, index) => ({
      documentId,
      status: index === 0 ? 'active' : 'pending',
      rows: [],
      groups: [],
    })),
    nextRowId: 1,
    checkpoint: createEmptyCheckpointState(),
    finalControl: createEmptyFinalControlState(),
    completed: false,
  });
}

export function resetStudentState(source: Level2StateCase): Level2StudentState {
  return createInitialStudentState(source);
}

export function addStudentPostingRow(
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
  side: PostingSide,
  rawAmount = '',
  text = '',
): Level2StudentState {
  if (state.completed) return state;
  if (!isKnownAccount(accountNumber)) throw new RangeError('Unknown Level 2 account');
  if (!isKnownSide(side)) throw new RangeError('Unknown posting side');
  const document = activeDocument(state);
  if (!document || document.status !== 'active') return state;
  if (groupFor(document, accountNumber, side)?.status === 'correct') return state;

  const row: StudentPostingRow = {
    rowId: state.nextRowId,
    documentId: document.documentId,
    accountNumber,
    side,
    rawAmount,
    text,
  };
  return replaceDocument(state, {
    ...document,
    rows: [...document.rows, row],
    groups: withResetGroup(document.groups, accountNumber, side),
  }, state.nextRowId + 1);
}

export interface StudentPostingRowChanges {
  readonly rawAmount?: string;
  readonly text?: string;
}

export function editStudentPostingRow(
  state: Level2StudentState,
  rowId: number,
  changes: StudentPostingRowChanges,
): Level2StudentState {
  if (state.completed) return state;
  const document = activeDocument(state);
  if (!document || document.status !== 'active') return state;
  const row = document.rows.find(candidate => candidate.rowId === rowId);
  if (!row || groupFor(document, row.accountNumber, row.side)?.status === 'correct') return state;

  return replaceDocument(state, {
    ...document,
    rows: document.rows.map(candidate => candidate.rowId === rowId ? { ...candidate, ...changes } : candidate),
    groups: withResetGroup(document.groups, row.accountNumber, row.side),
  });
}

export function removeStudentPostingRow(
  state: Level2StudentState,
  rowId: number,
): Level2StudentState {
  if (state.completed) return state;
  const document = activeDocument(state);
  if (!document || document.status !== 'active') return state;
  const row = document.rows.find(candidate => candidate.rowId === rowId);
  if (!row || groupFor(document, row.accountNumber, row.side)?.status === 'correct') return state;

  return replaceDocument(state, {
    ...document,
    rows: document.rows.filter(candidate => candidate.rowId !== rowId),
    groups: withResetGroup(document.groups, row.accountNumber, row.side),
  });
}

export function isPostingGroupLocked(
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
  side: PostingSide,
): boolean {
  const document = activeDocument(state);
  return groupFor(document ?? { documentId: 'B1', status: 'pending', rows: [], groups: [] }, accountNumber, side)?.status === 'correct';
}
