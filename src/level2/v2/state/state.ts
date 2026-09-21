import { deepFreezeLevel2 } from '../../../domain/level2/readonly';
import {
  V2_ACCOUNT_NUMBERS,
  V2_DOCUMENT_IDS,
  type V2AccountNumber,
  type V2AnswerKey,
  type V2DocumentId,
  type V2PostingSide,
} from '../../../domain/level2/v2';
import { parseV2CheckpointAmount, parseV2PostingAmount } from './amountParser';
import { assertV2StudentState } from './validation';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  type V2AmountCheckpointSectionId,
  type V2CheckpointAmountField,
  type V2CheckpointBalanceAccount,
  type V2CheckpointBalanceSide,
  type V2CheckpointSectionId,
  type V2CheckpointState,
  type V2DocumentGroupState,
  type V2GradingStatus,
  type V2PostingRowChanges,
  type V2StudentDocumentState,
  type V2StudentPostingRow,
  type V2StudentState,
} from './types';

const GROSS_FIELDS = [
  'wageAccountYtd', 'employeePensionYtd', 'employeeAtpYtd', 'calculatedGrossPayYtd',
] as const;
const OTHER_FIELDS = [
  'pensionBookBalance',
  'hourlyEmployeePensionYtd',
  'hourlyEmployerPensionYtd',
  'salariedEmployeePensionYtd',
  'salariedEmployerPensionYtd',
  'atpBookBalance',
  'hourlyEmployeeAtpYtd',
  'hourlyEmployerAtpYtd',
  'salariedEmployeeAtpYtd',
  'salariedEmployerAtpYtd',
  'holidayPayBookBalance',
  'holidayPayGrossYtd',
] as const;

function freezeState(state: V2StudentState): V2StudentState {
  assertV2StudentState(state);
  return deepFreezeLevel2(state) as V2StudentState;
}

export function createEmptyV2CheckpointState(): V2CheckpointState {
  return {
    A: {
      status: 'unchecked',
      values: { wageAccountYtd: '', employeePensionYtd: '', employeeAtpYtd: '', calculatedGrossPayYtd: '' },
    },
    B: {
      status: 'unchecked',
      values: { wageAccountYtd: '', employeePensionYtd: '', employeeAtpYtd: '', calculatedGrossPayYtd: '' },
    },
    C: {
      status: 'unchecked',
      values: {
        pensionBookBalance: '',
        hourlyEmployeePensionYtd: '',
        hourlyEmployerPensionYtd: '',
        salariedEmployeePensionYtd: '',
        salariedEmployerPensionYtd: '',
        atpBookBalance: '',
        hourlyEmployeeAtpYtd: '',
        hourlyEmployerAtpYtd: '',
        salariedEmployeeAtpYtd: '',
        salariedEmployerAtpYtd: '',
        holidayPayBookBalance: '',
        holidayPayGrossYtd: '',
      },
    },
    D: { status: 'unchecked', values: { operatingTotal: '' } },
    E: {
      status: 'unchecked',
      balances: V2_CHECKPOINT_BALANCE_ACCOUNTS.map(accountNumber => ({
        accountNumber,
        rawAmount: '',
        side: 'blank',
      })),
    },
  };
}

export function createInitialV2StudentState(): V2StudentState {
  return freezeState({
    phase: 'documentEntry',
    currentDocumentId: 'B1',
    documents: V2_DOCUMENT_IDS.map((documentId, index) => ({
      documentId,
      status: index === 0 ? 'active' : 'pending',
      rows: [],
      groups: [],
    })),
    nextRowId: 1,
    checkpoint: createEmptyV2CheckpointState(),
  });
}

function isKnownAccount(accountNumber: string): accountNumber is V2AccountNumber {
  return (V2_ACCOUNT_NUMBERS as readonly string[]).includes(accountNumber);
}

function isKnownSide(side: string): side is V2PostingSide {
  return side === 'debit' || side === 'credit';
}

function currentDocument(state: V2StudentState): V2StudentDocumentState | undefined {
  if (state.currentDocumentId === null) return undefined;
  return state.documents.find(document => document.documentId === state.currentDocumentId);
}

function groupFor(
  document: V2StudentDocumentState,
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
): V2DocumentGroupState | undefined {
  return document.groups.find(group => group.accountNumber === accountNumber && group.side === side);
}

function resetEditedGroup(
  groups: readonly V2DocumentGroupState[],
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
): readonly V2DocumentGroupState[] {
  return groups.map(group =>
    group.accountNumber === accountNumber && group.side === side && group.status === 'incorrect'
      ? { accountNumber, side, status: 'unchecked' as const }
      : group,
  );
}

function replaceDocument(
  state: V2StudentState,
  updated: V2StudentDocumentState,
  nextRowId = state.nextRowId,
): V2StudentState {
  return freezeState({
    ...state,
    nextRowId,
    documents: state.documents.map(document =>
      document.documentId === updated.documentId ? updated : document,
    ),
  });
}

function canEditDocument(state: V2StudentState): V2StudentDocumentState | undefined {
  if (state.phase !== 'documentEntry') return undefined;
  const document = currentDocument(state);
  return document?.status === 'active' ? document : undefined;
}

export function addV2StudentPostingRow(
  state: V2StudentState,
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
  rawAmount = '',
  text = '',
): V2StudentState {
  if (!isKnownAccount(accountNumber)) throw new RangeError('Unknown V2.1 account');
  if (!isKnownSide(side)) throw new RangeError('Unknown V2.1 posting side');
  const document = canEditDocument(state);
  if (!document || groupFor(document, accountNumber, side)?.status === 'correct') return state;
  const row: V2StudentPostingRow = {
    rowId: state.nextRowId,
    documentId: document.documentId,
    accountNumber,
    side,
    rawAmount,
    text,
  };
  return replaceDocument(state, {
    ...document,
    rows: [...document.rows, row],
    groups: resetEditedGroup(document.groups, accountNumber, side),
  }, state.nextRowId + 1);
}

export function editV2StudentPostingRow(
  state: V2StudentState,
  rowId: number,
  changes: V2PostingRowChanges,
): V2StudentState {
  const document = canEditDocument(state);
  if (!document) return state;
  const row = document.rows.find(candidate => candidate.rowId === rowId);
  if (!row || groupFor(document, row.accountNumber, row.side)?.status === 'correct') return state;
  return replaceDocument(state, {
    ...document,
    rows: document.rows.map(candidate => candidate.rowId === rowId ? { ...candidate, ...changes } : candidate),
    groups: resetEditedGroup(document.groups, row.accountNumber, row.side),
  });
}

export function removeV2StudentPostingRow(
  state: V2StudentState,
  rowId: number,
): V2StudentState {
  const document = canEditDocument(state);
  if (!document) return state;
  const row = document.rows.find(candidate => candidate.rowId === rowId);
  if (!row || groupFor(document, row.accountNumber, row.side)?.status === 'correct') return state;
  return replaceDocument(state, {
    ...document,
    rows: document.rows.filter(candidate => candidate.rowId !== rowId),
    groups: resetEditedGroup(document.groups, row.accountNumber, row.side),
  });
}

export function isV2PostingGroupLocked(
  state: V2StudentState,
  accountNumber: V2AccountNumber,
  side: V2PostingSide,
): boolean {
  const document = currentDocument(state);
  if (!document) return false;
  if (state.phase === 'documentReview') return true;
  return groupFor(document, accountNumber, side)?.status === 'correct';
}

function groupKey(accountNumber: V2AccountNumber, side: V2PostingSide): string {
  return accountNumber + ':' + side;
}

function meaningful(row: V2StudentPostingRow): boolean {
  return row.rawAmount.trim() !== '' || row.text.trim() !== '';
}

function gradeGroup(
  rows: readonly V2StudentPostingRow[],
  expectedSum: number,
): Pick<V2DocumentGroupState, 'status' | 'issue'> {
  if (rows.length === 0) return { status: 'incorrect', issue: 'missing' };
  const parsed = rows.map(row => parseV2PostingAmount(row.rawAmount));
  if (parsed.some(result => result.kind !== 'valid')) return { status: 'incorrect', issue: 'invalid' };
  const studentSum = parsed.reduce(
    (sum, result) => sum + (result.kind === 'valid' ? result.value : 0),
    0,
  );
  if (expectedSum === 0) return { status: 'incorrect', issue: 'unexpected' };
  if (studentSum !== expectedSum) return { status: 'incorrect', issue: 'incorrectSum' };
  return { status: 'correct' };
}

function sortGroups(left: V2DocumentGroupState, right: V2DocumentGroupState): number {
  const accountDifference =
    V2_ACCOUNT_NUMBERS.indexOf(left.accountNumber) - V2_ACCOUNT_NUMBERS.indexOf(right.accountNumber);
  if (accountDifference !== 0) return accountDifference;
  return left.side === right.side ? 0 : left.side === 'debit' ? -1 : 1;
}

export function checkV2CurrentDocument(
  answers: V2AnswerKey,
  state: V2StudentState,
): V2StudentState {
  const document = canEditDocument(state);
  if (!document || state.currentDocumentId === null) return state;
  const expectedDocument = answers.documents.find(candidate => candidate.id === state.currentDocumentId);
  if (!expectedDocument) throw new Error('Missing V2.1 answer document');

  const rows = document.rows.filter(meaningful);
  const expected = new Map<string, number>();
  for (const posting of expectedDocument.expectedPostings) {
    const key = groupKey(posting.accountNumber, posting.side);
    expected.set(key, (expected.get(key) ?? 0) + posting.amount);
  }
  const student = new Map<string, V2StudentPostingRow[]>();
  for (const row of rows) {
    const key = groupKey(row.accountNumber, row.side);
    student.set(key, [...(student.get(key) ?? []), row]);
  }

  const groups = [...new Set([...expected.keys(), ...student.keys()])]
    .map((key): V2DocumentGroupState => {
      const [accountNumber, side] = key.split(':') as [V2AccountNumber, V2PostingSide];
      return { accountNumber, side, ...gradeGroup(student.get(key) ?? [], expected.get(key) ?? 0) };
    })
    .sort(sortGroups);
  const allCorrect = groups.length > 0 && groups.every(group => group.status === 'correct');
  const updated: V2StudentDocumentState = {
    ...document,
    status: allCorrect ? 'completed' : 'active',
    rows,
    groups,
  };
  return freezeState({
    ...state,
    phase: allCorrect ? 'documentReview' : 'documentEntry',
    documents: state.documents.map(candidate =>
      candidate.documentId === updated.documentId ? updated : candidate,
    ),
  });
}

export function advanceFromV2DocumentReview(state: V2StudentState): V2StudentState {
  if (state.phase !== 'documentReview' || state.currentDocumentId === null) return state;
  const currentIndex = V2_DOCUMENT_IDS.indexOf(state.currentDocumentId);
  if (currentIndex < 0) return state;
  if (currentIndex === V2_DOCUMENT_IDS.length - 1) {
    return freezeState({ ...state, phase: 'checkpoint', currentDocumentId: null });
  }
  const nextDocumentId: V2DocumentId = V2_DOCUMENT_IDS[currentIndex + 1];
  return freezeState({
    ...state,
    phase: 'documentEntry',
    currentDocumentId: nextDocumentId,
    documents: state.documents.map(document =>
      document.documentId === nextDocumentId ? { ...document, status: 'active' as const } : document,
    ),
  });
}

function resetEditedStatus(status: V2GradingStatus): V2GradingStatus {
  return status === 'incorrect' ? 'unchecked' : status;
}

export function editV2CheckpointAmount(
  state: V2StudentState,
  sectionId: V2AmountCheckpointSectionId,
  field: V2CheckpointAmountField,
  rawAmount: string,
): V2StudentState {
  if (state.phase !== 'checkpoint') return state;
  const section = state.checkpoint[sectionId];
  if (section.status === 'correct') return state;
  let checkpoint: V2CheckpointState;
  if ((sectionId === 'A' || sectionId === 'B') && (GROSS_FIELDS as readonly string[]).includes(field)) {
    checkpoint = {
      ...state.checkpoint,
      [sectionId]: {
        status: resetEditedStatus(section.status),
        values: { ...state.checkpoint[sectionId].values, [field]: rawAmount },
      },
    };
  } else if (sectionId === 'C' && (OTHER_FIELDS as readonly string[]).includes(field)) {
    checkpoint = {
      ...state.checkpoint,
      C: {
        status: resetEditedStatus(section.status),
        values: { ...state.checkpoint.C.values, [field]: rawAmount },
      },
    };
  } else if (sectionId === 'D' && field === 'operatingTotal') {
    checkpoint = {
      ...state.checkpoint,
      D: {
        status: resetEditedStatus(section.status),
        values: { operatingTotal: rawAmount },
      },
    };
  } else {
    return state;
  }
  return freezeState({ ...state, checkpoint });
}

export function editV2CheckpointBalance(
  state: V2StudentState,
  accountNumber: V2CheckpointBalanceAccount,
  changes: { readonly rawAmount?: string; readonly side?: V2CheckpointBalanceSide },
): V2StudentState {
  if (state.phase !== 'checkpoint') return state;
  if (!(V2_CHECKPOINT_BALANCE_ACCOUNTS as readonly string[]).includes(accountNumber)) {
    throw new RangeError('Unknown V2.1 checkpoint account');
  }
  if (state.checkpoint.E.status === 'correct') return state;
  return freezeState({
    ...state,
    checkpoint: {
      ...state.checkpoint,
      E: {
        status: resetEditedStatus(state.checkpoint.E.status),
        balances: state.checkpoint.E.balances.map(balance =>
          balance.accountNumber === accountNumber ? { ...balance, ...changes } : balance,
        ),
      },
    },
  });
}

function amountsCorrect(
  values: object,
  expected: object,
): boolean {
  const valueRecord = values as Readonly<Record<string, string>>;
  return Object.entries(expected as Readonly<Record<string, number>>).every(([field, expectedAmount]) => {
    const parsed = parseV2CheckpointAmount(valueRecord[field] ?? '');
    return parsed.kind === 'valid' && parsed.value === expectedAmount;
  });
}

function checkpointECorrect(answers: V2AnswerKey, state: V2StudentState): boolean {
  return state.checkpoint.E.balances.every(input => {
    const expected = answers.reconciliation.E.find(item => item.accountNumber === input.accountNumber);
    if (!expected) throw new Error('Missing V2.1 checkpoint balance');
    const parsed = parseV2CheckpointAmount(input.rawAmount);
    const expectedSide: V2CheckpointBalanceSide = expected.bookedSide === 'credit' ? 'K' : 'D';
    return parsed.kind === 'valid' && parsed.value === expected.bookedAmount && input.side === expectedSide;
  });
}

function allCheckpointSectionsCorrect(checkpoint: V2CheckpointState): boolean {
  return (Object.keys(checkpoint) as V2CheckpointSectionId[])
    .every(sectionId => checkpoint[sectionId].status === 'correct');
}

export function checkV2CheckpointSection(
  answers: V2AnswerKey,
  state: V2StudentState,
  sectionId: V2CheckpointSectionId,
): V2StudentState {
  if (state.phase !== 'checkpoint' || state.checkpoint[sectionId].status === 'correct') return state;
  let correct: boolean;
  if (sectionId === 'A' || sectionId === 'B') {
    const expected = answers.reconciliation[sectionId];
    correct = amountsCorrect(state.checkpoint[sectionId].values, {
      wageAccountYtd: expected.wageAccountYtd,
      employeePensionYtd: expected.employeePensionYtd,
      employeeAtpYtd: expected.employeeAtpYtd,
      calculatedGrossPayYtd: expected.calculatedGrossPayYtd,
    });
  } else if (sectionId === 'C') {
    const pension = answers.reconciliation.C.pension;
    const atp = answers.reconciliation.C.atp;
    const holidayPay = answers.reconciliation.C.holidayPay;
    correct = amountsCorrect(state.checkpoint.C.values, {
      pensionBookBalance: pension.bookedAmount,
      hourlyEmployeePensionYtd: pension.hourlyEmployeePensionYtd,
      hourlyEmployerPensionYtd: pension.hourlyEmployerPensionYtd,
      salariedEmployeePensionYtd: pension.salariedEmployeePensionYtd,
      salariedEmployerPensionYtd: pension.salariedEmployerPensionYtd,
      atpBookBalance: atp.bookedAmount,
      hourlyEmployeeAtpYtd: atp.hourlyEmployeeAtpYtd,
      hourlyEmployerAtpYtd: atp.hourlyEmployerAtpYtd,
      salariedEmployeeAtpYtd: atp.salariedEmployeeAtpYtd,
      salariedEmployerAtpYtd: atp.salariedEmployerAtpYtd,
      holidayPayBookBalance: holidayPay.bookedAmount,
      holidayPayGrossYtd: holidayPay.grossHolidayPayYtd,
    });
  } else if (sectionId === 'D') {
    correct = amountsCorrect(state.checkpoint.D.values, {
      operatingTotal: answers.reconciliation.D.operatingTotal,
    });
  } else {
    correct = checkpointECorrect(answers, state);
  }

  const checkpoint = {
    ...state.checkpoint,
    [sectionId]: {
      ...state.checkpoint[sectionId],
      status: correct ? 'correct' as const : 'incorrect' as const,
    },
  } as V2CheckpointState;
  return freezeState({
    ...state,
    checkpoint,
    phase: correct && allCheckpointSectionsCorrect(checkpoint)
      ? 'checkpointReview'
      : 'checkpoint',
  });
}

export function completeV2Level(state: V2StudentState): V2StudentState {
  if (state.phase !== 'checkpointReview') return state;
  return freezeState({ ...state, phase: 'completed', currentDocumentId: null });
}
