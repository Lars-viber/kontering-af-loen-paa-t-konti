import type {
  V2AccountBalance,
  V2AccountNumber,
  V2PostingSide,
} from '../../../domain/level2/v2';
import { parseV2PostingAmount } from './amountParser';
import type {
  V2ApprovedRowFilter,
  V2DocumentGroupState,
  V2StateProgress,
  V2StudentDocumentState,
  V2StudentDocumentTotals,
  V2StudentPostingRow,
  V2StudentSideTotal,
  V2StudentState,
} from './types';

export function selectV2CurrentDocument(state: V2StudentState): V2StudentDocumentState | null {
  if (state.currentDocumentId === null) return null;
  return state.documents.find(document => document.documentId === state.currentDocumentId) ?? null;
}

export function selectV2DocumentGroup(
  state: V2StudentState,
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
): V2DocumentGroupState | null {
  return selectV2CurrentDocument(state)?.groups
    .find(group => group.accountNumber === accountNumber && group.side === side) ?? null;
}

function sideTotal(document: V2StudentDocumentState, side: V2PostingSide): V2StudentSideTotal {
  const rows = document.rows.filter(row =>
    row.side === side && (row.rawAmount.trim() !== '' || row.text.trim() !== ''),
  );
  const parsed = rows.map(row => parseV2PostingAmount(row.rawAmount));
  if (parsed.some(result => result.kind !== 'valid')) {
    return { total: null, hasInvalidInput: true };
  }
  return {
    total: parsed.reduce((sum, result) => sum + (result.kind === 'valid' ? result.value : 0), 0),
    hasInvalidInput: false,
  };
}

export function selectV2CurrentDocumentTotals(state: V2StudentState): V2StudentDocumentTotals {
  const document = selectV2CurrentDocument(state);
  if (!document) {
    return {
      debit: { total: 0, hasInvalidInput: false },
      credit: { total: 0, hasInvalidInput: false },
      balanceState: 'none',
    };
  }
  const debit = sideTotal(document, 'debit');
  const credit = sideTotal(document, 'credit');
  let balanceState: V2StudentDocumentTotals['balanceState'];
  if (debit.hasInvalidInput || credit.hasInvalidInput) balanceState = 'unbalanced';
  else if (debit.total === 0 && credit.total === 0) balanceState = 'none';
  else if (debit.total === credit.total && (debit.total ?? 0) > 0) balanceState = 'balanced';
  else balanceState = 'unbalanced';
  return { debit, credit, balanceState };
}

export function selectV2Progress(state: V2StudentState): V2StateProgress {
  const completedDocumentCount =
    state.phase === 'checkpoint' || state.phase === 'checkpointReview' || state.phase === 'completed'
      ? state.documents.length
      : state.documents.filter(document => document.status === 'completed').length;
  return Object.freeze({
    phase: state.phase,
    currentDocumentId: state.currentDocumentId,
    completedDocumentCount,
    remainingDocumentCount: state.documents.length - completedDocumentCount,
  });
}

function rowGroupIsCorrect(document: V2StudentDocumentState, row: V2StudentPostingRow): boolean {
  return document.groups.some(group =>
    group.accountNumber === row.accountNumber &&
    group.side === row.side &&
    group.status === 'correct',
  );
}

export function selectV2ApprovedRows(
  state: V2StudentState,
  filter: V2ApprovedRowFilter = {},
): readonly V2StudentPostingRow[] {
  const rows = state.documents.flatMap(document =>
    document.rows.filter(row => rowGroupIsCorrect(document, row)),
  ).filter(row =>
    (filter.documentId === undefined || row.documentId === filter.documentId) &&
    (filter.accountNumber === undefined || row.accountNumber === filter.accountNumber) &&
    (filter.side === undefined || row.side === filter.side),
  );
  return Object.freeze(rows);
}

function rowsForCurrentBalance(
  state: V2StudentState,
  accountNumber: V2AccountNumber,
): readonly V2StudentPostingRow[] {
  const approved = selectV2ApprovedRows(state, { accountNumber });
  if (state.phase !== 'documentEntry' || state.currentDocumentId === null) return approved;
  const current = selectV2CurrentDocument(state);
  if (!current) return approved;
  const approvedIds = new Set(approved.map(row => row.rowId));
  const currentValid = current.rows.filter(row =>
    row.accountNumber === accountNumber &&
    !approvedIds.has(row.rowId) &&
    parseV2PostingAmount(row.rawAmount).kind === 'valid',
  );
  return [...approved, ...currentValid];
}

export function selectV2StudentDerivedBalance(
  openingBalances: readonly V2AccountBalance[],
  state: V2StudentState,
  accountNumber: V2AccountNumber,
): V2AccountBalance {
  const opening = openingBalances.find(balance => balance.accountNumber === accountNumber);
  if (!opening) throw new Error('Missing V2.1 opening balance ' + accountNumber);
  let netDebit = opening.side === 'debit' ? opening.amount : opening.side === 'credit' ? -opening.amount : 0;
  for (const row of rowsForCurrentBalance(state, accountNumber)) {
    const parsed = parseV2PostingAmount(row.rawAmount);
    if (parsed.kind !== 'valid') continue;
    netDebit += row.side === 'debit' ? parsed.value : -parsed.value;
  }
  return Object.freeze({
    accountNumber,
    amount: Math.abs(netDebit),
    side: netDebit > 0 ? 'debit' : netDebit < 0 ? 'credit' : 'zero',
  });
}

export function selectAllV2StudentDerivedBalances(
  openingBalances: readonly V2AccountBalance[],
  state: V2StudentState,
): readonly V2AccountBalance[] {
  return Object.freeze(openingBalances.map(balance =>
    selectV2StudentDerivedBalance(openingBalances, state, balance.accountNumber),
  ));
}
