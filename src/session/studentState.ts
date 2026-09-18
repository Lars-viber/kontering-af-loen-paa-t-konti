import { ACCOUNT_IDS, type AccountId, type EntrySide } from '../domain/payroll';
import { deepFreeze } from '../domain/payroll/readonly';
import type { PayrollSession, StudentFieldState, StudentState } from './types';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];

export function createInitialStudentState(): StudentState {
  return deepFreeze(Object.fromEntries(ACCOUNT_IDS.map(accountId => [
    accountId,
    Object.fromEntries(SIDES.map(side => [side, { rawInput: '', status: 'unchecked', locked: false }])) ,
  ])) as unknown as StudentState) as StudentState;
}

export function updateStudentField(
  session: PayrollSession,
  accountId: AccountId,
  side: EntrySide,
  rawInput: string,
  now: () => string = () => new Date().toISOString(),
): PayrollSession {
  if (!(ACCOUNT_IDS as readonly string[]).includes(accountId)) throw new Error('Unknown payroll account: ' + accountId);
  if (!SIDES.includes(side)) throw new Error('Unknown posting side: ' + side);
  const current = session.studentState[accountId][side];
  if (current.locked) return session;
  if (current.rawInput === rawInput && current.status === 'unchecked') return session;
  const nextField: StudentFieldState = { rawInput, status: 'unchecked', locked: false };
  const next: PayrollSession = {
    ...session,
    studentState: {
      ...session.studentState,
      [accountId]: { ...session.studentState[accountId], [side]: nextField },
    },
    completed: false,
    savedAt: now(),
  };
  return deepFreeze(next) as PayrollSession;
}
