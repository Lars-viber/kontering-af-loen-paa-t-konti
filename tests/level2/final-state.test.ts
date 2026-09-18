import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCE_R1_FIXTURE, generateLevel2Case } from '../../src/domain/level2';
import {
  FINAL_CONTROL_EXPECTED_REASONS,
  FINAL_CONTROL_ITEM_IDS,
  addStudentPostingRow,
  checkActiveDocument,
  checkCheckpointSection,
  checkFinalControlItem,
  createInitialStudentState,
  editCheckpointAmount,
  editStudentPostingRow,
  removeStudentPostingRow,
  resetStudentState,
  selectFinalControlBalances,
  selectFinalControlReason,
} from '../../src/level2/state';
import { advanceToFinalControl, completeFinalControl } from './state-helpers';

describe('Niveau 2 slutkontrol og completion', () => {
  it('går fra B13 til finalControl og viser read-only slutsaldi fra casen', () => {
    const source = generateLevel2Case(42);
    const state = advanceToFinalControl(source);
    expect(state.phase).toEqual({ kind: 'finalControl' });
    expect(state.documents.every(document => document.status === 'completed')).toBe(true);

    const balances = selectFinalControlBalances(source);
    expect(balances.aTax.amount).toBe(0);
    expect(balances.amContribution.amount).toBe(0);
    expect(balances.pension.amount).toBe(0);
    expect(balances.holidayPay.amount).toBe(0);
    expect(balances.atp.amount).toBeGreaterThan(0);
    expect(balances.holidayLiability.amount).toBeGreaterThan(0);
  });

  it('afviser forkert reason, nulstiller ved edit og låser korrekt item', () => {
    let state = advanceToFinalControl(REFERENCE_R1_FIXTURE);
    state = selectFinalControlReason(state, 'aTax', 'amJunePaid');
    state = checkFinalControlItem(state, 'aTax');
    expect(state.finalControl.items[0].status).toBe('incorrect');

    state = selectFinalControlReason(state, 'aTax', FINAL_CONTROL_EXPECTED_REASONS.aTax);
    expect(state.finalControl.items[0].status).toBe('unchecked');
    state = checkFinalControlItem(state, 'aTax');
    expect(state.finalControl.items[0].status).toBe('correct');

    const locked = selectFinalControlReason(state, 'aTax', 'amJunePaid');
    expect(locked).toBe(state);
  });

  it('fører alle seks korrekte items til immutable completed state', () => {
    const source = REFERENCE_R1_FIXTURE;
    const state = completeFinalControl(advanceToFinalControl(source));
    expect(state.phase).toEqual({ kind: 'completed' });
    expect(state.completed).toBe(true);
    expect(state.finalControl.items.every(item => item.status === 'correct')).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);

    const rowId = state.documents[0].rows[0].rowId;
    expect(addStudentPostingRow(state, '2210', 'debit', '1')).toBe(state);
    expect(editStudentPostingRow(state, rowId, { rawAmount: '1' })).toBe(state);
    expect(removeStudentPostingRow(state, rowId)).toBe(state);
    expect(checkActiveDocument(source, state)).toBe(state);
    expect(editCheckpointAmount(state, 'A', 'wageAccount', '1')).toBe(state);
    expect(checkCheckpointSection(source, state, 'A')).toBe(state);
    expect(selectFinalControlReason(state, 'atp', 'aTaxJunePaid')).toBe(state);
    expect(checkFinalControlItem(state, 'atp')).toBe(state);
  });

  it('resetter rent til samme blanke startkontrakt', () => {
    const source = generateLevel2Case(42);
    const progressed = advanceToFinalControl(source);
    expect(resetStudentState(source)).toEqual(createInitialStudentState(source));
    expect(progressed.phase.kind).toBe('finalControl');
  });
});

describe('Niveau 2 state source audit', () => {
  it('har ingen generatorcall, randomness, tid, persistence eller React', () => {
    const folder = 'src/level2/state';
    const source = readdirSync(folder)
      .filter(file => file.endsWith('.ts'))
      .map(file => readFileSync(folder + '/' + file, 'utf8'))
      .join(String.fromCharCode(10));
    for (const forbidden of ['generateLevel2Case', 'Math.random', 'Date.now', 'localStorage', 'getRandomValues', 'session', 'react']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('har seks stabile reason IDs', () => {
    expect(FINAL_CONTROL_ITEM_IDS).toHaveLength(6);
    expect(new Set(Object.values(FINAL_CONTROL_EXPECTED_REASONS)).size).toBe(6);
  });
});
