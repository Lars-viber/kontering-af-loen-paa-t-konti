import { describe, expect, it } from 'vitest';
import {
  LEVEL2_SESSION_STORAGE_KEY,
  loadLevel2Session,
  removeLevel2Session,
  saveLevel2Session,
  type Level2Storage,
} from '../../src/level2/session';
import { createTestSession } from './session-test-helpers';

const LEVEL1_KEY = 'kontering-af-loen-paa-t-konti.session.v1';

class FakeStorage implements Level2Storage {
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

describe('Level 2 session storage adapter', () => {
  it('uses only the frozen Level 2 key for save, load and remove', () => {
    const storage = new FakeStorage();
    storage.values.set(LEVEL1_KEY, 'level-one-data');
    const session = createTestSession();

    expect(saveLevel2Session(storage, session)).toEqual({ ok: true });
    expect(storage.writes).toEqual([LEVEL2_SESSION_STORAGE_KEY]);
    expect(loadLevel2Session(storage)).toEqual({ status: 'loaded', session });
    expect(storage.reads).toEqual([LEVEL2_SESSION_STORAGE_KEY]);
    expect(removeLevel2Session(storage)).toEqual({ ok: true });
    expect(storage.removals).toEqual([LEVEL2_SESSION_STORAGE_KEY]);
    expect(storage.values.get(LEVEL1_KEY)).toBe('level-one-data');
  });

  it('returns none when the Level 2 key is absent', () => {
    expect(loadLevel2Session(new FakeStorage())).toEqual({ status: 'none' });
  });

  it('returns invalid without overwriting or removing corrupt stored data', () => {
    const storage = new FakeStorage();
    storage.values.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    expect(loadLevel2Session(storage)).toEqual({ status: 'invalid', reason: 'malformedJson' });
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
    expect(storage.values.get(LEVEL2_SESSION_STORAGE_KEY)).toBe('{broken');
  });

  it('converts get, set and remove exceptions to typed failures', () => {
    const getFailure = new FakeStorage();
    getFailure.failGet = true;
    expect(loadLevel2Session(getFailure)).toEqual({ status: 'storageFailure' });

    const setFailure = new FakeStorage();
    setFailure.failSet = true;
    expect(saveLevel2Session(setFailure, createTestSession())).toEqual({ ok: false, reason: 'storageFailure' });

    const removeFailure = new FakeStorage();
    removeFailure.failRemove = true;
    expect(removeLevel2Session(removeFailure)).toEqual({ ok: false, reason: 'storageFailure' });
  });
});

