import type { V2DocumentId } from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import { presentV2WorkspaceProgress } from './presentation';

export function V2Progress({
  state,
  compact = false,
  viewedDocumentId,
  onViewDocument,
}: {
  readonly state: V2StudentState;
  readonly compact?: boolean;
  readonly viewedDocumentId?: V2DocumentId;
  readonly onViewDocument?: (documentId: V2DocumentId) => void;
}) {
  const presentation = presentV2WorkspaceProgress(state);
  return <nav
    className={'l2v2-progress' + (compact ? ' l2v2-progress-compact' : '')}
    aria-label="Niveau 2-progression"
  >
    <p>{presentation.summary}</p>
    <ol>
      {presentation.steps.map(step => {
        const selected = step.documentId === viewedDocumentId;
        const clickable = step.documentId !== undefined &&
          step.status === 'completed' &&
          onViewDocument !== undefined;
        const statusLabel = step.status === 'completed' ? 'gennemført' :
          step.status === 'active' ? 'aktiv' : 'kommende';
        return <li
          className={'l2v2-status-' + step.status + (selected ? ' l2v2-progress-viewed' : '')}
          aria-current={step.status === 'active' ? 'step' : undefined}
          aria-label={step.label + ' ' + statusLabel}
          key={step.label}
        >
          {clickable
            ? <button
              type="button"
              aria-label={step.label + ' gennemført – se godkendt bilag'}
              aria-pressed={selected}
              onClick={() => onViewDocument(step.documentId!)}
            >{step.label}</button>
            : <span>{step.label}</span>}
          {step.status === 'active' && <span className="l2v2-progress-status">aktiv</span>}
        </li>;
      })}
    </ol>
  </nav>;
}
