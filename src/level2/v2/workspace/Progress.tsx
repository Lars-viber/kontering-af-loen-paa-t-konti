import type { V2StudentState } from '../state';
import { presentV2WorkspaceProgress } from './presentation';

export function V2Progress({ state, compact = false }: {
  readonly state: V2StudentState;
  readonly compact?: boolean;
}) {
  const presentation = presentV2WorkspaceProgress(state);
  return <nav
    className={'l2v2-progress' + (compact ? ' l2v2-progress-compact' : '')}
    aria-label="Niveau 2-progression"
  >
    <p>{presentation.summary}</p>
    <ol>
      {presentation.steps.map(step => <li
        className={'l2v2-status-' + step.status}
        aria-current={step.status === 'active' ? 'step' : undefined}
        key={step.label}
      >
        <span>{step.label}</span>
        <span>{step.status === 'completed' ? '✓ gennemført' : step.status === 'active' ? 'aktiv' : 'kommende'}</span>
      </li>)}
    </ol>
  </nav>;
}
