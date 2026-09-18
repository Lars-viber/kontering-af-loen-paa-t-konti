import type { AccountId, EntrySide } from '../domain/payroll';
import { updateStudentField } from './studentState';
import { saveSession } from './storage';
import type { PayrollSession, StorageLike, StorageWriteResult } from './types';

export function updateAndSaveStudentField(
  storage: StorageLike,
  session: PayrollSession,
  accountId: AccountId,
  side: EntrySide,
  rawInput: string,
  now?: () => string,
): { readonly session: PayrollSession; readonly save: StorageWriteResult } {
  const updated = updateStudentField(session, accountId, side, rawInput, now);
  if (updated === session) return { session, save: { ok: true } };
  return { session: updated, save: saveSession(storage, updated) };
}