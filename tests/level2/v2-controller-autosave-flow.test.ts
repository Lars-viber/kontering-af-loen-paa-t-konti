import { describe, expect, it, vi } from 'vitest';
import {
  V2_SESSION_STORAGE_KEY,
} from '../../src/level2/v2/session';
import {
  addV2ControllerPostingRow,
  advanceV2ControllerDocumentReview,
  completeV2ControllerLevel,
  editV2ControllerPostingRow,
  removeV2ControllerPostingRow,
  retryV2ControllerSave,
  startNewV2ControllerSession,
} from '../../src/level2/v2/controller';
import {
  V2ControllerStorage,
  advanceToCheckpointThroughV2Controller,
  completeCheckpointThroughV2Controller,
  completeCurrentDocumentThroughV2Controller,
  sequenceClock,
  startedCurrent,
} from './v2-controller-test-helpers';

describe('V2.1 controller actions and autosave', () => {
  it('autosaves real edits, preserves snapshot identity and skips no-ops without clock calls', () => {
    const storage = new V2ControllerStorage();
    const current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock()));
    const snapshot = current.caseSnapshot;
    const writesBefore = storage.writes.length;
    const clock = vi.fn(sequenceClock(10));
    const edited = addV2ControllerPostingRow(storage, current, clock, '6920', 'debit', '123', 'edit');
    expect(edited.caseSnapshot).toBe(snapshot);
    expect(edited.variant).toBe(42);
    expect(storage.writes).toHaveLength(writesBefore + 1);
    expect(clock).toHaveBeenCalledOnce();

    clock.mockClear();
    const noOp = editV2ControllerPostingRow(storage, edited, clock, 999999, { rawAmount: '1' });
    expect(noOp).toBe(edited);
    expect(storage.writes).toHaveLength(writesBefore + 1);
    expect(clock).not.toHaveBeenCalled();
  });

  it('keeps CHECK separate from explicit review advance', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = completeCurrentDocumentThroughV2Controller(storage, current, clock);
    expect(current.studentState).toMatchObject({ phase: 'documentReview', currentDocumentId: 'B1' });
    const persistedReview = JSON.parse(storage.values.get(V2_SESSION_STORAGE_KEY)!);
    expect(persistedReview.studentState.phase).toBe('documentReview');
    current = advanceV2ControllerDocumentReview(storage, current, clock);
    expect(current.studentState).toMatchObject({ phase: 'documentEntry', currentDocumentId: 'B2' });
  });

  it('runs generated variant 42 through B1-B9, checkpointReview and explicit completed', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = advanceToCheckpointThroughV2Controller(storage, current, clock);
    expect(current.studentState.phase).toBe('checkpoint');
    current = completeCheckpointThroughV2Controller(storage, current, clock);
    expect(current.studentState.phase).toBe('checkpointReview');
    expect(JSON.parse(storage.values.get(V2_SESSION_STORAGE_KEY)!).studentState.phase)
      .toBe('checkpointReview');
    current = completeV2ControllerLevel(storage, current, clock);
    expect(current.studentState.phase).toBe('completed');
    expect(JSON.parse(storage.values.get(V2_SESSION_STORAGE_KEY)!).studentState.phase)
      .toBe('completed');
  });

  it('retains latest in-memory state across repeated save failures and retries current S3', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    const s1 = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    const lastSuccessful = s1.lastSuccessfulSavedAt;
    storage.failSet = true;
    const s2 = addV2ControllerPostingRow(storage, s1, clock, '6920', 'debit', '123', 'S2');
    const rowId = s2.studentState.documents[0].rows[0].rowId;
    const s3 = editV2ControllerPostingRow(storage, s2, clock, rowId, { rawAmount: '456', text: 'S3' });
    expect(s2.saveStatus).toBe('saveFailed');
    expect(s3.saveStatus).toBe('saveFailed');
    expect(s3.lastSuccessfulSavedAt).toBe(lastSuccessful);
    storage.failSet = false;
    const retried = retryV2ControllerSave(storage, s3, clock);
    expect(retried.saveStatus).toBe('saved');
    expect(retried.studentState).toBe(s3.studentState);
    const persisted = JSON.parse(storage.values.get(V2_SESSION_STORAGE_KEY)!);
    expect(persisted.studentState.documents[0].rows[0]).toMatchObject({ rawAmount: '456', text: 'S3' });
  });

  it('returns a usable in-memory new session when its first save fails', () => {
    const storage = new V2ControllerStorage();
    storage.failSet = true;
    const current = startedCurrent(startNewV2ControllerSession(storage, 42, sequenceClock()));
    expect(current.variant).toBe(42);
    expect(current.studentState.phase).toBe('documentEntry');
    expect(current.saveStatus).toBe('saveFailed');
    expect(current.lastSuccessfulSavedAt).toBeNull();
    expect(storage.values.has(V2_SESSION_STORAGE_KEY)).toBe(false);
    storage.failSet = false;
    expect(retryV2ControllerSave(storage, current, sequenceClock(10)).saveStatus).toBe('saved');
  });

  it('keeps completed state write-protected and does not autosave completed no-ops', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = advanceToCheckpointThroughV2Controller(storage, current, clock);
    current = completeCheckpointThroughV2Controller(storage, current, clock);
    current = completeV2ControllerLevel(storage, current, clock);
    const writesBefore = storage.writes.length;
    const noOpClock = vi.fn(sequenceClock(500));
    const unchanged = addV2ControllerPostingRow(storage, current, noOpClock, '2210', 'debit', '1');
    expect(unchanged).toBe(current);
    expect(storage.writes).toHaveLength(writesBefore);
    expect(noOpClock).not.toHaveBeenCalled();
  });

  it('routes edit and remove posting actions through autosave', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = addV2ControllerPostingRow(storage, current, clock, '6920', 'debit', '123', 'first');
    const rowId = current.studentState.documents[0].rows[0].rowId;
    const writesAfterAdd = storage.writes.length;
    current = editV2ControllerPostingRow(storage, current, clock, rowId, { rawAmount: '456' });
    expect(current.studentState.documents[0].rows[0].rawAmount).toBe('456');
    expect(storage.writes).toHaveLength(writesAfterAdd + 1);
    current = removeV2ControllerPostingRow(storage, current, clock, rowId);
    expect(current.studentState.documents[0].rows).toEqual([]);
    expect(storage.writes).toHaveLength(writesAfterAdd + 2);
  });});
