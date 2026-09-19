import type { AccountBalance, Level2AccountNumber, PostingSide } from '../../domain/level2';
import { LEVEL2_DOCUMENT_IDS } from '../../domain/level2';
import type { Level2CaseSnapshot } from '../session';
import { parsePostingAmount, type Level2StudentState, type StudentPostingRow } from '../state';

export interface ApprovedHistoryRow {
  readonly rowId: number;
  readonly documentId: StudentPostingRow['documentId'];
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly amount: number;
  readonly rawAmount: string;
  readonly text: string;
}

export interface RunningHistoryRow extends ApprovedHistoryRow {
  readonly balance: AccountBalance;
}

function openingBalance(snapshot: Level2CaseSnapshot, accountNumber: Level2AccountNumber): AccountBalance {
  const balance = snapshot.derived.startBalances.find(candidate => candidate.accountNumber === accountNumber);
  if (!balance) throw new Error('Missing start balance ' + accountNumber);
  return balance;
}

function signed(balance: Pick<AccountBalance, 'amount' | 'side'>): number {
  if (balance.side === 'zero') return 0;
  return balance.side === 'debit' ? balance.amount : -balance.amount;
}

function toBalance(accountNumber: Level2AccountNumber, amount: number): AccountBalance {
  if (amount === 0) return { accountNumber, amount: 0, side: 'zero' };
  return { accountNumber, amount: Math.abs(amount), side: amount > 0 ? 'debit' : 'credit' };
}

function parsedHistoryRow(row: StudentPostingRow): ApprovedHistoryRow | null {
  const parsed = parsePostingAmount(row.rawAmount);
  if (parsed.kind !== 'valid') return null;
  return { ...row, amount: parsed.value };
}

export function selectApprovedHistory(
  state: Level2StudentState,
  accountNumber?: Level2AccountNumber,
): readonly ApprovedHistoryRow[] {
  const rows: ApprovedHistoryRow[] = [];
  for (const documentId of LEVEL2_DOCUMENT_IDS) {
    const document = state.documents.find(candidate => candidate.documentId === documentId);
    if (!document) continue;
    const approvedKeys = new Set(document.groups
      .filter(group => group.status === 'correct')
      .map(group => group.accountNumber + ':' + group.side));
    if (document.status !== 'completed' && document.status !== 'active') continue;
    for (const studentRow of document.rows) {
      if (accountNumber && studentRow.accountNumber !== accountNumber) continue;
      if (!approvedKeys.has(studentRow.accountNumber + ':' + studentRow.side)) continue;
      const approved = parsedHistoryRow(studentRow);
      if (approved) rows.push(approved);
    }
  }
  return rows;
}

export function selectRecentApprovedHistory(
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
  maximum = 3,
): readonly ApprovedHistoryRow[] {
  return selectApprovedHistory(state, accountNumber).slice(-maximum);
}

export function selectRunningHistory(
  snapshot: Level2CaseSnapshot,
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
): readonly RunningHistoryRow[] {
  let current = signed(openingBalance(snapshot, accountNumber));
  return selectApprovedHistory(state, accountNumber).map(row => {
    current += row.side === 'debit' ? row.amount : -row.amount;
    return { ...row, balance: toBalance(accountNumber, current) };
  });
}

export function selectCurrentAccountBalance(
  snapshot: Level2CaseSnapshot,
  state: Level2StudentState,
  accountNumber: Level2AccountNumber,
): AccountBalance | null {
  let current = signed(openingBalance(snapshot, accountNumber));
  for (const document of state.documents) {
    if (document.status === 'pending') continue;
    for (const row of document.rows) {
      if (row.accountNumber !== accountNumber) continue;
      const meaningful = row.rawAmount.trim() !== '' || row.text.trim() !== '';
      if (!meaningful) continue;
      const parsed = parsePostingAmount(row.rawAmount);
      if (parsed.kind !== 'valid') return null;
      current += row.side === 'debit' ? parsed.value : -parsed.value;
    }
  }
  return toBalance(accountNumber, current);
}

export function selectOpeningBalance(
  snapshot: Level2CaseSnapshot,
  accountNumber: Level2AccountNumber,
): AccountBalance {
  return openingBalance(snapshot, accountNumber);
}

