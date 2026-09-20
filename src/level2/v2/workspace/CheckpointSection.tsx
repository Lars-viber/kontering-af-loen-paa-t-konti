import type { V2SourceCase } from '../../../domain/level2/v2';
import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2GradingStatus,
  V2StudentState,
} from '../state';
import { formatV2WorkspaceAmount, parseV2WorkspaceAmount } from './format';
import type { V2CheckpointSectionPresentation } from './checkpointPresentation';
import { presentV2WorkspaceReconciliation } from './presentation';
import { V2ReconciliationResult } from './ReconciliationResult';

export function V2CheckpointSection({
  source,
  state,
  presentation,
  status,
  values,
  onEdit,
  onCheck,
}: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly presentation: V2CheckpointSectionPresentation;
  readonly status: V2GradingStatus;
  readonly values: Readonly<Record<string, string>>;
  readonly onEdit: (
    sectionId: V2AmountCheckpointSectionId,
    field: V2CheckpointAmountField,
    rawAmount: string,
  ) => void;
  readonly onCheck: (sectionId: V2AmountCheckpointSectionId) => void;
}) {
  const locked = status === 'correct';
  return <section className={'l2v2-checkpoint-section l2v2-section-' + status} aria-labelledby={'l2v2-checkpoint-' + presentation.sectionId}>
    <header>
      <span className="l2v2-section-letter" aria-hidden="true">{presentation.sectionId}</span>
      <h2 id={'l2v2-checkpoint-' + presentation.sectionId}>{presentation.title}</h2>
      {locked && <strong className="l2v2-correct">✓ Korrekt</strong>}
    </header>
    {presentation.relationship && <p className="l2v2-relationship">{presentation.relationship}</p>}
    <div className="l2v2-checkpoint-fields">
      {presentation.fields.map(item => {
        const raw = values[item.field] ?? '';
        const parsed = parseV2WorkspaceAmount(raw);
        return <div className="l2v2-checkpoint-field" key={item.field}>
          <label htmlFor={'l2v2-checkpoint-' + presentation.sectionId + '-' + item.field}>{item.label}</label>
          {locked
            ? <strong>{parsed === null ? raw : formatV2WorkspaceAmount(parsed)}</strong>
            : <input
              id={'l2v2-checkpoint-' + presentation.sectionId + '-' + item.field}
              type="text"
              inputMode="numeric"
              placeholder="Beløb"
              value={raw}
              onChange={event => onEdit(presentation.sectionId, item.field, event.target.value)}
            />}
        </div>;
      })}
    </div>
    {status === 'incorrect' && <p className="l2v2-feedback l2v2-incorrect" role="status">
      Kontrollér dine beregninger og prøv igen.
    </p>}
    {!locked && <button type="button" className="l2v2-primary" onClick={() => onCheck(presentation.sectionId)}>
      Kontrollér sektion {presentation.sectionId}
    </button>}
    {locked && <V2ReconciliationResult
      rows={presentV2WorkspaceReconciliation(source, state, presentation.sectionId)}
      label={'Afstemningsresultat for sektion ' + presentation.sectionId}
    />}
  </section>;
}
