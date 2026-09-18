import { ACCOUNT_IDS } from './accounts';
import type { Answer, StudentTotals } from './types';

export function calculateStudentTotals(answer: Answer): StudentTotals {
  const debit = ACCOUNT_IDS.reduce((sum, id) => sum + answer[id].debit, 0);
  const credit = ACCOUNT_IDS.reduce((sum, id) => sum + answer[id].credit, 0);
  return { debit, credit, status: debit === 0 && credit === 0 ? 'empty' : debit === credit ? 'balanced' : 'unbalanced' };
}