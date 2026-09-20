import type { V2AnswerKey } from '../../src/domain/level2/v2';
import type { V2Storage } from '../../src/level2/v2/session';
import { V2_CHECKPOINT_BALANCE_ACCOUNTS } from '../../src/level2/v2/state';
import {
  type V2ControllerClock,
  type V2ControllerCurrentSession,
  type V2ControllerStartResult,
  addV2ControllerPostingRow,
  advanceV2ControllerDocumentReview,
  checkV2ControllerCheckpointSection,
  checkV2ControllerCurrentDocument,
  editV2ControllerCheckpointAmount,
  editV2ControllerCheckpointBalance,
} from '../../src/level2/v2/controller';

export class V2ControllerStorage implements V2Storage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];
  failGet = false;
  failSet = false;

  getItem(key: string): string | null {
    this.reads.push(key);
    if (this.failGet) throw new Error('SecurityError');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    if (this.failSet) throw new Error('QuotaExceededError');
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.values.delete(key);
  }
}

export function sequenceClock(start = 0): V2ControllerClock {
  let tick = start;
  return () => new Date(Date.UTC(2026, 8, 20, 12, 0, tick++)).toISOString();
}

export function startedCurrent(result: V2ControllerStartResult): V2ControllerCurrentSession {
  if (!result.ok) throw new Error('Expected successful V2.1 controller start');
  return result.current;
}

export function completeCurrentDocumentThroughV2Controller(
  storage: V2ControllerStorage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  const documentId = current.studentState.currentDocumentId;
  if (current.studentState.phase !== 'documentEntry' || documentId === null) {
    throw new Error('Expected document entry');
  }
  const answer = current.caseSnapshot.answers.documents.find(document => document.id === documentId);
  if (!answer) throw new Error('Missing answer document');
  let next = current;
  for (const posting of answer.expectedPostings) {
    next = addV2ControllerPostingRow(
      storage,
      next,
      clock,
      posting.accountNumber,
      posting.side,
      String(posting.amount),
      posting.text,
    );
  }
  return checkV2ControllerCurrentDocument(storage, next, clock);
}

export function advanceToCheckpointThroughV2Controller(
  storage: V2ControllerStorage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
): V2ControllerCurrentSession {
  let next = current;
  for (let index = 0; index < current.caseSnapshot.answers.documents.length; index += 1) {
    next = completeCurrentDocumentThroughV2Controller(storage, next, clock);
    next = advanceV2ControllerDocumentReview(storage, next, clock);
  }
  if (next.studentState.phase !== 'checkpoint') throw new Error('Expected checkpoint');
  return next;
}

export function completeCheckpointThroughV2Controller(
  storage: V2ControllerStorage,
  current: V2ControllerCurrentSession,
  clock: V2ControllerClock,
  answers: V2AnswerKey = current.caseSnapshot.answers,
): V2ControllerCurrentSession {
  let next = current;
  for (const sectionId of ['A', 'B'] as const) {
    const expected = answers.reconciliation[sectionId];
    next = editV2ControllerCheckpointAmount(storage, next, clock, sectionId, 'wageAccountYtd', String(expected.wageAccountYtd));
    next = editV2ControllerCheckpointAmount(storage, next, clock, sectionId, 'employeePensionYtd', String(expected.employeePensionYtd));
    next = editV2ControllerCheckpointAmount(storage, next, clock, sectionId, 'employeeAtpYtd', String(expected.employeeAtpYtd));
    next = editV2ControllerCheckpointAmount(storage, next, clock, sectionId, 'calculatedGrossPayYtd', String(expected.calculatedGrossPayYtd));
    next = checkV2ControllerCheckpointSection(storage, next, clock, sectionId);
  }
  const expectedC = answers.reconciliation.C;
  next = editV2ControllerCheckpointAmount(storage, next, clock, 'C', 'employerPension', String(expectedC.employerPension.bookedAmount));
  next = editV2ControllerCheckpointAmount(storage, next, clock, 'C', 'employerAtp', String(expectedC.employerAtp.bookedAmount));
  next = editV2ControllerCheckpointAmount(storage, next, clock, 'C', 'grossHolidayPay', String(expectedC.grossHolidayPay.bookedAmount));
  next = editV2ControllerCheckpointAmount(storage, next, clock, 'C', 'holidayLiabilityAdjustment', String(expectedC.holidayLiabilityAdjustment.bookedAmount));
  next = checkV2ControllerCheckpointSection(storage, next, clock, 'C');
  next = editV2ControllerCheckpointAmount(storage, next, clock, 'D', 'operatingTotal', String(answers.reconciliation.D.bookedAmount));
  next = checkV2ControllerCheckpointSection(storage, next, clock, 'D');
  for (const accountNumber of V2_CHECKPOINT_BALANCE_ACCOUNTS) {
    const expected = answers.reconciliation.E.find(item => item.accountNumber === accountNumber);
    if (!expected) throw new Error('Missing checkpoint balance');
    next = editV2ControllerCheckpointBalance(storage, next, clock, accountNumber, {
      rawAmount: String(expected.bookedAmount),
      side: expected.bookedSide === 'credit' ? 'K' : 'D',
    });
  }
  return checkV2ControllerCheckpointSection(storage, next, clock, 'E');
}
