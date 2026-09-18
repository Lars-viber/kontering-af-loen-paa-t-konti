import { describe, expect, it } from 'vitest';
import {
  addStudentPostingRow,
  checkActiveDocument,
  createInitialStudentState,
} from '../../src/level2/state';
import { decodeLevel2Session } from '../../src/level2/session';
import { advanceToFinalControl } from './state-helpers';
import { createTestSession, jsonClone, SESSION_CASE_42 } from './session-test-helpers';

function expectInvalidCase(mutate: (session: any) => void): void {
  const session = jsonClone(createTestSession()) as any;
  mutate(session);
  expect(decodeLevel2Session(JSON.stringify(session))).toEqual({ ok: false, reason: 'invalidCaseSnapshot' });
}

function expectInvalidState(session: any): void {
  expect(decodeLevel2Session(JSON.stringify(session))).toEqual({ ok: false, reason: 'invalidStudentState' });
}

describe('Level 2 case snapshot validation', () => {
  it('rejects session/snapshot variant and version mismatches', () => {
    const variant = jsonClone(createTestSession()) as any;
    variant.variant = 43;
    expect(decodeLevel2Session(JSON.stringify(variant))).toEqual({ ok: false, reason: 'sessionSnapshotMismatch' });

    const rulesetYear = jsonClone(createTestSession()) as any;
    rulesetYear.rulesetYear = 2027;
    expect(decodeLevel2Session(JSON.stringify(rulesetYear))).toEqual({ ok: false, reason: 'unsupportedRulesetYear' });

    const rulesetVersion = jsonClone(createTestSession()) as any;
    rulesetVersion.rulesetVersion = 2;
    expect(decodeLevel2Session(JSON.stringify(rulesetVersion))).toEqual({ ok: false, reason: 'unsupportedRulesetVersion' });

    const generatorVersion = jsonClone(createTestSession()) as any;
    generatorVersion.generatorVersion = 2;
    expect(decodeLevel2Session(JSON.stringify(generatorVersion))).toEqual({ ok: false, reason: 'unsupportedGeneratorVersion' });

    expectInvalidCase(session => { session.caseSnapshot.variant = 43; });
    expectInvalidCase(session => { session.caseSnapshot.rulesetVersion = 2; });
  });

  it('rejects removed/reordered documents and corrupt postings', () => {
    expectInvalidCase(session => { session.caseSnapshot.derived.documents.pop(); });
    expectInvalidCase(session => {
      const documents = session.caseSnapshot.derived.documents;
      [documents[0], documents[1]] = [documents[1], documents[0]];
    });
    expectInvalidCase(session => { session.caseSnapshot.derived.documents[0].expectedPostings[0].amount = -1; });
    expectInvalidCase(session => { session.caseSnapshot.derived.documents[0].expectedPostings[0].amount += 0.5; });
    expectInvalidCase(session => { session.caseSnapshot.derived.documents[0].expectedPostings[0].accountNumber = '9999'; });
    expectInvalidCase(session => { session.caseSnapshot.derived.documents[0].expectedPostings[0].amount += 1; });
  });

  it('rejects tampered checkpoint, final balances and generated inputs', () => {
    expectInvalidCase(session => { session.caseSnapshot.derived.checkpointBalances[0].amount += 1; });
    expectInvalidCase(session => { session.caseSnapshot.derived.finalBalances[0].amount += 1; });
    expectInvalidCase(session => { session.caseSnapshot.inputs.holidayLiability.monthlyAdjustments.jun += 1; });
    expectInvalidCase(session => { session.caseSnapshot.inputs.bank.requiredCash += 1; });
    expectInvalidCase(session => { session.caseSnapshot.inputs.hourlyEmployees[0].hours.jan = Number.MAX_SAFE_INTEGER + 1; });
  });
});

describe('Level 2 student state validation', () => {
  it('rejects duplicate row IDs and an unsafe nextRowId', () => {
    let state = createInitialStudentState(SESSION_CASE_42);
    state = addStudentPostingRow(state, '6920', 'debit', '1', 'a');
    state = addStudentPostingRow(state, '6930', 'debit', '2', 'b');
    const duplicate = jsonClone(createTestSession(state)) as any;
    duplicate.studentState.documents[0].rows[1].rowId = duplicate.studentState.documents[0].rows[0].rowId;
    expectInvalidState(duplicate);

    const nextRow = jsonClone(createTestSession(state)) as any;
    nextRow.studentState.nextRowId = 2;
    expectInvalidState(nextRow);
  });

  it.each([
    ['documentId', 'B99'],
    ['accountNumber', '9999'],
    ['side', 'middle'],
  ])('rejects invalid row %s', (field, value) => {
    let state = createInitialStudentState(SESSION_CASE_42);
    state = addStudentPostingRow(state, '6920', 'debit', '1', 'row');
    const session = jsonClone(createTestSession(state)) as any;
    session.studentState.documents[0].rows[0][field] = value;
    expectInvalidState(session);
  });

  it('rejects invalid group status and tampered correct grading', () => {
    const expected = SESSION_CASE_42.derived.documents[0].expectedPostings[0];
    let state = createInitialStudentState(SESSION_CASE_42);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount), 'correct');
    state = checkActiveDocument(SESSION_CASE_42, state);

    const invalidStatus = jsonClone(createTestSession(state)) as any;
    invalidStatus.studentState.documents[0].groups[0].status = 'locked';
    expectInvalidState(invalidStatus);

    const falseCorrect = jsonClone(createTestSession(state)) as any;
    const correctGroup = falseCorrect.studentState.documents[0].groups.find((group: any) => group.status === 'correct');
    const row = falseCorrect.studentState.documents[0].rows.find((candidate: any) =>
      candidate.accountNumber === correctGroup.accountNumber && candidate.side === correctGroup.side);
    row.rawAmount = '1';
    expectInvalidState(falseCorrect);
  });

  it('rejects impossible document, checkpoint, final and completed progression', () => {
    const activeB8 = jsonClone(createTestSession()) as any;
    activeB8.studentState.phase.activeDocumentId = 'B8';
    expectInvalidState(activeB8);

    const twoActive = jsonClone(createTestSession()) as any;
    twoActive.studentState.documents[1].status = 'active';
    expectInvalidState(twoActive);

    const checkpointEarly = jsonClone(createTestSession()) as any;
    checkpointEarly.studentState.phase = { kind: 'checkpoint' };
    expectInvalidState(checkpointEarly);

    const checkpointInputEarly = jsonClone(createTestSession()) as any;
    checkpointInputEarly.studentState.checkpoint.A.values.wageAccount = '1';
    expectInvalidState(checkpointInputEarly);

    const finalEarly = jsonClone(createTestSession()) as any;
    finalEarly.studentState.phase = { kind: 'finalControl' };
    expectInvalidState(finalEarly);

    const completedMismatch = jsonClone(createTestSession()) as any;
    completedMismatch.studentState.completed = true;
    expectInvalidState(completedMismatch);
  });

  it('rejects tampered correct checkpoint data and skipped automatic transitions', () => {
    const checkpointState = advanceToFinalControl(SESSION_CASE_42);
    const wrongCheckpoint = jsonClone(createTestSession(checkpointState)) as any;
    wrongCheckpoint.studentState.checkpoint.A.values.wageAccount = '1';
    expectInvalidState(wrongCheckpoint);

    const allCheckpointCorrectButNotAdvanced = jsonClone(createTestSession(checkpointState)) as any;
    allCheckpointCorrectButNotAdvanced.studentState.phase = { kind: 'checkpoint' };
    allCheckpointCorrectButNotAdvanced.studentState.documents[9].status = 'pending';
    allCheckpointCorrectButNotAdvanced.studentState.documents[10].status = 'pending';
    allCheckpointCorrectButNotAdvanced.studentState.documents[11].status = 'pending';
    allCheckpointCorrectButNotAdvanced.studentState.documents[12].status = 'pending';
    expectInvalidState(allCheckpointCorrectButNotAdvanced);
  });

  it('rejects unknown and falsely correct final reason IDs', () => {
    const state = advanceToFinalControl(SESSION_CASE_42);
    const unknown = jsonClone(createTestSession(state)) as any;
    unknown.studentState.finalControl.items[0].selectedReasonId = 'inventedReason';
    expectInvalidState(unknown);

    const falseCorrect = jsonClone(createTestSession(state)) as any;
    falseCorrect.studentState.finalControl.items[0] = {
      ...falseCorrect.studentState.finalControl.items[0],
      selectedReasonId: 'amJunePaid',
      status: 'correct',
    };
    expectInvalidState(falseCorrect);
  });
});

