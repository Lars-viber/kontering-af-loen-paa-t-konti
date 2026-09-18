import { describe, expect, it } from 'vitest';
import {
  LEVEL2_ACCOUNTS,
  LEVEL2_ACCOUNT_NUMBERS,
  LEVEL2_DOCUMENT_IDS,
  R1_DOCUMENTS,
} from '../../src/domain/level2';

describe('Niveau 2 kontoplan og 13 bilag', () => {
  it('holder frossen konto- og dokumentrækkefølge', () => {
    expect(LEVEL2_ACCOUNTS.map(account => account.accountNumber)).toEqual(LEVEL2_ACCOUNT_NUMBERS);
    expect(R1_DOCUMENTS.map(document => document.id)).toEqual(LEVEL2_DOCUMENT_IDS);
    expect(R1_DOCUMENTS).toHaveLength(13);
  });

  it('balancerer alle bilag og har kun ikke-negative integerbeløb', () => {
    for (const document of R1_DOCUMENTS) {
      expect(document.balanced).toBe(true);
      expect(document.debitTotal).toBe(document.creditTotal);
      for (const posting of document.expectedPostings) {
        expect(Number.isInteger(posting.amount)).toBe(true);
        expect(posting.amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('reproducerer de frosne bilagstotaler', () => {
    expect(R1_DOCUMENTS.map(document => document.debitTotal)).toEqual([
      143539, 43741, 11632, 163200, 13848, 20400, 202500,
      16992, 8500, 7128, 144101, 43884, 11716,
    ]);
  });

  it('bogfører nettoløn direkte på Bank uden Skyldig løn', () => {
    for (const id of ['B4', 'B7'] as const) {
      const document = R1_DOCUMENTS.find(candidate => candidate.id === id);
      expect(document?.expectedPostings.some(posting =>
        posting.accountNumber === '5820' && posting.side === 'credit' && posting.text === 'Nettoløn',
      )).toBe(true);
    }
    expect(LEVEL2_ACCOUNTS.some(account => String(account.name) === 'Skyldig løn')).toBe(false);
  });
});
