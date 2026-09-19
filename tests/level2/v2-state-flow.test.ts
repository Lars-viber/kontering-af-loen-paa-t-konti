import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  R1_V2_ANSWER_KEY,
  R1_V2_SOURCE,
  generateV2Case,
} from '../../src/domain/level2/v2';
import {
  V2_STUDENT_PHASES,
  addV2StudentPostingRow,
  assertV2StudentState,
  completeV2Level,
  createInitialV2StudentState,
  selectAllV2StudentDerivedBalances,
  selectV2ApprovedRows,
  selectV2StudentDerivedBalance,
  type V2StudentState,
} from '../../src/level2/v2/state';
import {
  advanceV2ToCheckpoint,
  completeV2Checkpoint,
} from './v2-state-helpers';

function completeFlow(
  source: typeof R1_V2_SOURCE,
  answers: typeof R1_V2_ANSWER_KEY,
): V2StudentState {
  const checkpoint = advanceV2ToCheckpoint(answers);
  expect(selectAllV2StudentDerivedBalances(source.startBalances, checkpoint))
    .toEqual(answers.finalBalances);
  const review = completeV2Checkpoint(answers, checkpoint);
  return completeV2Level(review);
}

describe('V2.1 approved history og student-derived balances', () => {
  it('afleder alle 13 R1-slutsaldi fra opening balances og approved student rows', () => {
    const checkpoint = advanceV2ToCheckpoint(R1_V2_ANSWER_KEY);
    const approved = selectV2ApprovedRows(checkpoint);
    expect(approved).toHaveLength(
      R1_V2_ANSWER_KEY.documents.reduce(
        (sum, document) => sum + document.expectedPostings.length,
        0,
      ),
    );
    expect(selectAllV2StudentDerivedBalances(R1_V2_SOURCE.startBalances, checkpoint))
      .toEqual(R1_V2_ANSWER_KEY.finalBalances);
  });

  it('afleder alle 13 variant-42-slutsaldi uden at selector modtager answers', () => {
    const generated = generateV2Case(42);
    const checkpoint = advanceV2ToCheckpoint(generated.answers);
    expect(selectAllV2StudentDerivedBalances(generated.source.startBalances, checkpoint))
      .toEqual(generated.answers.finalBalances);
  });

  it('medregner current valid rows i entry og ignorerer ugyldige amounts', () => {
    const initial = createInitialV2StudentState();
    const opening = R1_V2_SOURCE.startBalances;
    const before = selectV2StudentDerivedBalance(opening, initial, '5820');
    let state = addV2StudentPostingRow(initial, '5820', 'credit', '1000');
    expect(selectV2StudentDerivedBalance(opening, state, '5820').amount).toBe(before.amount - 1000);
    state = addV2StudentPostingRow(state, '5820', 'credit', 'tekst');
    expect(selectV2StudentDerivedBalance(opening, state, '5820').amount).toBe(before.amount - 1000);
  });

  it('gennemfører både håndfrosset R1 og generated variant 42 til completed', () => {
    const r1 = completeFlow(R1_V2_SOURCE, R1_V2_ANSWER_KEY);
    expect(r1.phase).toBe('completed');
    expect(r1.documents).toHaveLength(9);
    expect(r1.documents.every(document => document.status === 'completed')).toBe(true);

    const generated = generateV2Case(42);
    const variant = completeFlow(generated.source, generated.answers);
    expect(variant.phase).toBe('completed');
    expect(Object.values(variant.checkpoint).every(section => section.status === 'correct')).toBe(true);
  });
});

describe('V2.1 state invariants og isolation', () => {
  it('fryser præcis de fem aktive phases', () => {
    expect(V2_STUDENT_PHASES).toEqual([
      'documentEntry',
      'documentReview',
      'checkpoint',
      'checkpointReview',
      'completed',
    ]);
  });

  it('afviser invalid review, checkpoint og completed states ved runtime', () => {
    const initial = createInitialV2StudentState();

    const invalidReview = structuredClone(initial) as unknown as V2StudentState;
    Object.assign(invalidReview as object, { phase: 'documentReview' });
    Object.assign(invalidReview.documents[0] as object, {
      status: 'completed',
      groups: [{ accountNumber: '2210', side: 'debit', status: 'incorrect' }],
    });
    expect(() => assertV2StudentState(invalidReview)).toThrow(
      'V2.1 document review requires a fully correct document',
    );

    const earlyCheckpoint = structuredClone(initial) as unknown as V2StudentState;
    Object.assign(earlyCheckpoint as object, { phase: 'checkpoint', currentDocumentId: null });
    expect(() => assertV2StudentState(earlyCheckpoint)).toThrow(
      'V2.1 checkpoint requires nine completed documents',
    );

    const checkpoint = advanceV2ToCheckpoint(R1_V2_ANSWER_KEY);
    const invalidCheckpointReview = structuredClone(checkpoint) as unknown as V2StudentState;
    Object.assign(invalidCheckpointReview as object, { phase: 'checkpointReview' });
    expect(() => assertV2StudentState(invalidCheckpointReview)).toThrow(
      'V2.1 reviewed checkpoint requires all sections correct',
    );

    const invalidCompleted = structuredClone(checkpoint) as unknown as V2StudentState;
    Object.assign(invalidCompleted as object, { phase: 'completed' });
    expect(() => assertV2StudentState(invalidCompleted)).toThrow(
      'V2.1 reviewed checkpoint requires all sections correct',
    );

    const unknownDocument = structuredClone(initial) as unknown as V2StudentState;
    Object.assign(unknownDocument as object, { currentDocumentId: 'B10' });
    expect(() => assertV2StudentState(unknownDocument)).toThrow(
      'Unknown current V2.1 document',
    );
  });

  it('holder transitions pure og row arrays uden mutable deling', () => {
    const previous = createInitialV2StudentState();
    const next = addV2StudentPostingRow(previous, '2210', 'debit', '100', 'test');
    expect(next).not.toBe(previous);
    expect(next.documents).not.toBe(previous.documents);
    expect(next.documents[0].rows).not.toBe(previous.documents[0].rows);
    expect(previous.documents[0].rows).toEqual([]);
    expect(next.documents[0].rows).toHaveLength(1);
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.documents[0].rows)).toBe(true);
  });

  it('holder V2.1-statekoden fri for generator, storage, controller og udfasede begreber', () => {
    const folder = 'src/level2/v2/state';
    const source = readdirSync(folder)
      .filter(file => file.endsWith('.ts'))
      .map(file => readFileSync(folder + '/' + file, 'utf8'))
      .join(String.fromCharCode(10));
    for (const forbidden of [
      'generateV2Case',
      'generateLevel2Case',
      'localStorage',
      'sessionStorage',
      'controller',
      'autosave',
      'finalControl',
      'finalReason',
      'reasonId',
      'reasons',
      'B10',
      'B11',
      'B12',
      'B13',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('holder presentation-selectors fri for answer-key data', () => {
    const source = readFileSync('src/level2/v2/state/selectors.ts', 'utf8');
    for (const forbidden of [
      'expectedPostings',
      'expected group',
      'expectedCheckpoint',
      'expected reconciliation',
      'V2AnswerKey',
      'finalBalances',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
