import { describe, expect, it } from 'vitest';
import {
  V2_GENERATOR_VERSION,
  V2_RULESET_VERSION,
  V2_RULESET_YEAR,
} from '../../src/domain/level2/v2';
import { createInitialV2StudentState } from '../../src/level2/v2/state';
import {
  V2_SESSION_SCHEMA_VERSION,
  V2_SESSION_STORAGE_KEY,
  decodeV2Session,
  encodeV2Session,
} from '../../src/level2/v2/session';
import {
  V2_SESSION_CASE_42,
  V2_SESSION_CASE_999999,
  createV2TestSession,
  jsonCloneV2,
} from './v2-session-test-helpers';

function expectInvalidCase(mutate: (session: any) => void): void {
  const session = jsonCloneV2(createV2TestSession()) as any;
  mutate(session);
  expect(decodeV2Session(JSON.stringify(session))).toEqual({
    ok: false,
    reason: 'invalidCaseSnapshot',
  });
}

function expectInvalidState(mutate: (session: any) => void): void {
  const session = jsonCloneV2(createV2TestSession()) as any;
  mutate(session);
  expect(decodeV2Session(JSON.stringify(session))).toEqual({
    ok: false,
    reason: 'invalidStudentState',
  });
}

describe('V2.1 session identity og codec', () => {
  it('fryser schema, storage key og alle versionsidentiteter', () => {
    expect(V2_SESSION_SCHEMA_VERSION).toBe(2);
    expect(V2_SESSION_STORAGE_KEY)
      .toBe('kontering-af-loen-paa-t-konti.level2.session.v2');
    const session = createV2TestSession();
    expect({
      schemaVersion: session.schemaVersion,
      rulesetYear: session.rulesetYear,
      rulesetVersion: session.rulesetVersion,
      generatorVersion: session.generatorVersion,
    }).toEqual({
      schemaVersion: 2,
      rulesetYear: V2_RULESET_YEAR,
      rulesetVersion: V2_RULESET_VERSION,
      generatorVersion: V2_GENERATOR_VERSION,
    });
  });

  it.each([
    [42, V2_SESSION_CASE_42],
    [999999, V2_SESSION_CASE_999999],
  ] as const)('roundtripper variant %i med separat source og answers', (variant, caseSnapshot) => {
    const session = createV2TestSession(createInitialV2StudentState(), caseSnapshot);
    const before = JSON.stringify(session);
    const decoded = decodeV2Session(encodeV2Session(session));
    expect(JSON.stringify(session)).toBe(before);
    expect(decoded).toEqual({ ok: true, value: session });
    if (!decoded.ok) throw new Error('Expected valid session');
    expect(decoded.value.variant).toBe(variant);
    expect(decoded.value.caseSnapshot.source).toEqual(caseSnapshot.source);
    expect(decoded.value.caseSnapshot.answers).toEqual(caseSnapshot.answers);
    expect(decoded.value.caseSnapshot).toHaveProperty('source');
    expect(decoded.value.caseSnapshot).toHaveProperty('answers');
  });

  it('deep-freezer hele restored graph og deler ikke mutable objekter mellem loads', () => {
    const raw = encodeV2Session(createV2TestSession());
    const first = decodeV2Session(raw);
    const second = decodeV2Session(raw);
    if (!first.ok || !second.ok) throw new Error('Expected valid sessions');
    expect(Object.isFrozen(first.value)).toBe(true);
    expect(Object.isFrozen(first.value.caseSnapshot.source)).toBe(true);
    expect(Object.isFrozen(first.value.caseSnapshot.answers.documents)).toBe(true);
    expect(Object.isFrozen(first.value.studentState.documents)).toBe(true);
    expect(first.value).not.toBe(second.value);
    expect(first.value.caseSnapshot).not.toBe(second.value.caseSnapshot);
    expect(first.value.studentState).not.toBe(second.value.studentState);
    expect(() => {
      (first.value.studentState as { phase: string }).phase = 'completed';
    }).toThrow(TypeError);
    expect(() => {
      (first.value.caseSnapshot.source.documentSources as unknown as unknown[]).pop();
    }).toThrow(TypeError);
  });

  it.each([
    ['', 'emptyInput'],
    ['   ', 'emptyInput'],
    ['{', 'malformedJson'],
    ['null', 'invalidTopLevelShape'],
    ['42', 'invalidTopLevelShape'],
    ['[]', 'invalidTopLevelShape'],
    ['{}', 'invalidTopLevelShape'],
  ] as const)('returnerer typed invalid result for input %#', (raw, reason) => {
    expect(decodeV2Session(raw)).toEqual({ ok: false, reason });
  });

  it('afviser missing/extra fields, forkert schema og ugyldigt savedAt', () => {
    const base = jsonCloneV2(createV2TestSession()) as any;
    const missing = jsonCloneV2(base);
    delete missing.studentState;
    expect(decodeV2Session(JSON.stringify(missing))).toEqual({
      ok: false,
      reason: 'invalidTopLevelShape',
    });
    expect(decodeV2Session(JSON.stringify({ ...base, extra: true }))).toEqual({
      ok: false,
      reason: 'invalidTopLevelShape',
    });
    for (const schemaVersion of [1, 3]) {
      expect(decodeV2Session(JSON.stringify({ ...base, schemaVersion }))).toEqual({
        ok: false,
        reason: 'unsupportedSchemaVersion',
      });
    }
    for (const savedAt of [
      '2026-09-19T12:34:56+02:00',
      '2026-02-30T12:00:00Z',
      'not-a-date',
      123,
    ]) {
      expect(decodeV2Session(JSON.stringify({ ...base, savedAt }))).toEqual({
        ok: false,
        reason: 'invalidSavedAt',
      });
    }
  });

  it('afviser top-level versioner, variant og session/snapshot mismatch', () => {
    const base = jsonCloneV2(createV2TestSession()) as any;
    expect(decodeV2Session(JSON.stringify({ ...base, rulesetYear: 2027 }))).toEqual({
      ok: false,
      reason: 'unsupportedRulesetYear',
    });
    expect(decodeV2Session(JSON.stringify({ ...base, rulesetVersion: 1 }))).toEqual({
      ok: false,
      reason: 'unsupportedRulesetVersion',
    });
    expect(decodeV2Session(JSON.stringify({ ...base, generatorVersion: 1 }))).toEqual({
      ok: false,
      reason: 'unsupportedGeneratorVersion',
    });
    for (const variant of [0, 1.5, 1000000]) {
      expect(decodeV2Session(JSON.stringify({ ...base, variant }))).toEqual({
        ok: false,
        reason: 'invalidVariant',
      });
    }
    expect(decodeV2Session(JSON.stringify({ ...base, variant: 43 }))).toEqual({
      ok: false,
      reason: 'sessionSnapshotMismatch',
    });
  });
});

describe('V2.1 case snapshot tampering', () => {
  it('afviser ændrede caseidentiteter, dokumenter og kontoplan', () => {
    expectInvalidCase(session => { session.caseSnapshot.variant = 43; });
    expectInvalidCase(session => { session.caseSnapshot.rulesetVersion = 1; });
    expectInvalidCase(session => { session.caseSnapshot.generatorVersion = 1; });
    expectInvalidCase(session => { session.caseSnapshot.source.documentSources.pop(); });
    expectInvalidCase(session => { session.caseSnapshot.source.accounts.pop(); });
    expectInvalidCase(session => { session.caseSnapshot.answers.documents.pop(); });
  });

  it('afviser ændrede tælleværker, postings, final ledger og generatorinputs', () => {
    expectInvalidCase(session => { session.caseSnapshot.source.tallies[0].amount += 1; });
    expectInvalidCase(session => {
      session.caseSnapshot.answers.documents[0].expectedPostings[0].amount += 1;
    });
    expectInvalidCase(session => { session.caseSnapshot.answers.finalBalances[0].amount += 1; });
    expectInvalidCase(session => {
      session.caseSnapshot.answers.reconciliation.C.pension.hourlyEmployeePensionYtd += 1;
    });
    expectInvalidCase(session => {
      session.caseSnapshot.answers.reconciliation.D.operatingTotal += 1;
    });
    expectInvalidCase(session => {
      session.caseSnapshot.inputs.holidayLiability.monthlyAdjustments.jun += 1;
    });
    expectInvalidCase(session => { session.caseSnapshot.inputs.bank.requiredCash += 1; });
    expectInvalidCase(session => { session.caseSnapshot.inputs.hourlyEmployees[0].hours.jan = 999; });
  });
});

describe('V2.1 restored student state validation', () => {
  it('afviser semantisk umulige phases og ukendt current document', () => {
    expectInvalidState(session => {
      session.studentState.phase = 'documentReview';
      session.studentState.documents[0].status = 'completed';
    });
    expectInvalidState(session => {
      session.studentState.phase = 'checkpoint';
      session.studentState.currentDocumentId = null;
    });
    expectInvalidState(session => {
      session.studentState.phase = 'checkpointReview';
      session.studentState.currentDocumentId = null;
      session.studentState.documents.forEach((document: any) => {
        document.status = 'completed';
      });
    });
    expectInvalidState(session => {
      session.studentState.phase = 'completed';
      session.studentState.currentDocumentId = null;
      session.studentState.documents.forEach((document: any) => {
        document.status = 'completed';
      });
    });
    expectInvalidState(session => { session.studentState.currentDocumentId = 'B10'; });
  });

  it('afviser den gamle eller manipulerede C checkpointshape', () => {
    expectInvalidState(session => {
      delete session.studentState.checkpoint.C.values.pensionBookBalance;
    });
    expectInvalidState(session => {
      session.studentState.checkpoint.C.values.holidayLiabilityAdjustment = '32500';
    });
    expectInvalidState(session => {
      session.studentState.checkpoint.C.values.hourlyEmployeePensionYtd = 38262;
    });
  });
  it('afviser invalid rows og case/state grading mismatch', () => {
    expectInvalidState(session => {
      session.studentState.documents[0].rows.push({
        rowId: 1,
        documentId: 'B1',
        accountNumber: '9999',
        side: 'debit',
        rawAmount: '1',
        text: '',
      });
      session.studentState.nextRowId = 2;
    });
    expectInvalidState(session => {
      session.studentState.documents[0].rows.push({
        rowId: 1,
        documentId: 'B1',
        accountNumber: '6920',
        side: 'debit',
        rawAmount: '1',
        text: '',
      });
      session.studentState.documents[0].groups.push({
        accountNumber: '6920',
        side: 'debit',
        status: 'correct',
      });
      session.studentState.nextRowId = 2;
    });
  });
});
