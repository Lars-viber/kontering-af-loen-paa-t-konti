import { describe, expect, it } from 'vitest';
import {
  addStudentPostingRow,
  checkActiveDocument,
  createInitialStudentState,
} from '../../src/level2/state';
import {
  decodeLevel2Session,
  encodeLevel2Session,
} from '../../src/level2/session';
import { createTestSession, jsonClone, SESSION_CASE_42 } from './session-test-helpers';

describe('Level 2 session codec', () => {
  it('roundtrips variant 42 exactly and deep-freezes the restored graph', () => {
    const session = createTestSession();
    const raw = encodeLevel2Session(session);
    const decoded = decodeLevel2Session(raw);

    expect(decoded).toEqual({ ok: true, value: session });
    if (!decoded.ok) throw new Error('Expected valid session');
    expect(decoded.value.variant).toBe(42);
    expect(Object.isFrozen(decoded.value)).toBe(true);
    expect(Object.isFrozen(decoded.value.caseSnapshot)).toBe(true);
    expect(Object.isFrozen(decoded.value.caseSnapshot.derived.documents)).toBe(true);
    expect(Object.isFrozen(decoded.value.studentState.documents[0].rows)).toBe(true);
    expect(() => {
      (decoded.value.caseSnapshot as { variant: number }).variant = 43;
    }).toThrow(TypeError);
    expect(decoded.value.caseSnapshot.variant).toBe(42);
  });

  it.each([
    ['', 'emptyInput'],
    ['   ', 'emptyInput'],
    ['{', 'malformedJson'],
    ['null', 'invalidTopLevelShape'],
    ['42', 'invalidTopLevelShape'],
    ['[]', 'invalidTopLevelShape'],
    ['{}', 'invalidTopLevelShape'],
  ] as const)('returns a typed result for corrupt input %#', (raw, reason) => {
    expect(decodeLevel2Session(raw)).toEqual({ ok: false, reason });
  });

  it('rejects extra top-level fields, future schema and invalid UTC timestamps', () => {
    const base = jsonClone(createTestSession()) as unknown as Record<string, unknown>;
    expect(decodeLevel2Session(JSON.stringify({ ...base, extra: true }))).toEqual({
      ok: false, reason: 'invalidTopLevelShape',
    });
    expect(decodeLevel2Session(JSON.stringify({ ...base, schemaVersion: 2 }))).toEqual({
      ok: false, reason: 'unsupportedSchemaVersion',
    });
    expect(decodeLevel2Session(JSON.stringify({ ...base, schemaVersion: 0 }))).toEqual({
      ok: false, reason: 'unsupportedSchemaVersion',
    });
    for (const savedAt of ['2026-09-18T12:34:56+02:00', '2026-02-30T12:00:00Z', 'not-a-date']) {
      expect(decodeLevel2Session(JSON.stringify({ ...base, savedAt }))).toEqual({
        ok: false, reason: 'invalidSavedAt',
      });
    }
  });

  it('preserves raw amount strings, Unicode spacing and text byte-for-byte', () => {
    let state = createInitialStudentState(SESSION_CASE_42);
    state = addStudentPostingRow(state, '6920', 'debit', '145.812', '  A-skat\u202ftekst\u00a0 ');
    state = addStudentPostingRow(state, '6930', 'debit', '145\u00a0812', 'tekst med space');
    const decoded = decodeLevel2Session(encodeLevel2Session(createTestSession(state)));
    if (!decoded.ok) throw new Error('Expected valid session');
    expect(decoded.value.studentState.documents[0].rows.map(row => row.rawAmount)).toEqual([
      '145.812', '145\u00a0812',
    ]);
    expect(decoded.value.studentState.documents[0].rows.map(row => row.text)).toEqual([
      '  A-skat\u202ftekst\u00a0 ', 'tekst med space',
    ]);
  });

  it('preserves split rows, IDs and correct group lock semantics', () => {
    const expected = SESSION_CASE_42.derived.documents[0].expectedPostings[0];
    const first = 10000;
    const second = expected.amount - first;
    expect(second).toBeGreaterThan(0);
    let state = createInitialStudentState(SESSION_CASE_42);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, '10.000', 'første del');
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(second), 'anden del');
    state = checkActiveDocument(SESSION_CASE_42, state);
    const group = state.documents[0].groups.find(candidate =>
      candidate.accountNumber === expected.accountNumber && candidate.side === expected.side);
    expect(group?.status).toBe('correct');

    const mutableSession = jsonClone(createTestSession(state));
    expect(Object.isFrozen(mutableSession)).toBe(false);
    expect(Object.isFrozen(mutableSession.studentState.documents[0].rows)).toBe(false);
    const beforeEncode = JSON.stringify(mutableSession);
    const decoded = decodeLevel2Session(encodeLevel2Session(mutableSession));
    expect(JSON.stringify(mutableSession)).toBe(beforeEncode);
    expect(Object.isFrozen(mutableSession)).toBe(false);
    expect(Object.isFrozen(mutableSession.studentState.documents[0].rows)).toBe(false);
    if (!decoded.ok) throw new Error('Expected valid session');
    expect(decoded.value.studentState.documents[0].rows.slice(0, 2)).toEqual(state.documents[0].rows.slice(0, 2));
    expect(decoded.value.studentState.documents[0].rows.slice(0, 2).map(row => row.rowId)).toEqual([1, 2]);
    expect(decoded.value.studentState.documents[0].groups).toEqual(state.documents[0].groups);
  });
});

