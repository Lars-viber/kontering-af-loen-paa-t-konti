import { LEVEL2_ACCOUNT_NUMBERS, LEVEL2_DOCUMENT_IDS, type Level2AccountNumber, type PostingSide } from '../../domain/level2';
import { parsePostingAmount } from './amountParser';
import { getLevel2CaseData } from './case';
import { freezeStudentState } from './stateUtils';
import type {
  DocumentGroupState,
  GroupIssue,
  Level2StateCase,
  Level2StudentState,
  StudentDocumentState,
  StudentPostingRow,
} from './types';

function key(accountNumber: Level2AccountNumber, side: PostingSide): string {
  return accountNumber + ':' + side;
}

function meaningful(row: StudentPostingRow): boolean {
  return row.rawAmount.trim() !== '' || row.text.trim() !== '';
}

function gradeGroup(
  rows: readonly StudentPostingRow[],
  expectedSum: number,
): { status: 'correct' } | { status: 'incorrect'; issue: GroupIssue } {
  if (rows.length === 0) return { status: 'incorrect', issue: 'missing' };
  const parsed = rows.map(row => parsePostingAmount(row.rawAmount));
  if (parsed.some(result => result.kind !== 'valid')) return { status: 'incorrect', issue: 'invalid' };
  const studentSum = parsed.reduce((sum, result) => sum + (result.kind === 'valid' ? result.value : 0), 0);
  if (expectedSum === 0) return { status: 'incorrect', issue: 'unexpected' };
  if (studentSum !== expectedSum) return { status: 'incorrect', issue: 'incorrectSum' };
  return { status: 'correct' };
}

function sortGroups(left: DocumentGroupState, right: DocumentGroupState): number {
  const accountDifference = LEVEL2_ACCOUNT_NUMBERS.indexOf(left.accountNumber) - LEVEL2_ACCOUNT_NUMBERS.indexOf(right.accountNumber);
  if (accountDifference !== 0) return accountDifference;
  return left.side === right.side ? 0 : left.side === 'debit' ? -1 : 1;
}

function progressCompletedDocument(
  state: Level2StudentState,
  document: StudentDocumentState,
): Level2StudentState {
  const index = LEVEL2_DOCUMENT_IDS.indexOf(document.documentId);
  const documents = state.documents.map(candidate => {
    if (candidate.documentId === document.documentId) return { ...document, status: 'completed' as const };
    if (index !== 8 && index !== 12 && candidate.documentId === LEVEL2_DOCUMENT_IDS[index + 1]) {
      return { ...candidate, status: 'active' as const };
    }
    return candidate;
  });

  if (index === 8) return freezeStudentState({ ...state, documents, phase: { kind: 'checkpoint' } });
  if (index === 12) return freezeStudentState({ ...state, documents, phase: { kind: 'finalControl' } });
  return freezeStudentState({
    ...state,
    documents,
    phase: { kind: 'document', activeDocumentId: LEVEL2_DOCUMENT_IDS[index + 1] },
  });
}

export function checkActiveDocument(
  source: Level2StateCase,
  state: Level2StudentState,
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'document') return state;
  const caseData = getLevel2CaseData(source);
  const activeDocumentId = state.phase.activeDocumentId;
  const document = state.documents.find(candidate => candidate.documentId === activeDocumentId);
  const expectedDocument = caseData.documents.find(candidate => candidate.id === activeDocumentId);
  if (!document || document.status !== 'active' || !expectedDocument) return state;

  const rows = document.rows.filter(row => meaningful(row));
  const expected = new Map<string, number>();
  for (const posting of expectedDocument.expectedPostings) {
    const groupKey = key(posting.accountNumber, posting.side);
    expected.set(groupKey, (expected.get(groupKey) ?? 0) + posting.amount);
  }
  const student = new Map<string, StudentPostingRow[]>();
  for (const row of rows) {
    const groupKey = key(row.accountNumber, row.side);
    student.set(groupKey, [...(student.get(groupKey) ?? []), row]);
  }

  const union = new Set([...expected.keys(), ...student.keys()]);
  const groups = [...union].map((groupKey): DocumentGroupState => {
    const [accountNumber, side] = groupKey.split(':') as [Level2AccountNumber, PostingSide];
    const result = gradeGroup(student.get(groupKey) ?? [], expected.get(groupKey) ?? 0);
    return { accountNumber, side, ...result };
  }).sort(sortGroups);

  const updated: StudentDocumentState = { ...document, rows, groups };
  if (groups.length > 0 && groups.every(group => group.status === 'correct')) {
    return progressCompletedDocument(state, updated);
  }

  return freezeStudentState({
    ...state,
    documents: state.documents.map(candidate => candidate.documentId === updated.documentId ? updated : candidate),
  });
}
