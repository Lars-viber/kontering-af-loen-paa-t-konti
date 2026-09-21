import { useState } from 'react';
import {
  V2_DOCUMENT_IDS,
  type V2SourceCase,
} from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import { V2CheckpointWorkspace } from './CheckpointWorkspace';
import { V2DocumentWorkspace } from './DocumentWorkspace';
import {
  V2_READ_ONLY_ACTIONS,
  createV2DocumentReviewState,
} from './reviewPresentation';

const REVIEW_STEPS = [...V2_DOCUMENT_IDS, 'Afstemning'] as const;
type V2CompletedReviewStep = typeof REVIEW_STEPS[number];

export function V2CompletedReview({ source, state, onBack }: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly onBack: () => void;
}) {
  const [step, setStep] = useState<V2CompletedReviewStep>('B1');
  const index = REVIEW_STEPS.indexOf(step);
  const previous = index > 0 ? REVIEW_STEPS[index - 1] : null;
  const next = index < REVIEW_STEPS.length - 1 ? REVIEW_STEPS[index + 1] : null;
  const documentState = step === 'Afstemning' ? null : createV2DocumentReviewState(state, step);

  return <div className="l2v2-completed-review">
    <header className="l2v2-completed-review-header">
      <div>
        <p className="l2v2-eyebrow">AFSLUTTET OPGAVE · READ-ONLY</p>
        <h1>Gennemgå din afsluttede opgave</h1>
      </div>
      <button type="button" className="l2v2-secondary" onClick={onBack}>Tilbage til afslutning</button>
    </header>
    <nav className="l2v2-completed-review-nav" aria-label="Afsluttet opgave">
      {REVIEW_STEPS.map(item => <button
        type="button"
        aria-current={item === step ? 'step' : undefined}
        className={item === step ? 'l2v2-review-step-active' : undefined}
        onClick={() => setStep(item)}
        key={item}
      >{item}</button>)}
    </nav>

    {documentState
      ? <V2DocumentWorkspace
        source={source}
        state={documentState}
        actions={V2_READ_ONLY_ACTIONS}
        completedReview
        hideProgress
      />
      : <V2CheckpointWorkspace
        source={source}
        state={state}
        actions={V2_READ_ONLY_ACTIONS}
        completedReview
      />}

    <div className="l2v2-completed-review-actions">
      <button type="button" disabled={!previous} onClick={() => previous && setStep(previous)}>Forrige</button>
      <button type="button" disabled={!next} onClick={() => next && setStep(next)}>Næste</button>
      <button type="button" className="l2v2-secondary" onClick={onBack}>Tilbage til afslutning</button>
    </div>
  </div>;
}
