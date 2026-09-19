import type {
  CheckpointBalanceAccount,
  CheckpointBalanceInput,
  CheckpointBalanceSide,
  GradingStatus,
} from '../state';
import { CHECKPOINT_BALANCE_LABELS } from './checkpointPresentation';
import { formatLevel2Amount } from './format';

interface CheckpointBalanceSectionProps {
  readonly balances: readonly CheckpointBalanceInput[];
  readonly status: GradingStatus;
  readonly onEdit: (
    accountNumber: CheckpointBalanceAccount,
    changes: { readonly rawAmount?: string; readonly side?: CheckpointBalanceSide },
  ) => void;
  readonly onCheck: () => void;
}

function readonlyAmount(input: CheckpointBalanceInput): string {
  const parsed = Number(input.rawAmount.replaceAll('.', '').replace(',', '.'));
  const amount = Number.isFinite(parsed) ? formatLevel2Amount(parsed) : input.rawAmount;
  if (input.side === 'blank' || input.side === 'zero') return amount;
  return amount + ' ' + (input.side === 'debit' ? 'D' : 'K');
}

export function CheckpointBalanceSection({
  balances, status, onEdit, onCheck,
}: CheckpointBalanceSectionProps) {
  const locked = status === 'correct';
  return <section className={'l2-checkpoint-section l2-checkpoint-balance status-' + status} aria-labelledby="checkpoint-E">
    <header>
      <span className="l2-section-letter" aria-hidden="true">E</span>
      <h2 id="checkpoint-E">Skyldige poster pr. 30/6</h2>
      {locked && <strong className="l2-section-status correct">✓ Korrekt</strong>}
    </header>
    <div className="l2-balance-inputs">
      {balances.map(balance => <div className="l2-balance-input" key={balance.accountNumber}>
        <label htmlFor={'checkpoint-E-' + balance.accountNumber}>
          <strong>{balance.accountNumber}</strong> {CHECKPOINT_BALANCE_LABELS[balance.accountNumber]}
        </label>
        {locked
          ? <strong className="l2-readonly-amount">{readonlyAmount(balance)}</strong>
          : <>
            <input
              id={'checkpoint-E-' + balance.accountNumber}
              type="text"
              inputMode="numeric"
              placeholder="Beløb"
              value={balance.rawAmount}
              onChange={event => onEdit(balance.accountNumber, { rawAmount: event.target.value })}
            />
            <fieldset>
              <legend>Side for {balance.accountNumber}</legend>
              <label><input
                type="radio"
                name={'checkpoint-side-' + balance.accountNumber}
                checked={balance.side === 'debit'}
                onChange={() => onEdit(balance.accountNumber, { side: 'debit' })}
              /> D</label>
              <label><input
                type="radio"
                name={'checkpoint-side-' + balance.accountNumber}
                checked={balance.side === 'credit'}
                onChange={() => onEdit(balance.accountNumber, { side: 'credit' })}
              /> K</label>
            </fieldset>
          </>}
      </div>)}
    </div>
    {status === 'incorrect' && <p className="l2-section-feedback" role="status">Kontrollér beløb og D/K, og prøv igen.</p>}
    {!locked && <button type="button" className="primary l2-section-check" onClick={onCheck}>Kontrollér sektion E</button>}
  </section>;
}
