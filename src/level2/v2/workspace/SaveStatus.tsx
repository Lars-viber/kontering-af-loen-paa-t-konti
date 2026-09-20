import type { V2ControllerSaveStatus } from '../controller';

export function V2WorkspaceSaveStatus({ status, onRetry }: {
  readonly status: V2ControllerSaveStatus;
  readonly onRetry: () => void;
}) {
  if (status !== 'saveFailed') return null;
  return <div className="l2v2-save-warning" role="alert">
    <span>Kunne ikke gemme automatisk.</span>
    <button type="button" onClick={onRetry}>Prøv at gemme igen</button>
  </div>;
}
