import { canonicalStringify } from '../../../domain/level2/canonical';
import {
  V2_ACCOUNT_NUMBERS,
  V2_DOCUMENT_IDS,
} from '../../../domain/level2/v2/types';
import {
  V2_CHECKPOINT_BALANCE_ACCOUNTS,
  V2_STUDENT_PHASES,
  assertV2StudentState,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  type V2CheckpointSectionId,
  type V2StudentState,
} from '../state';
import type {
  V2RuntimeValidationResult,
  V2SessionCaseSnapshot,
} from './types';
import {
  clonePlainData,
  hasExactKeys,
  isOneOf,
  isPlainRecord,
  isSafeWhole,
} from './validationUtils';

const GRADING_STATUSES = ['unchecked', 'incorrect', 'correct'] as const;
const DOCUMENT_STATUSES = ['pending', 'active', 'completed'] as const;
const POSTING_SIDES = ['debit', 'credit'] as const;
const CHECKPOINT_SIDES = ['D', 'K', 'blank'] as const;
const GROUP_ISSUES = ['missing', 'invalid', 'incorrectSum', 'unexpected'] as const;
const CHECKPOINT_IDS = ['A', 'B', 'C', 'D', 'E'] as const satisfies readonly V2CheckpointSectionId[];

function validateDocuments(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== V2_DOCUMENT_IDS.length) return false;
  const rowIds = new Set<number>();
  for (let index = 0; index < value.length; index += 1) {
    const document = value[index];
    if (!isPlainRecord(document) ||
        !hasExactKeys(document, ['documentId', 'status', 'rows', 'groups'])) return false;
    if (document.documentId !== V2_DOCUMENT_IDS[index] ||
        !isOneOf(document.status, DOCUMENT_STATUSES)) return false;
    if (!Array.isArray(document.rows) || !Array.isArray(document.groups)) return false;
    for (const row of document.rows) {
      if (!isPlainRecord(row) ||
          !hasExactKeys(row, [
            'rowId', 'documentId', 'accountNumber', 'side', 'rawAmount', 'text',
          ])) return false;
      if (!isSafeWhole(row.rowId, 1) || rowIds.has(row.rowId)) return false;
      rowIds.add(row.rowId);
      if (
        row.documentId !== document.documentId ||
        !isOneOf(row.accountNumber, V2_ACCOUNT_NUMBERS) ||
        !isOneOf(row.side, POSTING_SIDES) ||
        typeof row.rawAmount !== 'string' ||
        typeof row.text !== 'string'
      ) return false;
    }
    const groupKeys = new Set<string>();
    for (const group of document.groups) {
      if (!isPlainRecord(group)) return false;
      const hasIssue = Object.prototype.hasOwnProperty.call(group, 'issue');
      if (!hasExactKeys(
        group,
        hasIssue
          ? ['accountNumber', 'side', 'status', 'issue']
          : ['accountNumber', 'side', 'status'],
      )) return false;
      if (
        !isOneOf(group.accountNumber, V2_ACCOUNT_NUMBERS) ||
        !isOneOf(group.side, POSTING_SIDES) ||
        !isOneOf(group.status, GRADING_STATUSES)
      ) return false;
      const key = group.accountNumber + ':' + group.side;
      if (groupKeys.has(key)) return false;
      groupKeys.add(key);
      if (group.status === 'incorrect') {
        if (!hasIssue || !isOneOf(group.issue, GROUP_ISSUES)) return false;
      } else if (hasIssue) {
        return false;
      }
    }
  }
  return true;
}

function validateAmountSection(value: unknown, fields: readonly string[]): boolean {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, ['status', 'values']) ||
      !isOneOf(value.status, GRADING_STATUSES)) return false;
  if (!isPlainRecord(value.values) || !hasExactKeys(value.values, fields)) return false;
  const values = value.values;
  return fields.every(field => typeof values[field] === 'string');
}

function validateCheckpoint(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, CHECKPOINT_IDS)) return false;
  if (!validateAmountSection(
    value.A,
    ['wageAccountYtd', 'employeePensionYtd', 'employeeAtpYtd', 'calculatedGrossPayYtd'],
  )) return false;
  if (!validateAmountSection(
    value.B,
    ['wageAccountYtd', 'employeePensionYtd', 'employeeAtpYtd', 'calculatedGrossPayYtd'],
  )) return false;
  if (!validateAmountSection(
    value.C,
    ['employerPension', 'employerAtp', 'grossHolidayPay', 'holidayLiabilityAdjustment'],
  )) return false;
  if (!validateAmountSection(value.D, ['operatingTotal'])) return false;
  if (
    !isPlainRecord(value.E) ||
    !hasExactKeys(value.E, ['status', 'balances']) ||
    !isOneOf(value.E.status, GRADING_STATUSES) ||
    !Array.isArray(value.E.balances) ||
    value.E.balances.length !== V2_CHECKPOINT_BALANCE_ACCOUNTS.length
  ) return false;
  return value.E.balances.every((balance, index) =>
    isPlainRecord(balance) &&
    hasExactKeys(balance, ['accountNumber', 'rawAmount', 'side']) &&
    balance.accountNumber === V2_CHECKPOINT_BALANCE_ACCOUNTS[index] &&
    typeof balance.rawAmount === 'string' &&
    isOneOf(balance.side, CHECKPOINT_SIDES),
  );
}

function checkpointIsPristine(state: V2StudentState): boolean {
  const values = [
    ...Object.values(state.checkpoint.A.values),
    ...Object.values(state.checkpoint.B.values),
    ...Object.values(state.checkpoint.C.values),
    ...Object.values(state.checkpoint.D.values),
  ];
  return CHECKPOINT_IDS.every(id => state.checkpoint[id].status === 'unchecked') &&
    values.every(value => value === '') &&
    state.checkpoint.E.balances.every(balance =>
      balance.rawAmount === '' && balance.side === 'blank',
    );
}

function validateProgression(state: V2StudentState): boolean {
  try {
    assertV2StudentState(state);
  } catch {
    return false;
  }
  for (const document of state.documents) {
    if (document.status === 'pending' &&
        (document.rows.length !== 0 || document.groups.length !== 0)) return false;
    if (document.status === 'completed' &&
        (document.groups.length === 0 ||
         document.groups.some(group => group.status !== 'correct'))) return false;
  }
  if ((state.phase === 'documentEntry' || state.phase === 'documentReview') &&
      !checkpointIsPristine(state)) return false;
  if (
    state.phase === 'checkpoint' &&
    CHECKPOINT_IDS.every(id => state.checkpoint[id].status === 'correct')
  ) return false;
  return true;
}

function validateNextRowId(state: V2StudentState): boolean {
  if (!isSafeWhole(state.nextRowId, 1)) return false;
  const maxRowId = state.documents
    .flatMap(document => document.rows)
    .reduce((maximum, row) => Math.max(maximum, row.rowId), 0);
  return state.nextRowId > maxRowId;
}

function validateStrongDocumentStatuses(
  snapshot: V2SessionCaseSnapshot,
  state: V2StudentState,
): boolean {
  for (let index = 0; index < state.documents.length; index += 1) {
    const document = state.documents[index];
    if (document.groups.length === 0) continue;
    const copy = clonePlainData(state);
    const validationState: V2StudentState = {
      ...copy,
      phase: 'documentEntry',
      currentDocumentId: document.documentId,
      documents: copy.documents.map((candidate, candidateIndex) => ({
        ...candidate,
        status: candidateIndex < index
          ? 'completed' as const
          : candidateIndex === index
            ? 'active' as const
            : 'pending' as const,
      })),
    };
    let graded: V2StudentState;
    try {
      graded = checkV2CurrentDocument(snapshot.answers, validationState);
    } catch {
      return false;
    }
    const gradedDocument = graded.documents[index];
    for (const group of document.groups) {
      if (group.status === 'unchecked') continue;
      const actual = gradedDocument.groups.find(candidate =>
        candidate.accountNumber === group.accountNumber &&
        candidate.side === group.side,
      );
      if (
        !actual ||
        actual.status !== group.status ||
        (group.status === 'incorrect' && actual.issue !== group.issue)
      ) return false;
    }
    if (document.status === 'completed') {
      if (
        graded.phase !== 'documentReview' ||
        canonicalStringify(gradedDocument.groups) !== canonicalStringify(document.groups) ||
        canonicalStringify(gradedDocument.rows) !== canonicalStringify(document.rows)
      ) return false;
    }
  }
  return true;
}

function validateStrongCheckpointStatuses(
  snapshot: V2SessionCaseSnapshot,
  state: V2StudentState,
): boolean {
  for (const sectionId of CHECKPOINT_IDS) {
    const section = state.checkpoint[sectionId];
    if (section.status === 'unchecked') continue;
    const copy = clonePlainData(state);
    const validationState: V2StudentState = {
      ...copy,
      phase: 'checkpoint',
      currentDocumentId: null,
      documents: copy.documents.map(document => ({
        ...document,
        status: 'completed' as const,
      })),
      checkpoint: {
        ...copy.checkpoint,
        [sectionId]: { ...section, status: 'unchecked' as const },
      },
    };
    let graded: V2StudentState;
    try {
      graded = checkV2CheckpointSection(snapshot.answers, validationState, sectionId);
    } catch {
      return false;
    }
    if (graded.checkpoint[sectionId].status !== section.status) return false;
  }
  return true;
}

export function validateV2SessionStudentState(
  value: unknown,
  snapshot: V2SessionCaseSnapshot,
): V2RuntimeValidationResult<V2StudentState> {
  if (!isPlainRecord(value) ||
      !hasExactKeys(value, [
        'phase', 'currentDocumentId', 'documents', 'nextRowId', 'checkpoint',
      ])) return { ok: false };
  if (!isOneOf(value.phase, V2_STUDENT_PHASES)) return { ok: false };
  if (
    value.currentDocumentId !== null &&
    !isOneOf(value.currentDocumentId, V2_DOCUMENT_IDS)
  ) return { ok: false };
  if (!validateDocuments(value.documents) || !validateCheckpoint(value.checkpoint)) {
    return { ok: false };
  }
  const state = value as unknown as V2StudentState;
  if (
    !validateNextRowId(state) ||
    !validateProgression(state) ||
    !validateStrongDocumentStatuses(snapshot, state) ||
    !validateStrongCheckpointStatuses(snapshot, state)
  ) return { ok: false };
  return { ok: true, value: state };
}
