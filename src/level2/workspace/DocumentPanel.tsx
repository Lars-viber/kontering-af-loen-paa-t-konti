import type { Level2CaseSnapshot } from '../session';
import type { Level2StudentState, StudentDocumentTotals } from '../state';
import { selectActiveDocument } from '../state';
import { formatLevel2Amount } from './format';
import { presentLevel2Document } from './documentPresentation';

interface DocumentPanelProps {
  readonly snapshot: Level2CaseSnapshot;
  readonly state: Level2StudentState;
  readonly totals: StudentDocumentTotals;
  readonly onCheck: () => void;
  readonly onOpenAccountPlan: () => void;
  readonly onOpenVideo: () => void;
}

export function DocumentPanel({
  snapshot, state, totals, onCheck, onOpenAccountPlan, onOpenVideo,
}: DocumentPanelProps) {
  if (state.phase.kind !== 'document') return null;
  const presentation = presentLevel2Document(snapshot, state.phase.activeDocumentId);
  const document = selectActiveDocument(state);
  const hasIncorrectGroups = document?.groups.some(group => group.status === 'incorrect');
  const total = (side: 'debit' | 'credit') => {
    const selected = totals[side];
    return selected.hasInvalidInput || selected.total === null ? '—' : formatLevel2Amount(selected.total);
  };
  const invalidTotal = totals.debit.hasInvalidInput || totals.credit.hasInvalidInput;

  return <aside className="l2-document-panel">
    <p className="eyebrow">{presentation.documentId} · {presentation.periodLabel}</p>
    <h2>{presentation.title}</h2>
    <dl className="l2-document-lines">
      {presentation.rows.map((row, index) => <div className={row.emphasis === 'total' ? 'total' : ''} key={row.label + index}>
        <dt>{row.label}</dt><dd>{formatLevel2Amount(row.amount)}</dd>
      </div>)}
    </dl>
    <div className="l2-document-tools">
      <button type="button" onClick={onOpenAccountPlan}>Kontoplan</button>
      <button type="button" onClick={onOpenVideo}>Videogennemgang</button>
    </div>
    <section className="l2-document-totals" aria-label="Bilagets elevtotaler">
      <div><span>Debet</span><strong>{total('debit')}</strong></div>
      <div><span>Kredit</span><strong>{total('credit')}</strong></div>
      {invalidTotal
        ? <p className="unbalanced">Kontrollér ugyldigt beløb</p>
        : totals.balanceState === 'balanced'
          ? <p className="balanced">Balancerer</p>
          : totals.balanceState === 'unbalanced' && <p className="unbalanced">Ikke i balance</p>}
    </section>
    {hasIncorrectGroups && <p className="l2-general-feedback" role="status">Bilaget er ikke færdigt. Der mangler eller er fejl i en eller flere posteringer.</p>}
    <button type="button" className="primary l2-check" onClick={onCheck}>Kontrollér bilag</button>
  </aside>;
}
