import { describe, expect, it, vi } from 'vitest';
import { generateLevel2Case } from '../../src/domain/level2';
import {
  inspectLevel2Session,
  removeInvalidLevel2Session,
  resumeLevel2Session,
  startNewLevel2Session,
} from '../../src/level2/controller';
import {
  LEVEL2_SESSION_STORAGE_KEY,
  createLevel2PersistedSession,
  saveLevel2Session,
} from '../../src/level2/session';
import { createInitialStudentState } from '../../src/level2/state';
import { ControllerStorage, LEVEL1_STORAGE_KEY } from './controller-test-helpers';

const clock = () => '2026-09-18T14:00:00.000Z';

describe('Level 2 controller lifecycle', () => {
  it('maps missing, valid, invalid and unavailable storage safely', () => {
    const empty = new ControllerStorage();
    expect(inspectLevel2Session(empty)).toEqual({ lifecycle: 'none', session: null, saveStatus: 'idle' });

    const valid = new ControllerStorage();
    const started = startNewLevel2Session(valid, 42, clock);
    expect(inspectLevel2Session(valid)).toEqual({ lifecycle: 'valid', session: started.session, saveStatus: 'idle' });

    const invalid = new ControllerStorage();
    invalid.data.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    expect(inspectLevel2Session(invalid)).toMatchObject({ lifecycle: 'invalid', removeError: false });

    const unavailable = new ControllerStorage();
    unavailable.failGet = true;
    expect(inspectLevel2Session(unavailable)).toEqual({ lifecycle: 'storageError', session: null, saveStatus: 'error' });
  });

  it('starts a specific variant through the sole new-case path', () => {
    const storage = new ControllerStorage();
    const factory = vi.fn(generateLevel2Case);
    const state = startNewLevel2Session(storage, 42, clock, factory);
    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith(42);
    expect(state).toMatchObject({ lifecycle: 'valid', saveStatus: 'saved', session: { variant: 42 } });
    expect(storage.writes).toEqual([LEVEL2_SESSION_STORAGE_KEY]);
  });

  it('resumes snapshot, state and variant with zero generator calls', () => {
    const storage = new ControllerStorage();
    const factory = vi.fn(generateLevel2Case);
    const snapshot = factory(42);
    const studentState = createInitialStudentState(snapshot);
    const session = createLevel2PersistedSession(snapshot, studentState, clock());
    expect(saveLevel2Session(storage, session)).toEqual({ ok: true });
    factory.mockClear();

    const inspected = inspectLevel2Session(storage);
    expect(inspected.lifecycle).toBe('valid');
    if (inspected.lifecycle !== 'valid') return;
    const resumed = resumeLevel2Session(inspected);
    expect(factory).toHaveBeenCalledTimes(0);
    expect(resumed.variant).toBe(42);
    expect(resumed.caseSnapshot).toEqual(session.caseSnapshot);
    expect(resumed.studentState).toEqual(session.studentState);
  });

  it('does not overwrite invalid data and removes it only on explicit request', () => {
    const storage = new ControllerStorage();
    storage.data.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    const invalid = inspectLevel2Session(storage);
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
    const removed = removeInvalidLevel2Session(storage, invalid);
    expect(removed.lifecycle).toBe('none');
    expect(storage.removals).toEqual([LEVEL2_SESSION_STORAGE_KEY]);
  });

  it('keeps invalid status when explicit removal fails', () => {
    const storage = new ControllerStorage();
    storage.data.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    const invalid = inspectLevel2Session(storage);
    storage.failRemove = true;
    expect(removeInvalidLevel2Session(storage, invalid)).toMatchObject({
      lifecycle: 'invalid', removeError: true, saveStatus: 'error',
    });
    expect(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)).toBe('{broken');
  });

  it('never reads, writes or removes the Level 1 key', () => {
    const storage = new ControllerStorage();
    storage.data.set(LEVEL1_STORAGE_KEY, 'level-one-session');
    const started = startNewLevel2Session(storage, 42, clock);
    inspectLevel2Session(storage);
    storage.data.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    removeInvalidLevel2Session(storage, inspectLevel2Session(storage));
    expect(started.session.variant).toBe(42);
    expect(storage.data.get(LEVEL1_STORAGE_KEY)).toBe('level-one-session');
    expect([...storage.reads, ...storage.writes, ...storage.removals]).not.toContain(LEVEL1_STORAGE_KEY);
  });
});
