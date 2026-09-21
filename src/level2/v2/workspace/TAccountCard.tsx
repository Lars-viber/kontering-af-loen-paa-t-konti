import type {
  V2Account,
  V2AccountBalance,
  V2PostingSide,
} from '../../../domain/level2/v2';
import type {
  V2DocumentGroupState,
  V2PostingRowChanges,
  V2StudentPostingRow,
} from '../state';
import { formatV2WorkspaceAmount, formatV2WorkspaceBalance } from './format';
import { V2PostingRow } from './PostingRow';
import { sideLabel, type V2WorkspaceHistoryRow } from './workspaceSelectors';

export function V2TAccountCard({
  account,
  opening,
  balance,
  activeRows,
  history,
  groups,
  reviewMode,
  onAdd,
  onEdit,
  onRemove,
}: {
  readonly account: V2Account;
  readonly opening: V2AccountBalance;
  readonly balance: V2AccountBalance;
  readonly activeRows: readonly V2StudentPostingRow[];
  readonly history: readonly V2WorkspaceHistoryRow[];
  readonly groups: Readonly<Record<V2PostingSide, V2DocumentGroupState | null>>;
  readonly reviewMode: boolean;
  readonly onAdd: (side: V2PostingSide) => void;
  readonly onEdit: (rowId: number, changes: V2PostingRowChanges) => void;
  readonly onRemove: (rowId: number) => void;
}) {
  const renderSide = (side: V2PostingSide) => {
    const group = groups[side];
    const locked = reviewMode || group?.status === 'correct';
    const rows = activeRows.filter(row => row.side === side);
    const previous = history.filter(row => row.side === side);
    const showIncorrect = group?.status === 'incorrect' && !reviewMode;
    return <div className="l2v2-t-side" data-side={side}>
      <h4>{sideLabel(side)}</h4>
      {previous.map(row => <div className="l2v2-history-row" key={'history-' + row.rowId}>
        <span>{row.documentId}</span><strong>{formatV2WorkspaceAmount(row.amount)}</strong>
      </div>)}
      {rows.map(row => <V2PostingRow
        key={row.rowId}
        accountNumber={account.accountNumber}
        side={side}
        row={row}
        locked={locked}
        onEdit={onEdit}
        onRemove={onRemove}
      />)}
      {!locked && <button
        type="button"
        className="l2v2-add-row"
        aria-label={'Tilføj postering på ' + account.accountNumber + ' ' + sideLabel(side)}
        onClick={() => onAdd(side)}
      >+ Postering</button>}
      {group?.status === 'correct' && <p className="l2v2-group-status l2v2-correct">✓ Korrekt</p>}
      {showIncorrect && <p className="l2v2-group-status l2v2-incorrect">Ret postering</p>}
    </div>;
  };
  return <article className="l2v2-t-account" data-account={account.accountNumber}>
    <header>
      <div><strong>{account.accountNumber}</strong><span>{account.type === 'operating' ? 'Drift' : 'Balance'}</span></div>
      <h3>{account.name}</h3>
      <p>{account.type === 'operating' ? 'Saldo ÅTD t.o.m. 31/5' : 'Saldo pr. 1/6'}: <strong>{formatV2WorkspaceBalance(opening)}</strong></p>
    </header>
    <div className="l2v2-t-sides">{renderSide('debit')}{renderSide('credit')}</div>
    <footer><span>Aktuel saldo</span><strong>{formatV2WorkspaceBalance(balance)}</strong></footer>
  </article>;
}
