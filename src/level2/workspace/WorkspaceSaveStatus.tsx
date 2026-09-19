import type { Level2SaveStatus } from '../controller';

export function WorkspaceSaveStatus({
  status, onRetry,
}: {
  readonly status: Level2SaveStatus;
  readonly onRetry: () => void;
}) {
  if (status === 'saved') return <p className="save-status success l2-save-status" role="status">Gemt</p>;
  if (status === 'error') return <div className="save-warning l2-save-status" role="alert">
    <p>Din seneste ændring kunne ikke gemmes.</p>
    <button type="button" onClick={onRetry}>Prøv at gemme igen</button>
  </div>;
  return null;
}
