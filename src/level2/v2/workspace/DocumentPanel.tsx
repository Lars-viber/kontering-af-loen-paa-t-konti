import type { V2SourceCase } from '../../../domain/level2/v2';
import {
  selectV2CurrentDocument,
  selectV2CurrentDocumentTotals,
  type V2StudentState,
} from '../state';
import { formatV2WorkspaceAmount } from './format';
import {
  selectV2WorkspaceDocument,
  selectV2WorkspaceDocumentTallies,
} from './presentation';
import { V2Progress } from './Progress';

export function V2DocumentPanel({
  source,
  state,
  onCheck,
  onAdvance,
  onOpenAccountPlan,
}: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly onCheck: () => void;
  readonly onAdvance: () => void;
  readonly onOpenAccountPlan: () => void;
}) {
  if (state.currentDocumentId === null ||
      (state.phase !== 'documentEntry' && state.phase !== 'documentReview')) return null;
  const documentSource = selectV2WorkspaceDocument(source, state.currentDocumentId);
  const tallies = selectV2WorkspaceDocumentTallies(source, state.currentDocumentId);
  const document = selectV2CurrentDocument(state);
  const totals = selectV2CurrentDocumentTotals(state);
  const review = state.phase === 'documentReview';
  const hasIncorrect = document?.groups.some(group => group.status === 'incorrect') ?? false;
  const total = (side: 'debit' | 'credit') => {
    const value = totals[side];
    return value.hasInvalidInput || value.total === null ? '—' : formatV2WorkspaceAmount(value.total);
  };
  const invalidTotal = totals.debit.hasInvalidInput || totals.credit.hasInvalidInput;
  return <aside className="l2v2-document-panel" aria-labelledby="l2v2-document-title">
    <p className="l2v2-eyebrow">{documentSource.id} · Juni 2026</p>
    <h1 id="l2v2-document-title">{documentSource.title}</h1>
    <V2Progress state={state} compact />
    <dl className="l2v2-source-lines">
      {documentSource.fields.map(field => <div key={field.id}>
        <dt>{field.label}</dt><dd>{formatV2WorkspaceAmount(field.amount)}</dd>
      </div>)}
    </dl>
    {tallies.length > 0 && <section className="l2v2-document-tallies" aria-labelledby="l2v2-document-tallies-title">
      <h2 id="l2v2-document-tallies-title">Tælleværker ÅTD</h2>
      <p>ÅTD t.o.m. juni · pr. 30/6</p>
      <dl>{tallies.map(tally => <div key={tally.id}>
        <dt>{tally.presentationLabel}</dt><dd>{formatV2WorkspaceAmount(tally.amount)}</dd>
      </div>)}</dl>
    </section>}
    <button type="button" className="l2v2-secondary" onClick={onOpenAccountPlan}>Kontoplan</button>
    <section className="l2v2-document-totals" aria-label="Bilagets elevtotaler">
      <div><span>Debet</span><strong>{total('debit')}</strong></div>
      <div><span>Kredit</span><strong>{total('credit')}</strong></div>
      {invalidTotal
        ? <p className="l2v2-incorrect">Kontrollér ugyldigt beløb</p>
        : totals.balanceState === 'balanced'
          ? <p className="l2v2-correct">Balancerer</p>
          : totals.balanceState === 'unbalanced' && <p className="l2v2-incorrect">Ikke i balance</p>}
    </section>
    {hasIncorrect && !review && <p className="l2v2-feedback l2v2-incorrect" role="status">
      Bilaget er ikke færdigt. Der mangler eller er fejl i en eller flere posteringer.
    </p>}
    {review ? <section className="l2v2-review-status" role="status">
      <strong>✓ Bilaget er korrekt bogført</strong>
      <p>Gennemgå gerne T-kontiene, før du fortsætter.</p>
      <button type="button" className="l2v2-primary" onClick={onAdvance}>
        {state.currentDocumentId === 'B9' ? 'Gå videre til afstemning' : 'Gå videre til næste bilag'}
      </button>
    </section> : <button type="button" className="l2v2-primary l2v2-check-document" onClick={onCheck}>
      Kontrollér bilag
    </button>}
  </aside>;
}
