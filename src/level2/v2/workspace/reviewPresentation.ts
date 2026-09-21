import {
  V2_DOCUMENT_IDS,
  type V2DocumentId,
} from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import type { Level2V2WorkspaceActions } from './types';

export const V2_READ_ONLY_ACTIONS: Level2V2WorkspaceActions = {
  addPosting: () => undefined,
  editPosting: () => undefined,
  removePosting: () => undefined,
  checkDocument: () => undefined,
  advanceDocument: () => undefined,
  editCheckpointAmount: () => undefined,
  editCheckpointBalance: () => undefined,
  checkCheckpointSection: () => undefined,
  complete: () => undefined,
  retrySave: () => undefined,
};

export function createV2DocumentReviewState(
  state: V2StudentState,
  documentId: V2DocumentId,
): V2StudentState {
  const currentIndex = V2_DOCUMENT_IDS.indexOf(documentId);
  return {
    ...state,
    phase: 'documentReview',
    currentDocumentId: documentId,
    documents: state.documents.map((document, index) => index <= currentIndex
      ? document
      : { ...document, status: 'pending', rows: [], groups: [] }),
  };
}