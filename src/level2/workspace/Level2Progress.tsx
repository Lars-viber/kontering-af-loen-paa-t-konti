import type { Level2StudentState } from '../state';
import { presentLevel2Progress } from './progressPresentation';

export function Level2Progress({ state, compact = false }: { readonly state: Level2StudentState; readonly compact?: boolean }) {
  const presentation = presentLevel2Progress(state);
  return <nav className={'l2-progress' + (compact ? ' compact' : '')} aria-label="Niveau 2-progression">
    <p>{presentation.summary}</p>
    <ol>
      {presentation.steps.map(item => <li
        className={'status-' + item.status}
        aria-current={item.status === 'active' ? 'step' : undefined}
        key={item.label}
      >
        <span>{item.label}</span>
        <span className="l2-progress-status">{item.status === 'completed' ? '✓ gennemført' : item.status === 'active' ? 'aktiv' : 'kommende'}</span>
      </li>)}
    </ol>
  </nav>;
}
