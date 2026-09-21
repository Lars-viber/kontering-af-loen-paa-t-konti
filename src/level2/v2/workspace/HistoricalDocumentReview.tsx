import type {
  V2DocumentId,
  V2SourceCase,
} from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import { V2DocumentWorkspace } from './DocumentWorkspace';
import { V2Progress } from './Progress';
import {
  V2_READ_ONLY_ACTIONS,
  createV2DocumentReviewState,
} from './reviewPresentation';

function returnLabel(state: V2StudentState): string {
  return state.currentDocumentId === null
    ? 'Tilbage til afstemning'
    : 'Tilbage til ' + state.currentDocumentId;
}

export function V2HistoricalDocumentReview({
  source,
  state,
  documentId,
  onSelectDocument,
  onBack,
}: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly documentId: V2DocumentId;
  readonly onSelectDocument: (documentId: V2DocumentId) => void;
  readonly onBack: () => void;
}) {
  const reviewState = createV2DocumentReviewState(state, documentId);
  return <section className="l2v2-historical-review" aria-label="Tidligere godkendt bilag">
    <header className="l2v2-historical-review-header">
      <div>
        <p className="l2v2-eyebrow">TIDLIGERE GODKENDT BILAG · READ-ONLY</p>
        <h1>Du ser et tidligere godkendt bilag: {documentId}</h1>
        <p>Visningen ændrer ikke dit aktuelle bilag eller din afstemning.</p>
      </div>
      <button type="button" className="l2v2-secondary" onClick={onBack}>{returnLabel(state)}</button>
    </header>
    <V2Progress
      state={state}
      viewedDocumentId={documentId}
      onViewDocument={onSelectDocument}
    />
    <V2DocumentWorkspace
      source={source}
      state={reviewState}
      actions={V2_READ_ONLY_ACTIONS}
      completedReview
      hideProgress
    />
    <div className="l2v2-historical-review-actions">
      <button type="button" className="l2v2-secondary" onClick={onBack}>{returnLabel(state)}</button>
    </div>
  </section>;
}