import { LEVEL2_ACCOUNT_NUMBERS, type AccountBalance, type AccountMovement, type LedgerAccount, type LedgerState, type Level2AccountNumber, type Posting } from './types';
import { requireWholeKrone } from './ruleset';

function signed(side: AccountBalance['side'], amount: number): number {
  if (side === 'zero') return 0;
  return side === 'debit' ? amount : -amount;
}

function toBalance(accountNumber: Level2AccountNumber, value: number): AccountBalance {
  if (value === 0) return Object.freeze({ accountNumber, amount: 0, side: 'zero' });
  return Object.freeze({ accountNumber, amount: Math.abs(value), side: value > 0 ? 'debit' : 'credit' });
}

export function createZeroBalances(): readonly AccountBalance[] {
  return Object.freeze(LEVEL2_ACCOUNT_NUMBERS.map(accountNumber =>
    Object.freeze({ accountNumber, amount: 0, side: 'zero' as const }),
  ));
}

export function applyLedger(
  openingBalances: readonly AccountBalance[],
  postings: readonly Posting[],
): LedgerState {
  const openingByAccount = new Map<Level2AccountNumber, AccountBalance>();
  for (const balance of openingBalances) {
    requireWholeKrone(balance.amount, 'opening balance ' + balance.accountNumber);
    if (balance.amount === 0 && balance.side !== 'zero') throw new Error('Zero opening balance must use zero side');
    if (balance.amount > 0 && balance.side === 'zero') throw new Error('Non-zero opening balance must have debit or credit side');
    if (openingByAccount.has(balance.accountNumber)) throw new Error('Duplicate opening balance: ' + balance.accountNumber);
    openingByAccount.set(balance.accountNumber, balance);
  }

  const values = new Map<Level2AccountNumber, number>();
  const movements = new Map<Level2AccountNumber, AccountMovement[]>();
  for (const accountNumber of LEVEL2_ACCOUNT_NUMBERS) {
    const opening = openingByAccount.get(accountNumber) ?? { accountNumber, amount: 0, side: 'zero' as const };
    values.set(accountNumber, signed(opening.side, opening.amount));
    movements.set(accountNumber, []);
  }

  for (const posting of postings) {
    requireWholeKrone(posting.amount, 'posting amount');
    const current = values.get(posting.accountNumber);
    if (current === undefined) throw new Error('Unknown account: ' + posting.accountNumber);
    values.set(posting.accountNumber, current + (posting.side === 'debit' ? posting.amount : -posting.amount));
    movements.get(posting.accountNumber)?.push(Object.freeze({
      documentId: posting.documentId,
      side: posting.side,
      amount: posting.amount,
      text: posting.text,
    }));
  }

  const accounts = LEVEL2_ACCOUNT_NUMBERS.map((accountNumber): LedgerAccount => {
    const openingBalance = openingByAccount.get(accountNumber) ??
      Object.freeze({ accountNumber, amount: 0, side: 'zero' as const });
    return Object.freeze({
      accountNumber,
      openingBalance,
      movements: Object.freeze(movements.get(accountNumber) ?? []),
      balance: toBalance(accountNumber, values.get(accountNumber) ?? 0),
    });
  });

  return Object.freeze({ accounts: Object.freeze(accounts) });
}

export function getBalance(ledger: LedgerState, accountNumber: Level2AccountNumber): AccountBalance {
  const account = ledger.accounts.find(candidate => candidate.accountNumber === accountNumber);
  if (!account) throw new Error('Unknown account: ' + accountNumber);
  return account.balance;
}
