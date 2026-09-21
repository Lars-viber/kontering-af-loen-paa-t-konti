import { useState } from 'react';
import type { V2DocumentId, V2SourceCase } from '../../../domain/level2/v2';
import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2CheckpointBalanceAccount,
  V2CheckpointBalanceSide,
  V2StudentState,
} from '../state';
import { V2CheckpointBalanceSection } from './CheckpointBalanceSection';
import { V2CheckpointReferencePanel } from './CheckpointReferencePanel';
import { V2CheckpointSection } from './CheckpointSection';
import { V2_CHECKPOINT_AMOUNT_SECTIONS } from './checkpointPresentation';
import { V2Progress } from './Progress';
import type { Level2V2WorkspaceActions } from './types';

export function V2CheckpointWorkspace({ source, state, actions, completedReview = false, onViewApprovedDocument }: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly actions: Level2V2WorkspaceActions;
  readonly completedReview?: boolean;
  readonly onViewApprovedDocument?: (documentId: V2DocumentId) => void;
}) {
  const [referenceOpen, setReferenceOpen] = useState(true);
  const checkpoint = state.checkpoint;
  const correctCount = Object.values(checkpoint).filter(section => section.status === 'correct').length;
  const review = completedReview || state.phase === 'checkpointReview';
  const editAmount = (
    sectionId: V2AmountCheckpointSectionId,
    field: V2CheckpointAmountField,
    rawAmount: string,
  ) => actions.editCheckpointAmount(sectionId, field, rawAmount);
  const editBalance = (
    accountNumber: V2CheckpointBalanceAccount,
    changes: { readonly rawAmount?: string; readonly side?: V2CheckpointBalanceSide },
  ) => actions.editCheckpointBalance(accountNumber, changes);
  return <div className="l2v2-checkpoint-workspace">
    <header className="l2v2-phase-intro">
      <div>
        <p className="l2v2-eyebrow">NIVEAU 2 · AFSTEMNING</p>
        <h1>Afstemning pr. 30/6</h1>
        <p>Afstem bogføringen mod lønsystemets tælleværker og eksterne kontroloplysninger.</p>
      </div>
      <div className="l2v2-phase-progress">
        <strong>{correctCount} af 5 afstemninger korrekte</strong>
        <button
          type="button"
          aria-expanded={referenceOpen}
          aria-controls="l2v2-checkpoint-reference"
          onClick={() => setReferenceOpen(open => !open)}
        >{referenceOpen ? 'Skjul reference' : 'Vis reference'}</button>
      </div>
    </header>
    <V2Progress state={state} onViewDocument={onViewApprovedDocument} />
    {review && <section className="l2v2-checkpoint-review" role="status">
      <div>
        <strong>✓ Afstemningen pr. 30/6 stemmer</strong>
        <span>5 af 5 afstemninger korrekte</span>
      </div>
      {state.phase === 'checkpointReview' && !completedReview && <button
        type="button"
        className="l2v2-primary l2v2-complete-top"
        onClick={actions.complete}
      >Afslut Niveau 2</button>}
    </section>}
    <div className={'l2v2-checkpoint-layout' + (referenceOpen ? '' : ' l2v2-reference-closed')}>
      <div className="l2v2-checkpoint-grid">
        <div className="l2v2-gross-pair" role="group" aria-label="Afstemning A og B">
          {V2_CHECKPOINT_AMOUNT_SECTIONS.slice(0, 2).map(presentation => {
            const section = checkpoint[presentation.sectionId];
            return <V2CheckpointSection
              key={presentation.sectionId}
              source={source}
              state={state}
              presentation={presentation}
              status={section.status}
              values={section.values as unknown as Readonly<Record<string, string>>}
              onEdit={editAmount}
              onCheck={actions.checkCheckpointSection}
            />;
          })}
        </div>
        {V2_CHECKPOINT_AMOUNT_SECTIONS.slice(2).map(presentation => {
          const section = checkpoint[presentation.sectionId];
          return <V2CheckpointSection
            key={presentation.sectionId}
            source={source}
            state={state}
            presentation={presentation}
            status={section.status}
            values={section.values as unknown as Readonly<Record<string, string>>}
            onEdit={editAmount}
            onCheck={actions.checkCheckpointSection}
          />;
        })}
        <V2CheckpointBalanceSection
          source={source}
          state={state}
          balances={checkpoint.E.balances}
          status={checkpoint.E.status}
          onEdit={editBalance}
          onCheck={() => actions.checkCheckpointSection('E')}
        />
        {review && !completedReview && <button type="button" className="l2v2-primary l2v2-complete" onClick={actions.complete}>
          Afslut Niveau 2
        </button>}
      </div>
      {referenceOpen && <div id="l2v2-checkpoint-reference">
        <V2CheckpointReferencePanel source={source} state={state} />
      </div>}
    </div>
  </div>;
}
