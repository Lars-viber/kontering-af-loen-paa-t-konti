import { ACCOUNT_IDS, type EntrySide } from '../../src/domain/payroll';
import { createSessionFromVariant, updateStudentField, type PayrollSession } from '../../src/session';
import { checkSession } from '../../src/session/exercise';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];
const clock = () => '2026-09-17T14:00:00.000Z';

export function createCompletedSession(variant = 42, dottedAccount?: string): PayrollSession {
  let session = createSessionFromVariant(variant, clock);
  for (const accountId of ACCOUNT_IDS) for (const side of SIDES) {
    const value = session.exerciseSnapshot.answerKey[accountId][side];
    if (value > 0) {
      const raw = accountId === dottedAccount ? new Intl.NumberFormat('da-DK').format(value) : String(value);
      session = updateStudentField(session, accountId, side, raw, clock);
    }
  }
  const completed = checkSession(session, clock);
  if (!completed.completed) throw new Error('Test helper failed to complete session');
  return completed;
}
