import { describe, expect, it } from 'vitest';
import { canonicalStringify, generateLevel2Case } from '../../src/domain/level2';
import {
  addStudentPostingRow,
  createInitialStudentState,
  type Level2StudentState,
} from '../../src/level2/state';

describe('Niveau 2 state immutability', () => {
  it('muterer hverken previous state eller den injicerede case', () => {
    const source = generateLevel2Case(42);
    const sourceBefore = canonicalStringify(source);
    const previous = createInitialStudentState(source);
    const previousBefore = canonicalStringify(previous);

    const next = addStudentPostingRow(previous, '2210', 'debit', '100', 'test');

    expect(next).not.toBe(previous);
    expect(previous.documents[0].rows).toEqual([]);
    expect(canonicalStringify(previous)).toBe(previousBefore);
    expect(canonicalStringify(source)).toBe(sourceBefore);
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.documents[0].rows)).toBe(true);
  });

  it('afviser en ukendt konto ved runtime', () => {
    const source = generateLevel2Case(1);
    const state = createInitialStudentState(source);
    expect(() => addStudentPostingRow(
      state,
      '9999' as never,
      'debit',
      '100',
    )).toThrow(RangeError);
  });

  it('holder student state fri for case snapshot og variantmetadata', () => {
    const source = generateLevel2Case(42);
    const state: Level2StudentState = createInitialStudentState(source);
    expect(state).not.toHaveProperty('variant');
    expect(state).not.toHaveProperty('caseSnapshot');
    expect(state).not.toHaveProperty('savedAt');
  });
});
