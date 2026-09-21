import type { V2SourceCase } from '../../../domain/level2/v2';
import type {
  V2CheckpointBalanceAccount,
  V2CheckpointBalanceInput,
  V2CheckpointBalanceSide,
  V2GradingStatus,
  V2StudentState,
} from '../state';
import { formatV2WorkspaceAmount, parseV2WorkspaceAmount } from './format';
import { V2_CHECKPOINT_BALANCE_LABELS } from './checkpointPresentation';
import { presentV2WorkspaceReconciliation } from './presentation';
import { V2ReconciliationResult } from './ReconciliationResult';

export function V2CheckpointBalanceSection({
  source,
  state,
  balances,
  status,
  onEdit,
  onCheck,
}: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly balances: readonly V2CheckpointBalanceInput[];
  readonly status: V2GradingStatus;
  readonly onEdit: (
    accountNumber: V2CheckpointBalanceAccount,
    changes: { readonly rawAmount?: string; readonly side?: V2CheckpointBalanceSide },
  ) => void;
  readonly onCheck: () => void;
}) {
  const locked = status === 'correct';
  return <section className={'l2v2-checkpoint-section l2v2-checkpoint-balance l2v2-section-' + status} aria-labelledby="l2v2-checkpoint-E">
    <header>
      <span className="l2v2-section-letter" aria-hidden="true">E</span>
      <h2 id="l2v2-checkpoint-E">Seks balanceposter</h2>
      {locked && <strong className="l2v2-correct">✓ Korrekt</strong>}
    </header>
    <p className="l2v2-balance-sources">
      <strong>Fra bogføringen / T-konto</strong> mod <strong>Ekstern kontroloplysning</strong>
    </p>
    <div className="l2v2-balance-inputs">
      {balances.map(balance => {
        const parsed = parseV2WorkspaceAmount(balance.rawAmount);
        const readonlyValue = parsed === null ? balance.rawAmount : formatV2WorkspaceAmount(parsed);
        return <div className="l2v2-balance-input" key={balance.accountNumber}>
          <label htmlFor={'l2v2-checkpoint-E-' + balance.accountNumber}>
            <strong>{balance.accountNumber}</strong> {V2_CHECKPOINT_BALANCE_LABELS[balance.accountNumber]}
          </label>
          {locked ? <strong>{readonlyValue} {balance.side}</strong> : <>
            <input
              id={'l2v2-checkpoint-E-' + balance.accountNumber}
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
                name={'l2v2-side-' + balance.accountNumber}
                checked={balance.side === 'D'}
                onChange={() => onEdit(balance.accountNumber, { side: 'D' })}
              /> D</label>
              <label><input
                type="radio"
                name={'l2v2-side-' + balance.accountNumber}
                checked={balance.side === 'K'}
                onChange={() => onEdit(balance.accountNumber, { side: 'K' })}
              /> K</label>
            </fieldset>
          </>}
        </div>;
      })}
    </div>
    {status === 'incorrect' && <p className="l2v2-feedback l2v2-incorrect" role="status">
      Kontrollér beløb og D/K, og prøv igen.
    </p>}
    {!locked && <button type="button" className="l2v2-primary" onClick={onCheck}>Kontrollér sektion E</button>}
    {locked && <V2ReconciliationResult
      rows={presentV2WorkspaceReconciliation(source, state, 'E')}
      label="Afstemningsresultat for sektion E"
    />}
  </section>;
}
