import { describe, expect, it } from 'vitest';
import {
  advanceV2ControllerDocumentReview,
  checkV2ControllerCheckpointSection,
  completeV2ControllerLevel,
  editV2ControllerCheckpointAmount,
  loadCurrentV2ControllerSession,
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

function loadedCurrent(storage: V2ControllerStorage) {
  const loaded = loadCurrentV2ControllerSession(storage);
  if (loaded.status !== 'loaded') throw new Error('Expected loaded session');
  return loaded.current;
}

describe('V2.1 controller restore boundaries', () => {
  it('restores documentReview and advances only on an explicit action', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    for (let document = 1; document <= 4; document += 1) {
      current = completeCurrentDocumentThroughV2Controller(storage, current, clock);
      if (document < 4) current = advanceV2ControllerDocumentReview(storage, current, clock);
    }
    expect(current.studentState).toMatchObject({ phase: 'documentReview', currentDocumentId: 'B4' });
    const restored = loadedCurrent(storage);
    expect(restored.studentState).toEqual(current.studentState);
    const advanced = advanceV2ControllerDocumentReview(storage, restored, clock);
    expect(advanced.studentState).toMatchObject({ phase: 'documentEntry', currentDocumentId: 'B5' });
  });

  it('restores B9 review without opening checkpoint until explicit advance', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    for (let document = 1; document <= 9; document += 1) {
      current = completeCurrentDocumentThroughV2Controller(storage, current, clock);
      if (document < 9) current = advanceV2ControllerDocumentReview(storage, current, clock);
    }
    const restored = loadedCurrent(storage);
    expect(restored.studentState).toMatchObject({ phase: 'documentReview', currentDocumentId: 'B9' });
    expect(advanceV2ControllerDocumentReview(storage, restored, clock).studentState.phase).toBe('checkpoint');
  });

  it('restores an exact partial checkpoint including locked and editable sections', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = advanceToCheckpointThroughV2Controller(storage, current, clock);
    const expectedA = current.caseSnapshot.answers.reconciliation.A;
    for (const [field, value] of Object.entries({
      wageAccountYtd: expectedA.wageAccountYtd,
      employeePensionYtd: expectedA.employeePensionYtd,
      employeeAtpYtd: expectedA.employeeAtpYtd,
      calculatedGrossPayYtd: expectedA.calculatedGrossPayYtd,
    })) {
      current = editV2ControllerCheckpointAmount(
        storage,
        current,
        clock,
        'A',
        field as keyof typeof current.studentState.checkpoint.A.values,
        String(value),
      );
    }
    current = checkV2ControllerCheckpointSection(storage, current, clock, 'A');
    current = editV2ControllerCheckpointAmount(storage, current, clock, 'B', 'wageAccountYtd', '1');
    current = checkV2ControllerCheckpointSection(storage, current, clock, 'B');
    current = editV2ControllerCheckpointAmount(storage, current, clock, 'D', 'operatingTotal', '1');
    current = checkV2ControllerCheckpointSection(storage, current, clock, 'D');
    const restored = loadedCurrent(storage);
    expect(restored.studentState).toEqual(current.studentState);
    expect(restored.studentState.checkpoint.A.status).toBe('correct');
    expect(restored.studentState.checkpoint.B.status).toBe('incorrect');
    expect(restored.studentState.checkpoint.C.status).toBe('unchecked');
    expect(restored.studentState.checkpoint.D.status).toBe('incorrect');
    expect(restored.studentState.checkpoint.E.status).toBe('unchecked');
  });

  it('restores checkpointReview and requires explicit complete', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = advanceToCheckpointThroughV2Controller(storage, current, clock);
    current = completeCheckpointThroughV2Controller(storage, current, clock);
    const restored = loadedCurrent(storage);
    expect(restored.studentState.phase).toBe('checkpointReview');
    expect(completeV2ControllerLevel(storage, restored, clock).studentState.phase).toBe('completed');
  });

  it('restores completed without regeneration or mutation', () => {
    const storage = new V2ControllerStorage();
    const clock = sequenceClock();
    let current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
    current = advanceToCheckpointThroughV2Controller(storage, current, clock);
    current = completeCheckpointThroughV2Controller(storage, current, clock);
    current = completeV2ControllerLevel(storage, current, clock);
    const restored = loadedCurrent(storage);
    expect(restored.studentState).toEqual(current.studentState);
    expect(restored.studentState.phase).toBe('completed');
  });
});
