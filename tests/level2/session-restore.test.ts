import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FINAL_CONTROL_EXPECTED_REASONS,
  addStudentPostingRow,
  checkActiveDocument,
  checkCheckpointSection,
  checkFinalControlItem,
  editCheckpointAmount,
  getLevel2CaseData,
  selectFinalControlReason,
  type Level2StudentState,
} from '../../src/level2/state';
import { decodeLevel2Session, encodeLevel2Session } from '../../src/level2/session';
import {
  advanceToCheckpoint,
  advanceToFinalControl,
  completeActiveDocument,
  completeCheckpoint,
  completeFinalControl,
} from './state-helpers';
import { createTestSession, SESSION_CASE_42 } from './session-test-helpers';

function roundtrip(state: Level2StudentState): Level2StudentState {
  const session = createTestSession(state);
  const before = JSON.stringify(session);
  const decoded = decodeLevel2Session(encodeLevel2Session(session));
  expect(JSON.stringify(session)).toBe(before);
  if (!decoded.ok) throw new Error('Expected valid session: ' + decoded.reason);
  expect(decoded.value.caseSnapshot).toEqual(SESSION_CASE_42);
  expect(decoded.value.studentState).toEqual(state);
  return decoded.value.studentState;
}

describe('Level 2 partial progress restore', () => {
  it('roundtrips B1 active', () => {
    const state = createTestSession().studentState;
    expect(roundtrip(state).phase).toEqual({ kind: 'document', activeDocumentId: 'B1' });
  });

  it('roundtrips B4 with both correct and incorrect groups', () => {
    let state = createTestSession().studentState;
    for (let index = 0; index < 3; index += 1) state = completeActiveDocument(SESSION_CASE_42, state);
    const expected = getLevel2CaseData(SESSION_CASE_42).documents.find(document => document.id === 'B4');
    if (!expected) throw new Error('Missing B4');
    state = addStudentPostingRow(state, expected.expectedPostings[0].accountNumber, expected.expectedPostings[0].side,
      String(expected.expectedPostings[0].amount), 'korrekt gruppe');
    state = addStudentPostingRow(state, expected.expectedPostings[1].accountNumber, expected.expectedPostings[1].side,
      '1', 'forkert gruppe');
    state = checkActiveDocument(SESSION_CASE_42, state);
    const statuses = state.documents[3].groups.map(group => group.status);
    expect(statuses).toContain('correct');
    expect(statuses).toContain('incorrect');
    expect(roundtrip(state).phase).toEqual({ kind: 'document', activeDocumentId: 'B4' });
  });

  it('roundtrips a partially completed checkpoint', () => {
    const expected = getLevel2CaseData(SESSION_CASE_42).checkpoint;
    let state = advanceToCheckpoint(SESSION_CASE_42);
    for (const [field, amount] of Object.entries(expected.hourlyGrossPayroll)) {
      state = editCheckpointAmount(state, 'A', field as never, String(amount));
    }
    state = checkCheckpointSection(SESSION_CASE_42, state, 'A');
    state = editCheckpointAmount(state, 'B', 'wageAccount', '1');
    state = checkCheckpointSection(SESSION_CASE_42, state, 'B');
    expect(state.checkpoint.A.status).toBe('correct');
    expect(state.checkpoint.B.status).toBe('incorrect');
    expect(roundtrip(state).phase).toEqual({ kind: 'checkpoint' });
  });

  it('roundtrips B11 active', () => {
    let state = completeCheckpoint(SESSION_CASE_42, advanceToCheckpoint(SESSION_CASE_42));
    state = completeActiveDocument(SESSION_CASE_42, state);
    expect(roundtrip(state).phase).toEqual({ kind: 'document', activeDocumentId: 'B11' });
  });

  it('roundtrips partially solved final control', () => {
    let state = advanceToFinalControl(SESSION_CASE_42);
    state = selectFinalControlReason(state, 'aTax', FINAL_CONTROL_EXPECTED_REASONS.aTax);
    state = checkFinalControlItem(state, 'aTax');
    state = selectFinalControlReason(state, 'amContribution', 'aTaxJunePaid');
    state = checkFinalControlItem(state, 'amContribution');
    expect(state.finalControl.items.map(item => item.status)).toContain('correct');
    expect(state.finalControl.items.map(item => item.status)).toContain('incorrect');
    expect(roundtrip(state).phase).toEqual({ kind: 'finalControl' });
  });

  it('roundtrips completed state exactly', () => {
    const completed = completeFinalControl(advanceToFinalControl(SESSION_CASE_42));
    const restored = roundtrip(completed);
    expect(restored.phase).toEqual({ kind: 'completed' });
    expect(restored.completed).toBe(true);
    expect(restored.finalControl.items.every(item => item.status === 'correct')).toBe(true);
  });
});

describe('Level 2 restore architecture', () => {
  it('has no generator, randomness, clock, browser storage, UI or React dependency in the session module', () => {
    const directory = fileURLToPath(new URL('../../src/level2/session/', import.meta.url));
    const source = readdirSync(directory)
      .filter(file => file.endsWith('.ts'))
      .map(file => readFileSync(directory + '/' + file, 'utf8'))
      .join('\n');
    for (const forbidden of [
      'generateLevel2Case', 'Math.random', 'Date.now', 'getRandomValues', 'localStorage', 'React',
    ]) expect(source).not.toContain(forbidden);
  });
});

