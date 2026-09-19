import type { Level2AccountNumber, PostingSide } from '../../domain/level2';
import type { StudentPostingRow } from '../state';
import { formatLevel2Amount } from './format';

interface PostingRowProps {
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly row: StudentPostingRow;
  readonly locked: boolean;
  readonly onEdit: (rowId: number, rawAmount: string) => void;
  readonly onRemove: (rowId: number) => void;
}

const sideLabel = (side: PostingSide) => side === 'debit' ? 'Debet' : 'Kredit';

export function PostingRow({ accountNumber, side, row, locked, onEdit, onRemove }: PostingRowProps) {
  if (locked) {
    const amount = Number(row.rawAmount.replaceAll('.', '').replace(',', '.'));
    return <div className="l2-posting-row l2-posting-row-locked">
      <span>{Number.isFinite(amount) ? formatLevel2Amount(amount) : row.rawAmount}</span>
      <span className="l2-lock" aria-label="Låst korrekt postering">✓</span>
    </div>;
  }

  return <div className="l2-posting-row">
    <label className="sr-only" htmlFor={'l2-row-' + row.rowId}>
      Beløb på {accountNumber} {sideLabel(side)}
    </label>
    <input
      id={'l2-row-' + row.rowId}
      type="text"
      inputMode="numeric"
      value={row.rawAmount}
      onChange={event => onEdit(row.rowId, event.target.value)}
      placeholder="Beløb"
    />
    <button
      type="button"
      className="l2-remove-row"
      aria-label={'Fjern postering på ' + accountNumber + ' ' + sideLabel(side)}
      onClick={() => onRemove(row.rowId)}
    >×</button>
  </div>;
}
