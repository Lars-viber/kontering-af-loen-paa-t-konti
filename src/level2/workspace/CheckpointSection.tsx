import type {
  AmountCheckpointSectionId,
  CheckpointAmountField,
  GradingStatus,
} from '../state';
import type { CheckpointSectionPresentation } from './checkpointPresentation';
import { formatLevel2Amount } from './format';

interface CheckpointSectionProps {
  readonly presentation: CheckpointSectionPresentation;
  readonly status: GradingStatus;
  readonly values: Readonly<Record<string, string>>;
  readonly onEdit: (sectionId: AmountCheckpointSectionId, field: CheckpointAmountField, value: string) => void;
  readonly onCheck: (sectionId: AmountCheckpointSectionId) => void;
}

function readonlyAmount(rawAmount: string): string {
  const parsed = Number(rawAmount.replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(parsed) ? formatLevel2Amount(parsed) : rawAmount;
}

export function CheckpointSection({
  presentation, status, values, onEdit, onCheck,
}: CheckpointSectionProps) {
  const locked = status === 'correct';
  return <section className={'l2-checkpoint-section status-' + status} aria-labelledby={'checkpoint-' + presentation.sectionId}>
    <header>
      <span className="l2-section-letter" aria-hidden="true">{presentation.sectionId}</span>
      <h2 id={'checkpoint-' + presentation.sectionId}>{presentation.title}</h2>
      {locked && <strong className="l2-section-status correct">✓ Korrekt</strong>}
    </header>
    {presentation.relationship && <p className="l2-relationship">{presentation.relationship}</p>}
    <div className="l2-checkpoint-fields">
      {presentation.fields.map(item => <div className="l2-checkpoint-field" key={item.field}>
        <label htmlFor={'checkpoint-' + presentation.sectionId + '-' + item.field}>{item.label}</label>
        {locked
          ? <strong className="l2-readonly-amount">{readonlyAmount(values[item.field] ?? '')}</strong>
          : <input
            id={'checkpoint-' + presentation.sectionId + '-' + item.field}
            type="text"
            inputMode="numeric"
            placeholder="Beløb"
            value={values[item.field] ?? ''}
            onChange={event => onEdit(presentation.sectionId, item.field, event.target.value)}
          />}
      </div>)}
    </div>
    {status === 'incorrect' && <p className="l2-section-feedback" role="status">Kontrollér dine beregninger og prøv igen.</p>}
    {!locked && <button type="button" className="primary l2-section-check" onClick={() => onCheck(presentation.sectionId)}>
      Kontrollér sektion {presentation.sectionId}
    </button>}
  </section>;
}
