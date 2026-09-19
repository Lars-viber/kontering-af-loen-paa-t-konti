import { deepFreezeLevel2 } from '../readonly';
import { requireWholeKrone } from '../ruleset';
import { V2_ACCOUNT_NUMBERS } from './types';
import type {
  V2AccountBalance,
  V2AccountNumber,
  V2ExpectedDocument,
  V2ExpectedPosting,
  V2ExternalTally,
  V2LiabilityControl,
  V2LiabilityControlId,
  V2PostingSide,
  V2TallyId,
} from './types';

export interface V2PostingDraft {
  readonly accountNumber: V2AccountNumber;
  readonly side: V2PostingSide;
  readonly amount: number;
  readonly text: string;
}

export function createV2ExpectedDocument(
  id: V2ExpectedDocument['id'],
  title: string,
  drafts: readonly V2PostingDraft[],
): V2ExpectedDocument {
  const expectedPostings = drafts.map((draft): V2ExpectedPosting => {
    requireWholeKrone(draft.amount, 'posting amount');
    if (draft.amount <= 0) throw new RangeError('posting amount must be positive');
    return Object.freeze({ documentId: id, ...draft });
  });
  const debitTotal = expectedPostings
    .filter(posting => posting.side === 'debit')
    .reduce((sum, posting) => sum + posting.amount, 0);
  const creditTotal = expectedPostings
    .filter(posting => posting.side === 'credit')
    .reduce((sum, posting) => sum + posting.amount, 0);

  return deepFreezeLevel2({
    id,
    title,
    expectedPostings,
    debitTotal,
    creditTotal,
    balanced: debitTotal === creditTotal,
  });
}

function signed(balance: V2AccountBalance): number {
  if (balance.side === 'zero') return 0;
  return balance.side === 'debit' ? balance.amount : -balance.amount;
}

function toBalance(accountNumber: V2AccountNumber, signedAmount: number): V2AccountBalance {
  if (signedAmount === 0) return Object.freeze({ accountNumber, amount: 0, side: 'zero' });
  return Object.freeze({
    accountNumber,
    amount: Math.abs(signedAmount),
    side: signedAmount > 0 ? 'debit' : 'credit',
  });
}

export function applyV2Ledger(
  openingBalances: readonly V2AccountBalance[],
  documents: readonly V2ExpectedDocument[],
): readonly V2AccountBalance[] {
  const values = new Map<V2AccountNumber, number>(
    V2_ACCOUNT_NUMBERS.map(accountNumber => [accountNumber, 0]),
  );

  for (const balance of openingBalances) {
    requireWholeKrone(balance.amount, 'opening balance ' + balance.accountNumber);
    if (balance.amount === 0 && balance.side !== 'zero') throw new Error('Zero balance must use zero side');
    if (balance.amount > 0 && balance.side === 'zero') throw new Error('Non-zero balance must have debit or credit side');
    values.set(balance.accountNumber, signed(balance));
  }

  for (const document of documents) {
    for (const posting of document.expectedPostings) {
      const current = values.get(posting.accountNumber);
      if (current === undefined) throw new Error('Unknown V2.1 account: ' + posting.accountNumber);
      values.set(
        posting.accountNumber,
        current + (posting.side === 'debit' ? posting.amount : -posting.amount),
      );
    }
  }

  return Object.freeze(V2_ACCOUNT_NUMBERS.map(accountNumber =>
    toBalance(accountNumber, values.get(accountNumber) ?? 0),
  ));
}

export function getV2Balance(
  balances: readonly V2AccountBalance[],
  accountNumber: V2AccountNumber,
): V2AccountBalance {
  const balance = balances.find(candidate => candidate.accountNumber === accountNumber);
  if (!balance) throw new Error('Missing V2.1 account: ' + accountNumber);
  return balance;
}

export function getV2Tally(
  tallies: readonly V2ExternalTally[],
  id: V2TallyId,
): V2ExternalTally {
  const tally = tallies.find(candidate => candidate.id === id);
  if (!tally) throw new Error('Missing V2.1 tælleværk: ' + id);
  return tally;
}

export function getV2LiabilityControl(
  controls: readonly V2LiabilityControl[],
  id: V2LiabilityControlId,
): V2LiabilityControl {
  const control = controls.find(candidate => candidate.id === id);
  if (!control) throw new Error('Missing V2.1 liability control: ' + id);
  return control;
}

export function reconciliationDifference(bookedAmount: number, controlAmount: number): number {
  requireWholeKrone(bookedAmount, 'bookedAmount');
  requireWholeKrone(controlAmount, 'controlAmount');
  return bookedAmount - controlAmount;
}
