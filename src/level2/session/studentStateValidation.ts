import { canonicalStringify } from '../../domain/level2/canonical';
import { LEVEL2_ACCOUNT_NUMBERS, LEVEL2_DOCUMENT_IDS } from '../../domain/level2/types';
import {
  CHECKPOINT_BALANCE_ACCOUNTS,
  FINAL_CONTROL_ITEM_IDS,
  FINAL_CONTROL_REASON_IDS,
  FINAL_CONTROL_EXPECTED_REASONS,
  checkActiveDocument,
  checkCheckpointSection,
  type CheckpointSectionId,
  type Level2StudentState,
} from '../state';
import type { Level2CaseSnapshot, RuntimeValidationResult } from './types';
import { clonePlainData, hasExactKeys, isOneOf, isPlainRecord, isSafeWhole } from './validationUtils';

const GRADING_STATUSES = ['unchecked', 'incorrect', 'correct'] as const;
const DOCUMENT_STATUSES = ['pending', 'active', 'completed'] as const;
const POSTING_SIDES = ['debit', 'credit'] as const;
const BALANCE_SIDES = ['debit', 'credit', 'zero', 'blank'] as const;
const GROUP_ISSUES = ['missing', 'invalid', 'incorrectSum', 'unexpected'] as const;
const CHECKPOINT_IDS = ['A', 'B', 'C', 'D', 'E'] as const;

function validatePhase(value: unknown): boolean {
  if (!isPlainRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'document') {
    return hasExactKeys(value, ['kind', 'activeDocumentId']) && isOneOf(value.activeDocumentId, LEVEL2_DOCUMENT_IDS);
  }
  return (value.kind === 'checkpoint' || value.kind === 'finalControl' || value.kind === 'completed') &&
    hasExactKeys(value, ['kind']);
}

function validateDocuments(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== LEVEL2_DOCUMENT_IDS.length) return false;
  const rowIds = new Set<number>();
  for (let index = 0; index < value.length; index += 1) {
    const document = value[index];
    if (!isPlainRecord(document) || !hasExactKeys(document, ['documentId', 'status', 'rows', 'groups'])) return false;
    if (document.documentId !== LEVEL2_DOCUMENT_IDS[index] || !isOneOf(document.status, DOCUMENT_STATUSES)) return false;
    if (!Array.isArray(document.rows) || !Array.isArray(document.groups)) return false;
    for (const row of document.rows) {
      if (!isPlainRecord(row) || !hasExactKeys(row, ['rowId', 'documentId', 'accountNumber', 'side', 'rawAmount', 'text'])) return false;
      if (!isSafeWhole(row.rowId, 1) || rowIds.has(row.rowId)) return false;
      rowIds.add(row.rowId);
      if (row.documentId !== document.documentId || !isOneOf(row.accountNumber, LEVEL2_ACCOUNT_NUMBERS) ||
        !isOneOf(row.side, POSTING_SIDES) || typeof row.rawAmount !== 'string' || typeof row.text !== 'string') return false;
    }
    const groupKeys = new Set<string>();
    for (const group of document.groups) {
      if (!isPlainRecord(group)) return false;
      const hasIssue = Object.prototype.hasOwnProperty.call(group, 'issue');
      if (!hasExactKeys(group, hasIssue ? ['accountNumber', 'side', 'status', 'issue'] : ['accountNumber', 'side', 'status'])) return false;
      if (!isOneOf(group.accountNumber, LEVEL2_ACCOUNT_NUMBERS) || !isOneOf(group.side, POSTING_SIDES) ||
        !isOneOf(group.status, GRADING_STATUSES)) return false;
      const groupKey = group.accountNumber + ':' + group.side;
      if (groupKeys.has(groupKey)) return false;
      groupKeys.add(groupKey);
      if (group.status === 'incorrect') {
        if (!hasIssue || !isOneOf(group.issue, GROUP_ISSUES)) return false;
      } else if (hasIssue) return false;
    }
  }
  return true;
}

function validateAmountSection(value: unknown, fields: readonly string[]): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['status', 'values']) || !isOneOf(value.status, GRADING_STATUSES)) return false;
  if (!isPlainRecord(value.values) || !hasExactKeys(value.values, fields)) return false;
  const values = value.values;
  return fields.every(field => typeof values[field] === 'string');
}

function validateCheckpoint(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, CHECKPOINT_IDS)) return false;
  if (!validateAmountSection(value.A, ['wageAccount', 'employeePension', 'employeeAtp', 'grossPayroll'])) return false;
  if (!validateAmountSection(value.B, ['wageAccount', 'employeePension', 'employeeAtp', 'grossPayroll'])) return false;
  if (!validateAmountSection(value.C, ['employerPension', 'employerAtp', 'hourlyHolidayPay', 'holidayLiabilityAdjustment'])) return false;
  if (!validateAmountSection(value.D, ['operatingTotal'])) return false;
  if (!isPlainRecord(value.E) || !hasExactKeys(value.E, ['status', 'balances']) ||
    !isOneOf(value.E.status, GRADING_STATUSES) || !Array.isArray(value.E.balances) ||
    value.E.balances.length !== CHECKPOINT_BALANCE_ACCOUNTS.length) return false;
  return value.E.balances.every((balance, index) => isPlainRecord(balance) &&
    hasExactKeys(balance, ['accountNumber', 'rawAmount', 'side']) &&
    balance.accountNumber === CHECKPOINT_BALANCE_ACCOUNTS[index] &&
    typeof balance.rawAmount === 'string' && isOneOf(balance.side, BALANCE_SIDES));
}

function validateFinalControl(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['items']) || !Array.isArray(value.items) ||
    value.items.length !== FINAL_CONTROL_ITEM_IDS.length) return false;
  return value.items.every((item, index) => isPlainRecord(item) &&
    hasExactKeys(item, ['itemId', 'selectedReasonId', 'status']) &&
    item.itemId === FINAL_CONTROL_ITEM_IDS[index] &&
    (item.selectedReasonId === null || isOneOf(item.selectedReasonId, FINAL_CONTROL_REASON_IDS)) &&
    isOneOf(item.status, GRADING_STATUSES));
}

function expectedDocumentStatuses(state: Level2StudentState): readonly string[] | null {
  if (state.phase.kind === 'document') {
    const activeIndex = LEVEL2_DOCUMENT_IDS.indexOf(state.phase.activeDocumentId);
    if (activeIndex < 0) return null;
    if (activeIndex >= 9 && !CHECKPOINT_IDS.every(id => state.checkpoint[id].status === 'correct')) return null;
    return LEVEL2_DOCUMENT_IDS.map((_, index) => index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending');
  }
  if (state.phase.kind === 'checkpoint') {
    return LEVEL2_DOCUMENT_IDS.map((_, index) => index < 9 ? 'completed' : 'pending');
  }
  return LEVEL2_DOCUMENT_IDS.map(() => 'completed');
}

function checkpointIsPristine(state: Level2StudentState): boolean {
  const amountValues = [
    ...Object.values(state.checkpoint.A.values),
    ...Object.values(state.checkpoint.B.values),
    ...Object.values(state.checkpoint.C.values),
    ...Object.values(state.checkpoint.D.values),
  ];
  return amountValues.every(value => value === '') &&
    state.checkpoint.E.balances.every(balance => balance.rawAmount === '' && balance.side === 'blank');
}
function validateProgression(state: Level2StudentState): boolean {
  const expectedStatuses = expectedDocumentStatuses(state);
  if (!expectedStatuses || state.documents.some((document, index) => document.status !== expectedStatuses[index])) return false;
  for (const document of state.documents) {
    if (document.status === 'pending' && (document.rows.length !== 0 || document.groups.length !== 0)) return false;
    if (document.status === 'completed' &&
      (document.groups.length === 0 || document.groups.some(group => group.status !== 'correct'))) return false;
  }

  const beforeCheckpoint = state.phase.kind === 'document' && LEVEL2_DOCUMENT_IDS.indexOf(state.phase.activeDocumentId) < 9;
  const afterCheckpoint = state.phase.kind === 'finalControl' || state.phase.kind === 'completed' ||
    (state.phase.kind === 'document' && LEVEL2_DOCUMENT_IDS.indexOf(state.phase.activeDocumentId) >= 9);
  if (beforeCheckpoint && (CHECKPOINT_IDS.some(id => state.checkpoint[id].status !== 'unchecked') || !checkpointIsPristine(state))) return false;
  if (afterCheckpoint && CHECKPOINT_IDS.some(id => state.checkpoint[id].status !== 'correct')) return false;
  if (state.phase.kind === 'checkpoint' && CHECKPOINT_IDS.every(id => state.checkpoint[id].status === 'correct')) return false;

  const beforeFinal = state.phase.kind === 'document' || state.phase.kind === 'checkpoint';
  if (beforeFinal && state.finalControl.items.some(item => item.status !== 'unchecked' || item.selectedReasonId !== null)) return false;
  if (state.phase.kind === 'completed' && state.finalControl.items.some(item => item.status !== 'correct')) return false;
  if (state.phase.kind === 'finalControl' && state.finalControl.items.every(item => item.status === 'correct')) return false;
  if ((state.phase.kind === 'completed') !== state.completed) return false;
  return true;
}

function validateNextRowId(state: Level2StudentState): boolean {
  if (!isSafeWhole(state.nextRowId, 1)) return false;
  const maxRowId = state.documents.flatMap(document => document.rows).reduce((max, row) => Math.max(max, row.rowId), 0);
  return state.nextRowId > maxRowId;
}

function validateStrongDocumentStatuses(snapshot: Level2CaseSnapshot, state: Level2StudentState): boolean {
  for (const document of state.documents) {
    if (document.groups.length === 0) continue;
    const stateCopy = clonePlainData(state);
    const validationState = {
      ...stateCopy,
      phase: { kind: 'document' as const, activeDocumentId: document.documentId },
      completed: false,
      documents: stateCopy.documents.map(candidate => ({
        ...candidate,
        status: candidate.documentId === document.documentId ? 'active' as const : 'pending' as const,
      })),
    };
    const graded = checkActiveDocument(snapshot, validationState);
    const gradedDocument = graded.documents.find(candidate => candidate.documentId === document.documentId);
    if (!gradedDocument) return false;
    for (const group of document.groups) {
      if (group.status === 'unchecked') continue;
      const actual = gradedDocument.groups.find(candidate =>
        candidate.accountNumber === group.accountNumber && candidate.side === group.side);
      if (!actual || actual.status !== group.status ||
        (group.status === 'incorrect' && actual.issue !== group.issue)) return false;
    }
    if (document.groups.every(group => group.status !== 'unchecked')) {
      if (canonicalStringify(gradedDocument.groups) !== canonicalStringify(document.groups) ||
        canonicalStringify(gradedDocument.rows) !== canonicalStringify(document.rows)) return false;
      if (document.status === 'active') {
        if (graded.phase.kind !== 'document' || graded.phase.activeDocumentId !== document.documentId) return false;
      }
    }
  }
  return true;
}

function validateStrongCheckpointStatuses(snapshot: Level2CaseSnapshot, state: Level2StudentState): boolean {
  for (const sectionId of CHECKPOINT_IDS) {
    const section = state.checkpoint[sectionId];
    if (section.status === 'unchecked') continue;
    const stateCopy = clonePlainData(state);
    const validationState = {
      ...stateCopy,
      phase: { kind: 'checkpoint' as const },
      completed: false,
      checkpoint: {
        ...stateCopy.checkpoint,
        [sectionId]: { ...section, status: 'unchecked' as const },
      },
    } as Level2StudentState;
    const graded = checkCheckpointSection(snapshot, validationState, sectionId as CheckpointSectionId);
    if (graded.checkpoint[sectionId].status !== section.status) return false;
  }
  return true;
}

function validateStrongFinalStatuses(state: Level2StudentState): boolean {
  for (const item of state.finalControl.items) {
    const expectedReason = FINAL_CONTROL_EXPECTED_REASONS[item.itemId];
    if (item.status === 'correct' && item.selectedReasonId !== expectedReason) return false;
    if (item.status === 'incorrect' && item.selectedReasonId === expectedReason) return false;
  }
  return true;
}

export function validateLevel2StudentState(
  value: unknown,
  snapshot: Level2CaseSnapshot,
): RuntimeValidationResult<Level2StudentState> {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    'phase', 'documents', 'nextRowId', 'checkpoint', 'finalControl', 'completed',
  ])) return { ok: false };
  if (!validatePhase(value.phase) || !validateDocuments(value.documents) ||
    !validateCheckpoint(value.checkpoint) || !validateFinalControl(value.finalControl) ||
    typeof value.completed !== 'boolean') return { ok: false };
  const state = value as unknown as Level2StudentState;
  if (!validateNextRowId(state) || !validateProgression(state) ||
    !validateStrongDocumentStatuses(snapshot, state) ||
    !validateStrongCheckpointStatuses(snapshot, state) ||
    !validateStrongFinalStatuses(state)) return { ok: false };
  return { ok: true, value: state };
}

