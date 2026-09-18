import { ACCOUNT_IDS, parseAmount, type AccountId, type Answer, type EntrySide } from '../domain/payroll';
import type { StudentState } from './types';

export type StudentAnswerResult =
  | { readonly ok: true; readonly answer: Answer }
  | { readonly ok: false; readonly accountId: AccountId; readonly side: EntrySide };

export function studentAnswerFromState(state: StudentState): StudentAnswerResult {
  const entries: [AccountId, { debit: number; credit: number }][] = [];
  for (const accountId of ACCOUNT_IDS) {
    const debit = parseAmount(state[accountId].debit.rawInput);
    if (!debit.ok) return { ok: false, accountId, side: 'debit' };
    const credit = parseAmount(state[accountId].credit.rawInput);
    if (!credit.ok) return { ok: false, accountId, side: 'credit' };
    entries.push([accountId, { debit: debit.value, credit: credit.value }]);
  }
  return { ok: true, answer: Object.fromEntries(entries) as Answer };
}