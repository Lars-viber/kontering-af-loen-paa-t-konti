import { generateV2Case } from '../../src/domain/level2/v2';
import { createInitialV2StudentState, type V2StudentState } from '../../src/level2/v2/state';
import {
  createV2PersistedSession,
  type V2PersistedSession,
  type V2Storage,
} from '../../src/level2/v2/session';

export const V2_SESSION_CASE_42 = generateV2Case(42);
export const V2_SESSION_CASE_999999 = generateV2Case(999999);
export const V2_SESSION_TIMESTAMP = '2026-09-19T12:34:56.000Z';

export function createV2TestSession(
  studentState: V2StudentState = createInitialV2StudentState(),
  caseSnapshot = V2_SESSION_CASE_42,
): V2PersistedSession {
  return createV2PersistedSession(caseSnapshot, studentState, V2_SESSION_TIMESTAMP);
}

export function jsonCloneV2<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class FakeV2Storage implements V2Storage {
  readonly values = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];
  failGet = false;
  failSet = false;
  failRemove = false;

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
    if (this.failRemove) throw new Error('SecurityError');
    this.values.delete(key);
  }
}
