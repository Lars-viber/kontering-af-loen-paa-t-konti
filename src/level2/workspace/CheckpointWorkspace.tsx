import { useState } from 'react';
import type { Level2SaveStatus } from '../controller';
import type { Level2PersistedSession } from '../session';
import {
  checkCheckpointSection,
  editCheckpointAmount,
  editCheckpointBalance,
  type AmountCheckpointSectionId,
  type CheckpointAmountField,
  type CheckpointBalanceAccount,
  type CheckpointBalanceSide,
  type CheckpointSectionId,
  type Level2StudentState,
} from '../state';
import { CHECKPOINT_AMOUNT_SECTIONS } from './checkpointPresentation';
import { CheckpointBalanceSection } from './CheckpointBalanceSection';
import { CheckpointReferencePanel } from './CheckpointReferencePanel';
import { CheckpointSection } from './CheckpointSection';
import { Level2Progress } from './Level2Progress';
import { WorkspaceSaveStatus } from './WorkspaceSaveStatus';

export function CheckpointWorkspace({
  session, saveStatus, onStudentStateChange, onRetrySave, onGoHome,
}: {
  readonly session: Level2PersistedSession;
  readonly saveStatus: Level2SaveStatus;
  readonly onStudentStateChange: (next: Level2StudentState) => void;
  readonly onRetrySave: () => void;
  readonly onGoHome: () => void;
}) {
  const [referenceOpen, setReferenceOpen] = useState(true);
  const state = session.studentState;
  const checkpoint = state.checkpoint;
  const correctCount = Object.values(checkpoint).filter(section => section.status === 'correct').length;
  const apply = (next: Level2StudentState) => onStudentStateChange(next);

  const editAmount = (
    sectionId: AmountCheckpointSectionId,
    field: CheckpointAmountField,
    rawAmount: string,
  ) => apply(editCheckpointAmount(state, sectionId, field, rawAmount));
  const editBalance = (
    accountNumber: CheckpointBalanceAccount,
    changes: { readonly rawAmount?: string; readonly side?: CheckpointBalanceSide },
  ) => apply(editCheckpointBalance(state, accountNumber, changes));
  const check = (sectionId: CheckpointSectionId) =>
    apply(checkCheckpointSection(session.caseSnapshot, state, sectionId));

  return <main className="l2-phase-workspace l2-checkpoint-workspace">
    <button type="button" className="l2-main-home" onClick={onGoHome}>Til forsiden</button>
    <WorkspaceSaveStatus status={saveStatus} onRetry={onRetrySave} />
    <header className="l2-phase-intro">
      <div><p className="eyebrow">NIVEAU 2 · CHECKPOINT</p><h1>Afstemning pr. 30/6</h1>
        <p>Afstem lønomkostninger og skyldige poster pr. 30/6. Hver del kontrolleres separat.</p></div>
      <div className="l2-phase-progress"><strong>{correctCount} af 5 korrekte</strong>
        <button type="button" aria-expanded={referenceOpen} aria-controls="checkpoint-reference" onClick={() => setReferenceOpen(open => !open)}>
          {referenceOpen ? 'Skjul reference' : 'Vis reference'}
        </button></div>
    </header>
    <Level2Progress state={state} />
    <div className={'l2-checkpoint-layout' + (referenceOpen ? '' : ' reference-closed')}>
      <div className="l2-checkpoint-grid">
        {CHECKPOINT_AMOUNT_SECTIONS.map(presentation => {
          const section = checkpoint[presentation.sectionId];
          return <CheckpointSection
            key={presentation.sectionId}
            presentation={presentation}
            status={section.status}
            values={section.values as unknown as Readonly<Record<string, string>>}
            onEdit={editAmount}
            onCheck={check}
          />;
        })}
        <CheckpointBalanceSection
          balances={checkpoint.E.balances}
          status={checkpoint.E.status}
          onEdit={editBalance}
          onCheck={() => check('E')}
        />
      </div>
      {referenceOpen && <div id="checkpoint-reference"><CheckpointReferencePanel session={session} /></div>}
    </div>
  </main>;
}
