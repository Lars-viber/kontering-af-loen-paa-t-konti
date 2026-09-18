import type { AccountBalance, Level2AccountNumber, PostingSide } from '../../domain/level2';
import { parsePostingAmount } from './amountParser';
import { getLevel2CaseData } from './case';
import type {
  DocumentGroupState,
  FinalControlItemId,
  Level2StateCase,
  Level2StudentState,
  StudentDocumentState,
  StudentDocumentTotals,
  StudentSideTotal,
} from './types';

export function selectActiveDocument(state: Level2StudentState): StudentDocumentState | null {
  if (state.phase.kind !== 'document') return null;
  const activeDocumentId = state.phase.activeDocumentId;
  return state.documents.find(document => document.documentId === activeDocumentId) ?? null;
}

export function selectDocumentGroup(
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
  side: PostingSide,
): DocumentGroupState | null {
  const document = selectActiveDocument(state);
  return document?.groups.find(group => group.accountNumber === accountNumber && group.side === side) ?? null;
}

function sideTotal(document: StudentDocumentState, side: PostingSide): StudentSideTotal {
  const meaningful = document.rows.filter(row =>
    row.side === side && (row.rawAmount.trim() !== '' || row.text.trim() !== ''),
  );
  const parsed = meaningful.map(row => parsePostingAmount(row.rawAmount));
  if (parsed.some(result => result.kind !== 'valid')) {
    return { total: null, hasInvalidInput: true };
  }
  return {
    total: parsed.reduce((sum, result) => sum + (result.kind === 'valid' ? result.value : 0), 0),
    hasInvalidInput: false,
  };
}

export function selectActiveDocumentTotals(state: Level2StudentState): StudentDocumentTotals {
  const document = selectActiveDocument(state);
  if (!document) {
    return {
      debit: { total: 0, hasInvalidInput: false },
      credit: { total: 0, hasInvalidInput: false },
      balanceState: 'none',
    };
  }
  const debit = sideTotal(document, 'debit');
  const credit = sideTotal(document, 'credit');
  let balanceState: StudentDocumentTotals['balanceState'];
  if (debit.hasInvalidInput || credit.hasInvalidInput) balanceState = 'unbalanced';
  else if (debit.total === 0 && credit.total === 0) balanceState = 'none';
  else if (debit.total === credit.total && (debit.total ?? 0) > 0) balanceState = 'balanced';
  else balanceState = 'unbalanced';
  return { debit, credit, balanceState };
}

const FINAL_BALANCE_ACCOUNTS: Readonly<Record<FinalControlItemId, Level2AccountNumber>> = Object.freeze({
  aTax: '6920',
  amContribution: '6930',
  pension: '6922',
  holidayPay: '6923',
  atp: '6921',
  holidayLiability: '6924',
});

export function selectFinalControlBalances(
  source: Level2StateCase,
): Readonly<Record<FinalControlItemId, AccountBalance>> {
  const balances = getLevel2CaseData(source).finalBalances;
  return Object.freeze(Object.fromEntries(
    Object.entries(FINAL_BALANCE_ACCOUNTS).map(([itemId, accountNumber]) => {
      const balance = balances.find(candidate => candidate.accountNumber === accountNumber);
      if (!balance) throw new Error('Missing final balance ' + accountNumber);
      return [itemId, balance];
    }),
  )) as unknown as Readonly<Record<FinalControlItemId, AccountBalance>>;
}
