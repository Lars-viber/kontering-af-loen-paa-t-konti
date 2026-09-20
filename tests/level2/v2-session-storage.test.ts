import { describe, expect, it } from 'vitest';
import {
  V2_LEGACY_SESSION_STORAGE_KEY,
  V2_SESSION_STORAGE_KEY,
  detectLegacyV1Session,
  encodeV2Session,
  loadV2Session,
  removeV2Session,
  saveV2Session,
} from '../../src/level2/v2/session';
import {
  FakeV2Storage,
  createV2TestSession,
} from './v2-session-test-helpers';

const LEVEL1_KEY = 'kontering-af-loen-paa-t-konti.session.v1';

describe('V2.1 session storage adapter', () => {
  it('save/load/remove bruger kun v2-key og bevarer Level 1 samt legacy V1', () => {
    const storage = new FakeV2Storage();
    storage.values.set(LEVEL1_KEY, 'level-one-data');
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy-level-two-data');
    const session = createV2TestSession();

    expect(saveV2Session(storage, session)).toEqual({ ok: true });
    expect(storage.writes).toEqual([V2_SESSION_STORAGE_KEY]);
    expect(storage.values.get(LEVEL1_KEY)).toBe('level-one-data');
    expect(storage.values.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy-level-two-data');

    expect(loadV2Session(storage)).toEqual({ status: 'loaded', session });
    expect(storage.reads).toEqual([V2_SESSION_STORAGE_KEY]);

    expect(removeV2Session(storage)).toEqual({ ok: true });
    expect(storage.removals).toEqual([V2_SESSION_STORAGE_KEY]);
    expect(storage.values.get(LEVEL1_KEY)).toBe('level-one-data');
    expect(storage.values.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy-level-two-data');
  });

  it('rapporterer v1-only separat uden migration, write eller delete', () => {
    const storage = new FakeV2Storage();
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    expect(loadV2Session(storage)).toEqual({ status: 'missing' });
    expect(detectLegacyV1Session(storage)).toEqual({
      status: 'available',
      legacyV1Present: true,
    });
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
    expect(storage.values.has(V2_SESSION_STORAGE_KEY)).toBe(false);
  });

  it('lader valid v2 og legacy v1 eksistere samtidig', () => {
    const storage = new FakeV2Storage();
    const session = createV2TestSession();
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    storage.values.set(V2_SESSION_STORAGE_KEY, encodeV2Session(session));

    expect(loadV2Session(storage)).toEqual({ status: 'loaded', session });
    expect(detectLegacyV1Session(storage)).toEqual({
      status: 'available',
      legacyV1Present: true,
    });
    expect(storage.removals).toEqual([]);
    expect(storage.values.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy');
  });

  it('falder ikke tilbage til v1 ved invalid v2 og sletter ingen keys', () => {
    const storage = new FakeV2Storage();
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'valid-enough-for-presence');
    storage.values.set(V2_SESSION_STORAGE_KEY, '{broken');

    expect(loadV2Session(storage)).toEqual({
      status: 'invalid',
      reason: 'malformedJson',
    });
    expect(detectLegacyV1Session(storage)).toEqual({
      status: 'available',
      legacyV1Present: true,
    });
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
    expect(storage.values.get(V2_SESSION_STORAGE_KEY)).toBe('{broken');
  });

  it('returnerer false når legacy-key ikke findes', () => {
    expect(detectLegacyV1Session(new FakeV2Storage())).toEqual({
      status: 'available',
      legacyV1Present: false,
    });
  });

  it('konverterer get/set/remove failures til typed resultater uden retry', () => {
    const getFailure = new FakeV2Storage();
    getFailure.failGet = true;
    expect(loadV2Session(getFailure)).toEqual({ status: 'storageFailure' });
    expect(getFailure.reads).toEqual([V2_SESSION_STORAGE_KEY]);

    const legacyGetFailure = new FakeV2Storage();
    legacyGetFailure.failGet = true;
    expect(detectLegacyV1Session(legacyGetFailure)).toEqual({ status: 'storageFailure' });
    expect(legacyGetFailure.reads).toEqual([V2_LEGACY_SESSION_STORAGE_KEY]);

    const setFailure = new FakeV2Storage();
    setFailure.values.set(V2_SESSION_STORAGE_KEY, 'previous-session');
    setFailure.failSet = true;
    expect(saveV2Session(setFailure, createV2TestSession())).toEqual({
      ok: false,
      reason: 'storageFailure',
    });
    expect(setFailure.writes).toEqual([V2_SESSION_STORAGE_KEY]);
    expect(setFailure.values.get(V2_SESSION_STORAGE_KEY)).toBe('previous-session');
    expect(setFailure.removals).toEqual([]);

    const removeFailure = new FakeV2Storage();
    removeFailure.values.set(V2_SESSION_STORAGE_KEY, 'current-session');
    removeFailure.failRemove = true;
    expect(removeV2Session(removeFailure)).toEqual({
      ok: false,
      reason: 'storageFailure',
    });
    expect(removeFailure.values.get(V2_SESSION_STORAGE_KEY)).toBe('current-session');
  });

  it('afviser invalid session før storage write', () => {
    const storage = new FakeV2Storage();
    const invalid = {
      ...createV2TestSession(),
      schemaVersion: 1,
    } as never;
    expect(saveV2Session(storage, invalid)).toEqual({
      ok: false,
      reason: 'invalidSession',
    });
    expect(storage.writes).toEqual([]);
  });
});
