import { useState } from 'react';
import type { V2DocumentId } from '../../../domain/level2/v2';
import { V2CheckpointWorkspace } from './CheckpointWorkspace';
import { V2CompletedView } from './CompletedView';
import { V2DocumentWorkspace } from './DocumentWorkspace';
import { V2HistoricalDocumentReview } from './HistoricalDocumentReview';
import { V2WorkspaceSaveStatus } from './SaveStatus';
import type { Level2V2WorkspaceProps } from './types';
import './workspace.css';

export function Level2V2Workspace({
  variant,
  source,
  studentState,
  saveStatus,
  actions,
  onGoHome,
}: Level2V2WorkspaceProps) {
  const [viewedDocumentId, setViewedDocumentId] = useState<V2DocumentId | null>(null);
  const checkpoint = studentState.phase === 'checkpoint' || studentState.phase === 'checkpointReview';
  const openApprovedDocument = (documentId: V2DocumentId) => {
    const document = studentState.documents.find(item => item.documentId === documentId);
    if (document?.status === 'completed') setViewedDocumentId(documentId);
  };
  return <main className={'l2v2-root' + (checkpoint && viewedDocumentId === null ? ' l2v2-root-checkpoint' : '')}>
    <h2 className="l2v2-sr-only">Niveau 2</h2>
    {onGoHome && <button type="button" className="l2v2-home" onClick={onGoHome}>Til forsiden</button>}
    <V2WorkspaceSaveStatus status={saveStatus} onRetry={actions.retrySave} />
    {viewedDocumentId !== null
      ? <V2HistoricalDocumentReview
        source={source}
        state={studentState}
        documentId={viewedDocumentId}
        onSelectDocument={openApprovedDocument}
        onBack={() => setViewedDocumentId(null)}
      />
      : <>
        {(studentState.phase === 'documentEntry' || studentState.phase === 'documentReview') &&
          <V2DocumentWorkspace
            source={source}
            state={studentState}
            actions={actions}
            onViewApprovedDocument={openApprovedDocument}
          />}
        {checkpoint && <V2CheckpointWorkspace
          source={source}
          state={studentState}
          actions={actions}
          onViewApprovedDocument={openApprovedDocument}
        />}
        {studentState.phase === 'completed' &&
          <V2CompletedView variant={variant} source={source} state={studentState} />}
      </>}
  </main>;
}