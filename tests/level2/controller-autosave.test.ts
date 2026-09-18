import { describe, expect, it, vi } from 'vitest';
import { generateLevel2Case } from '../../src/domain/level2';
import {
  applyLevel2StudentState,
  resetLevel2Session,
  retryLevel2Save,
  startNewLevel2Session,
} from '../../src/level2/controller';
import { LEVEL2_SESSION_STORAGE_KEY } from '../../src/level2/session';
import { addStudentPostingRow } from '../../src/level2/state';
import { ControllerStorage } from './controller-test-helpers';

const firstClock = () => '2026-09-18T14:00:00.000Z';
const secondClock = () => '2026-09-18T14:01:00.000Z';

describe('Level 2 autosave controller', () => {
  it('saves a meaningful transition with unchanged snapshot and variant', () => {
    const storage = new ControllerStorage();
    const initial = startNewLevel2Session(storage, 42, firstClock);
    const snapshot = initial.session.caseSnapshot;
    const nextStudentState = addStudentPostingRow(initial.session.studentState, '6920', 'debit', '10.000', 'test');
    const updated = applyLevel2StudentState(storage, initial, nextStudentState, secondClock);

    expect(updated.saveStatus).toBe('saved');
    expect(updated.session.studentState).toBe(nextStudentState);
    expect(updated.session.caseSnapshot).toBe(snapshot);
    expect(updated.session.variant).toBe(42);
    expect(updated.session.savedAt).toBe(secondClock());
    expect(JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!).studentState.documents[0].rows[0].rawAmount).toBe('10.000');
  });

  it('retains new in-memory state on save failure and retries the same session', () => {
    const storage = new ControllerStorage();
    const initial = startNewLevel2Session(storage, 42, firstClock);
    const nextStudentState = addStudentPostingRow(initial.session.studentState, '6920', 'debit', '123', 'ikke gemt');
    storage.failSet = true;
    const failed = applyLevel2StudentState(storage, initial, nextStudentState, secondClock);
    expect(failed.saveStatus).toBe('error');
    expect(failed.session.studentState).toBe(nextStudentState);
    expect(failed.session.savedAt).toBe(secondClock());

    storage.failSet = false;
    const retried = retryLevel2Save(storage, failed);
    expect(retried.saveStatus).toBe('saved');
    expect(retried.session).toBe(failed.session);
    expect(JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!).studentState.documents[0].rows[0].text).toBe('ikke gemt');
  });

  it('does not save or call the clock for a no-op state reference', () => {
    const storage = new ControllerStorage();
    const initial = startNewLevel2Session(storage, 42, firstClock);
    const writesBefore = storage.writes.length;
    const clock = vi.fn(secondClock);
    const same = applyLevel2StudentState(storage, initial, initial.session.studentState, clock);
    expect(same).toBe(initial);
    expect(storage.writes).toHaveLength(writesBefore);
    expect(clock).toHaveBeenCalledTimes(0);
  });

  it('resets to blank state with the exact same snapshot and no generator call', () => {
    const storage = new ControllerStorage();
    const factory = vi.fn(generateLevel2Case);
    const initial = startNewLevel2Session(storage, 42, firstClock, factory);
    const withProgress = applyLevel2StudentState(
      storage,
      initial,
      addStudentPostingRow(initial.session.studentState, '6920', 'debit', '123', 'progress'),
      secondClock,
    );
    factory.mockClear();
    const reset = resetLevel2Session(storage, withProgress, () => '2026-09-18T14:02:00.000Z');
    expect(factory).toHaveBeenCalledTimes(0);
    expect(reset.session.caseSnapshot).toBe(withProgress.session.caseSnapshot);
    expect(reset.session.variant).toBe(42);
    expect(reset.session.studentState.documents[0].rows).toEqual([]);
    expect(reset.session.studentState.phase).toEqual({ kind: 'document', activeDocumentId: 'B1' });
  });

  it('creates a new snapshot only for a new task', () => {
    const storage = new ControllerStorage();
    const first = startNewLevel2Session(storage, 42, firstClock);
    const second = startNewLevel2Session(storage, 43, secondClock);
    expect(second.session.variant).toBe(43);
    expect(second.session.caseSnapshot).not.toBe(first.session.caseSnapshot);
    expect(second.session.caseSnapshot).not.toEqual(first.session.caseSnapshot);
  });
});
