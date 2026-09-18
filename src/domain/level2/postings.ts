import { requireWholeKrone } from './ruleset';
import type {
  DocumentPeriod,
  DocumentPhase,
  EmployeeGroup,
  Level2Document,
  Level2DocumentId,
  Level2AccountNumber,
  Posting,
  PostingSide,
} from './types';

export interface PostingDraft {
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly amount: number;
  readonly text: string;
  readonly employeeGroup?: EmployeeGroup;
  readonly role?: Posting['role'];
}

export function createPosting(documentId: Level2DocumentId, draft: PostingDraft): Posting {
  requireWholeKrone(draft.amount, 'posting amount');
  return Object.freeze({ documentId, ...draft });
}

export function createDocument(
  id: Level2DocumentId,
  period: DocumentPeriod,
  phase: DocumentPhase,
  title: string,
  drafts: readonly PostingDraft[],
): Level2Document {
  const expectedPostings = Object.freeze(drafts.map(draft => createPosting(id, draft)));
  const debitTotal = expectedPostings
    .filter(posting => posting.side === 'debit')
    .reduce((sum, posting) => sum + posting.amount, 0);
  const creditTotal = expectedPostings
    .filter(posting => posting.side === 'credit')
    .reduce((sum, posting) => sum + posting.amount, 0);

  return Object.freeze({
    id,
    period,
    phase,
    title,
    expectedPostings,
    debitTotal,
    creditTotal,
    balanced: debitTotal === creditTotal,
  });
}

export function flattenPostings(documents: readonly Level2Document[]): readonly Posting[] {
  return Object.freeze(documents.flatMap(document => document.expectedPostings));
}
