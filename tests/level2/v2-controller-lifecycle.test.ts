import { describe, expect, it, vi } from 'vitest';
import { generateV2Case } from '../../src/domain/level2/v2';
import {
  V2_LEGACY_SESSION_STORAGE_KEY,
  V2_SESSION_STORAGE_KEY,
} from '../../src/level2/v2/session';
import {
  addV2ControllerPostingRow,
  loadCurrentV2ControllerSession,
  resetV2ControllerSession,
  retryV2ControllerSave,
  startNewV2ControllerSession,
} from '../../src/level2/v2/controller';
import {
  V2ControllerStorage,
  sequenceClock,
  startedCurrent,
} from './v2-controller-test-helpers';

describe('V2.1 controller lifecycle', () => {
  it('starts explicit variant 42 with exactly one generator call and one save', () => {
    const storage = new V2ControllerStorage();
    const factory = vi.fn(generateV2Case);
    const current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock(), factory));
    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith(42);
    expect(current.variant).toBe(42);
    expect(current.studentState).toMatchObject({ phase: 'documentEntry', currentDocumentId: 'B1' });
    expect(current.saveStatus).toBe('saved');
    expect(current.lastSuccessfulSavedAt).toBe('2026-09-20T12:00:00.000Z');
    expect(storage.writes).toEqual([V2_SESSION_STORAGE_KEY]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1000000, '42']) (
    'rejects invalid explicit variant %s without generation, write or deletion',
    invalid => {
      const storage = new V2ControllerStorage();
      storage.values.set(V2_SESSION_STORAGE_KEY, 'existing');
      const factory = vi.fn(generateV2Case);
      expect(startNewV2ControllerSession(
        storage,
        invalid as unknown as number,
        sequenceClock(),
        factory,
      )).toEqual({ ok: false, reason: 'invalidVariant' });
      expect(factory).not.toHaveBeenCalled();
      expect(storage.writes).toEqual([]);
      expect(storage.removals).toEqual([]);
      expect(storage.values.get(V2_SESSION_STORAGE_KEY)).toBe('existing');
    },
  );

  it('loads authoritative persisted state with zero generator calls and reports legacy presence', () => {
    const storage = new V2ControllerStorage();
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    const factory = vi.fn(generateV2Case);
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock(), factory));
    current = addV2ControllerPostingRow(storage, current, sequenceClock(10), '6920', 'debit', '123', 'saved');
    factory.mockClear();

    const loaded = loadCurrentV2ControllerSession(storage);
    expect(factory).not.toHaveBeenCalled();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.legacyV1Present).toBe(true);
    expect(loaded.current.variant).toBe(42);
    expect(loaded.current.caseSnapshot).toEqual(current.caseSnapshot);
    expect(loaded.current.studentState).toEqual(current.studentState);
    expect(loaded.current.studentState.documents[0].rows[0].text).toBe('saved');
  });

  it('returns typed missing, invalid and storageFailure results without fallback or generation', () => {
    const missing = new V2ControllerStorage();
    missing.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    expect(loadCurrentV2ControllerSession(missing)).toEqual({
      status: 'missing',
      legacyV1Present: true,
    });

    const invalid = new V2ControllerStorage();
    invalid.values.set(V2_SESSION_STORAGE_KEY, '{broken');
    invalid.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    expect(loadCurrentV2ControllerSession(invalid)).toEqual({
      status: 'invalid',
      reason: 'malformedJson',
      legacyV1Present: true,
    });
    expect(invalid.writes).toEqual([]);
    expect(invalid.removals).toEqual([]);

    const unavailable = new V2ControllerStorage();
    unavailable.failGet = true;
    expect(loadCurrentV2ControllerSession(unavailable)).toEqual({
      status: 'storageFailure',
      legacyV1Present: null,
    });
  });

  it.each([42, 999999])('loads and resets variant %i without regeneration', variant => {
    const storage = new V2ControllerStorage();
    const factory = vi.fn(generateV2Case);
    let current = startedCurrent(startNewV2ControllerSession(storage, variant, sequenceClock(), factory));
    current = addV2ControllerPostingRow(storage, current, sequenceClock(10), '6920', 'debit', '123');
    const snapshot = current.caseSnapshot;
    factory.mockClear();
    const loaded = loadCurrentV2ControllerSession(storage);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    const reset = resetV2ControllerSession(storage, loaded.current, sequenceClock(20));
    expect(factory).not.toHaveBeenCalled();
    expect(reset.variant).toBe(variant);
    expect(reset.caseSnapshot).toBe(loaded.current.caseSnapshot);
    expect(reset.caseSnapshot).toEqual(snapshot);
    expect(reset.studentState).toMatchObject({ phase: 'documentEntry', currentDocumentId: 'B1' });
    expect(reset.studentState.documents[0].rows).toEqual([]);
    expect(reset.saveStatus).toBe('saved');
  });

  it('keeps reset state in memory on failure and retries that same state with a fresh timestamp', () => {
    const storage = new V2ControllerStorage();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock()));
    current = addV2ControllerPostingRow(storage, current, sequenceClock(10), '6920', 'debit', '123');
    const previousSavedAt = current.lastSuccessfulSavedAt;
    storage.failSet = true;
    const reset = resetV2ControllerSession(storage, current, sequenceClock(20));
    expect(reset.studentState.documents[0].rows).toEqual([]);
    expect(reset.saveStatus).toBe('saveFailed');
    expect(reset.lastSuccessfulSavedAt).toBe(previousSavedAt);
    storage.failSet = false;
    const retried = retryV2ControllerSave(storage, reset, sequenceClock(30));
    expect(retried.saveStatus).toBe('saved');
    expect(retried.studentState).toBe(reset.studentState);
    expect(retried.lastSuccessfulSavedAt).toBe('2026-09-20T12:00:30.000Z');
    expect(JSON.parse(storage.values.get(V2_SESSION_STORAGE_KEY)!).studentState.documents[0].rows).toEqual([]);
  });

  it('never deletes or rewrites the legacy V1 key', () => {
    const storage = new V2ControllerStorage();
    storage.values.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy');
    const current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock()));
    resetV2ControllerSession(storage, current, sequenceClock(10));
    expect(storage.values.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy');
    expect(storage.writes).not.toContain(V2_LEGACY_SESSION_STORAGE_KEY);
    expect(storage.removals).toEqual([]);
  });

  it('does not remove the previously persisted V2 session before a failed replacement save', () => {
    const storage = new V2ControllerStorage();
    startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock()));
    const previousRaw = storage.values.get(V2_SESSION_STORAGE_KEY);
    storage.failSet = true;
    const replacement = startedCurrent(startNewV2ControllerSession(storage, 43, sequenceClock(10)));
    expect(replacement.variant).toBe(43);
    expect(replacement.saveStatus).toBe('saveFailed');
    expect(storage.values.get(V2_SESSION_STORAGE_KEY)).toBe(previousRaw);
    expect(storage.removals).toEqual([]);
  });});
