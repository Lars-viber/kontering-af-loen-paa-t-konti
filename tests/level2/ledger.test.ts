import { describe, expect, it } from 'vitest';
import {
  R1_CHECKPOINT_LEDGER,
  R1_FINAL_LEDGER,
  applyLedger,
  getBalance,
  type Posting,
} from '../../src/domain/level2';

describe('Niveau 2 ledger', () => {
  it('netter debet og kredit generisk og bevarer bevægelser', () => {
    const postings: readonly Posting[] = [
      { documentId: 'B1', accountNumber: '5820', side: 'debit', amount: 100, text: 'Indbetaling' },
      { documentId: 'B1', accountNumber: '5820', side: 'credit', amount: 30, text: 'Udbetaling' },
    ];
    const ledger = applyLedger([], postings);
    expect(getBalance(ledger, '5820')).toEqual({ accountNumber: '5820', amount: 70, side: 'debit' });
    expect(ledger.accounts.find(account => account.accountNumber === '5820')?.movements).toHaveLength(2);
  });

  it('reproducerer checkpointets drifts- og balancesaldi', () => {
    expect(R1_CHECKPOINT_LEDGER.accounts.map(account => account.balance)).toEqual([
      { accountNumber: '2210', amount: 915932, side: 'debit' },
      { accountNumber: '2211', amount: 1164024, side: 'debit' },
      { accountNumber: '2215', amount: 260588, side: 'debit' },
      { accountNumber: '2223', amount: 14256, side: 'debit' },
      { accountNumber: '2230', amount: 119574, side: 'debit' },
      { accountNumber: '2235', amount: 32500, side: 'debit' },
      { accountNumber: '5820', amount: 1086225, side: 'debit' },
      { accountNumber: '6920', amount: 114447, side: 'credit' },
      { accountNumber: '6921', amount: 14256, side: 'credit' },
      { accountNumber: '6922', amount: 43884, side: 'credit' },
      { accountNumber: '6923', amount: 11716, side: 'credit' },
      { accountNumber: '6924', amount: 182500, side: 'credit' },
      { accountNumber: '6930', amount: 29654, side: 'credit' },
    ]);
  });

  it('reproducerer slutsaldi efter juli', () => {
    expect(getBalance(R1_FINAL_LEDGER, '5820')).toEqual({ accountNumber: '5820', amount: 879396, side: 'debit' });
    expect(getBalance(R1_FINAL_LEDGER, '6921')).toEqual({ accountNumber: '6921', amount: 7128, side: 'credit' });
    expect(getBalance(R1_FINAL_LEDGER, '6924')).toEqual({ accountNumber: '6924', amount: 182500, side: 'credit' });
    for (const account of ['6920', '6922', '6923', '6930'] as const) {
      expect(getBalance(R1_FINAL_LEDGER, account)).toEqual({ accountNumber: account, amount: 0, side: 'zero' });
    }
  });
});
