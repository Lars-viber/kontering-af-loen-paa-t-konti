import type {
  V2AccountNumber,
  V2PostingSide,
} from '../../../domain/level2/v2';
import type { V2PostingRowChanges, V2StudentPostingRow } from '../state';
import { formatV2WorkspaceAmount, parseV2WorkspaceAmount } from './format';
import { sideLabel } from './workspaceSelectors';

export function V2PostingRow({
  accountNumber,
  side,
  row,
  locked,
  onEdit,
  onRemove,
}: {
  readonly accountNumber: V2AccountNumber;
  readonly side: V2PostingSide;
  readonly row: V2StudentPostingRow;
  readonly locked: boolean;
  readonly onEdit: (rowId: number, changes: V2PostingRowChanges) => void;
  readonly onRemove: (rowId: number) => void;
}) {
  if (locked) {
    const amount = parseV2WorkspaceAmount(row.rawAmount);
    return <div className="l2v2-posting-row l2v2-posting-row-readonly">
      <span>{row.text || 'Postering'}</span>
      <strong>{amount === null ? row.rawAmount : formatV2WorkspaceAmount(amount)}</strong>
      <span aria-label="Låst korrekt postering">✓</span>
    </div>;
  }
  return <div className="l2v2-posting-row">
    <label className="l2v2-sr-only" htmlFor={'l2v2-row-' + row.rowId}>
      Beløb på {accountNumber} {sideLabel(side)}
    </label>
    <input
      id={'l2v2-row-' + row.rowId}
      type="text"
      inputMode="numeric"
      value={row.rawAmount}
      placeholder="Beløb"
      onChange={event => onEdit(row.rowId, { rawAmount: event.target.value })}
    />
    <button
      type="button"
      className="l2v2-remove-row"
      aria-label={'Fjern postering på ' + accountNumber + ' ' + sideLabel(side)}
      onClick={() => onRemove(row.rowId)}
    >×</button>
  </div>;
}
