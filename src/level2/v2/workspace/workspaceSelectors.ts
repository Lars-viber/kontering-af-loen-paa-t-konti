import type {
  V2AccountBalance,
  V2AccountNumber,
  V2PostingSide,
} from '../../../domain/level2/v2';
import {
  parseV2PostingAmount,
  selectV2ApprovedRows,
  selectV2StudentDerivedBalance,
  type V2StudentPostingRow,
  type V2StudentState,
} from '../state';

export interface V2WorkspaceHistoryRow extends V2StudentPostingRow {
  readonly amount: number;
}

export interface V2WorkspaceRunningHistoryRow extends V2WorkspaceHistoryRow {
  readonly balance: V2AccountBalance;
}

function signed(balance: V2AccountBalance): number {
  return balance.side === 'debit' ? balance.amount : balance.side === 'credit' ? -balance.amount : 0;
}

function balanceFromSigned(accountNumber: V2AccountNumber, value: number): V2AccountBalance {
  return {
    accountNumber,
    amount: Math.abs(value),
    side: value > 0 ? 'debit' : value < 0 ? 'credit' : 'zero',
  };
}

export function selectV2WorkspaceOpeningBalance(
  openingBalances: readonly V2AccountBalance[],
  accountNumber: V2AccountNumber,
): V2AccountBalance {
  const balance = openingBalances.find(item => item.accountNumber === accountNumber);
  if (!balance) throw new Error('Missing V2.1 opening balance ' + accountNumber);
  return balance;
}

export function selectV2WorkspaceHistory(
  state: V2StudentState,
  accountNumber?: V2AccountNumber,
): readonly V2WorkspaceHistoryRow[] {
  return selectV2ApprovedRows(state, accountNumber ? { accountNumber } : {}).flatMap(row => {
    const parsed = parseV2PostingAmount(row.rawAmount);
    return parsed.kind === 'valid' ? [{ ...row, amount: parsed.value }] : [];
  });
}

export function selectV2WorkspaceRunningHistory(
  openingBalances: readonly V2AccountBalance[],
  state: V2StudentState,
  accountNumber: V2AccountNumber,
): readonly V2WorkspaceRunningHistoryRow[] {
  let current = signed(selectV2WorkspaceOpeningBalance(openingBalances, accountNumber));
  return selectV2WorkspaceHistory(state, accountNumber).map(row => {
    current += row.side === 'debit' ? row.amount : -row.amount;
    return { ...row, balance: balanceFromSigned(accountNumber, current) };
  });
}

export function selectV2WorkspaceBalance(
  openingBalances: readonly V2AccountBalance[],
  state: V2StudentState,
  accountNumber: V2AccountNumber,
): V2AccountBalance {
  return selectV2StudentDerivedBalance(openingBalances, state, accountNumber);
}

export function sideLabel(side: V2PostingSide): string {
  return side === 'debit' ? 'Debet' : 'Kredit';
}
