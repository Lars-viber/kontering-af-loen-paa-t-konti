import { describe, expect, it } from 'vitest';
import { generateLevel2Case } from '../../src/domain/level2';
import { createInitialStudentState, type Level2StudentState } from '../../src/level2/state';
import { presentLevel2Progress } from '../../src/level2/workspace';
import { advanceToCheckpoint, advanceToFinalControl, completeActiveDocument, completeCheckpoint, completeFinalControl } from './state-helpers';

const snapshot = generateLevel2Case(42);

function atDocument(number: number): Level2StudentState {
  let state = createInitialStudentState(snapshot);
  while (state.phase.kind !== 'document' || Number(state.phase.activeDocumentId.slice(1)) !== number) {
    if (state.phase.kind === 'checkpoint') state = completeCheckpoint(snapshot, state);
    else state = completeActiveDocument(snapshot, state);
  }
  return state;
}

function labels(state: Level2StudentState): string[] {
  return presentLevel2Progress(state).steps.map(item => `${item.label}:${item.status}`);
}

describe('V2.0.1 Niveau 2 progressionspresentation', () => {
  it.each([
    [1, ['B1:active', 'B2–B9:upcoming', 'Checkpoint:upcoming', 'B10–B13:upcoming', 'Slutkontrol:upcoming']],
    [3, ['B1:completed', 'B2:completed', 'B3:active', 'B4–B9:upcoming', 'Checkpoint:upcoming', 'B10–B13:upcoming', 'Slutkontrol:upcoming']],
    [9, ['B1–B8:completed', 'B9:active', 'Checkpoint:upcoming', 'B10–B13:upcoming', 'Slutkontrol:upcoming']],
    [10, ['B1–B9:completed', 'Checkpoint:completed', 'B10:active', 'B11–B13:upcoming', 'Slutkontrol:upcoming']],
    [11, ['B1–B9:completed', 'Checkpoint:completed', 'B10:completed', 'B11:active', 'B12–B13:upcoming', 'Slutkontrol:upcoming']],
    [13, ['B1–B9:completed', 'Checkpoint:completed', 'B10–B12:completed', 'B13:active', 'Slutkontrol:upcoming']],
  ] as const)('viser korrekt progression ved B%s', (documentNumber, expected) => {
    const state = atDocument(documentNumber);
    expect(labels(state)).toEqual(expected);
    const progress = presentLevel2Progress(state);
    expect(progress.completedDocuments).toBe(documentNumber - 1);
    expect(progress.remainingDocuments).toBe(14 - documentNumber);
  });

  it('viser checkpoint mellem de to bilagsforløb', () => {
    const state = advanceToCheckpoint(snapshot);
    expect(labels(state)).toEqual(['B1–B9:completed', 'Checkpoint:active', 'B10–B13:upcoming', 'Slutkontrol:upcoming']);
    expect(presentLevel2Progress(state).summary).toBe('9 af 13 bilag gennemført · 4 tilbage');
  });

  it('viser finalControl uden resterende bilag', () => {
    const state = advanceToFinalControl(snapshot);
    expect(labels(state)).toEqual(['B1–B13:completed', 'Checkpoint:completed', 'Slutkontrol:active']);
    expect(presentLevel2Progress(state).summary).toBe('13 af 13 bilag gennemført');
  });

  it('viser completed uden et aktivt trin', () => {
    const state = completeFinalControl(advanceToFinalControl(snapshot));
    expect(labels(state)).toEqual(['B1–B13:completed', 'Checkpoint:completed', 'Slutkontrol:completed']);
    expect(presentLevel2Progress(state).steps.some(item => item.status === 'active')).toBe(false);
  });
});
