import { V2CheckpointWorkspace } from './CheckpointWorkspace';
import { V2CompletedView } from './CompletedView';
import { V2DocumentWorkspace } from './DocumentWorkspace';
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
  return <main className="l2v2-root">
    <h2 className="l2v2-sr-only">Niveau 2</h2>
    {onGoHome && <button type="button" className="l2v2-home" onClick={onGoHome}>Til forsiden</button>}
    <V2WorkspaceSaveStatus status={saveStatus} onRetry={actions.retrySave} />
    {(studentState.phase === 'documentEntry' || studentState.phase === 'documentReview') &&
      <V2DocumentWorkspace source={source} state={studentState} actions={actions} />}
    {(studentState.phase === 'checkpoint' || studentState.phase === 'checkpointReview') &&
      <V2CheckpointWorkspace source={source} state={studentState} actions={actions} />}
    {studentState.phase === 'completed' &&
      <V2CompletedView variant={variant} source={source} state={studentState} />}
  </main>;
}
