import {
  ACCOUNT_IDS,
  gradeAnswer,
  parseAmount,
  type Answer,
  type EntrySide,
  type StudentTotals,
} from '../domain/payroll';
import { deepFreeze } from '../domain/payroll/readonly';
import { createInitialStudentState } from './studentState';
import { saveSession } from './storage';
import type { PayrollSession, StorageLike, StorageWriteResult, StudentState } from './types';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];

export interface DisplayTotals {
  readonly debit: number | null;
  readonly credit: number | null;
  readonly status: StudentTotals['status'] | 'invalid';
}

export function calculateDisplayTotals(state: StudentState): DisplayTotals {
  let debit = 0;
  let credit = 0;
  let debitValid = true;
  let creditValid = true;

  for (const accountId of ACCOUNT_IDS) {
    for (const side of SIDES) {
      const parsed = parseAmount(state[accountId][side].rawInput);
      if (!parsed.ok) {
        if (side === 'debit') debitValid = false;
        else creditValid = false;
      } else if (side === 'debit') debit += parsed.value;
      else credit += parsed.value;
    }
  }

  if (!debitValid || !creditValid) {
    return { debit: debitValid ? debit : null, credit: creditValid ? credit : null, status: 'invalid' };
  }
  return {
    debit,
    credit,
    status: debit === 0 && credit === 0 ? 'empty' : debit === credit ? 'balanced' : 'unbalanced',
  };
}

export function checkSession(
  session: PayrollSession,
  now: () => string = () => new Date().toISOString(),
): PayrollSession {
  const parsedEntries: [typeof ACCOUNT_IDS[number], { debit: number; credit: number }][] = [];
  const invalid = new Set<string>();

  for (const accountId of ACCOUNT_IDS) {
    const posting = { debit: 0, credit: 0 };
    for (const side of SIDES) {
      const parsed = parseAmount(session.studentState[accountId][side].rawInput);
      if (parsed.ok) posting[side] = parsed.value;
      else invalid.add(`${accountId}:${side}`);
    }
    parsedEntries.push([accountId, posting]);
  }

  const grading = gradeAnswer(Object.fromEntries(parsedEntries) as Answer, session.exerciseSnapshot.answerKey);
  const gradeMap = new Map(grading.fields.map(field => [`${field.accountId}:${field.side}`, field.status]));
  const nextStateEntries = ACCOUNT_IDS.map(accountId => {
    const fields = Object.fromEntries(SIDES.map(side => {
      const current = session.studentState[accountId][side];
      const correct = !invalid.has(`${accountId}:${side}`) && gradeMap.get(`${accountId}:${side}`) === 'correct';
      return [side, { rawInput: current.rawInput, status: correct ? 'correct' : 'incorrect', locked: correct }];
    }));
    return [accountId, fields];
  });
  const studentState = Object.fromEntries(nextStateEntries) as StudentState;
  const completed = ACCOUNT_IDS.every(accountId => SIDES.every(side => studentState[accountId][side].locked));
  return deepFreeze({ ...session, studentState, completed, savedAt: now() }) as PayrollSession;
}

export function resetSession(
  session: PayrollSession,
  now: () => string = () => new Date().toISOString(),
): PayrollSession {
  return deepFreeze({
    ...session,
    studentState: createInitialStudentState(),
    completed: false,
    savedAt: now(),
  }) as PayrollSession;
}

export function hasStudentProgress(state: StudentState): boolean {
  return ACCOUNT_IDS.some(accountId => SIDES.some(side => {
    const field = state[accountId][side];
    return field.rawInput !== '' || field.status !== 'unchecked' || field.locked;
  }));
}

function saveTransaction(storage: StorageLike, session: PayrollSession): { readonly session: PayrollSession; readonly save: StorageWriteResult } {
  return { session, save: saveSession(storage, session) };
}

export function checkAndSaveSession(
  storage: StorageLike,
  session: PayrollSession,
  now?: () => string,
): { readonly session: PayrollSession; readonly save: StorageWriteResult } {
  return saveTransaction(storage, checkSession(session, now));
}

export function resetAndSaveSession(
  storage: StorageLike,
  session: PayrollSession,
  now?: () => string,
): { readonly session: PayrollSession; readonly save: StorageWriteResult } {
  return saveTransaction(storage, resetSession(session, now));
}
