import type { AccountBalance, Level2Account, PostingSide } from '../../domain/level2';
import type { DocumentGroupState, StudentPostingRow } from '../state';
import type { ApprovedHistoryRow } from './workspaceSelectors';
import { formatLevel2Amount, formatLevel2Balance } from './format';
import { PostingRow } from './PostingRow';

interface TAccountCardProps {
  readonly account: Level2Account;
  readonly opening: AccountBalance;
  readonly balance: AccountBalance | null;
  readonly activeRows: readonly StudentPostingRow[];
  readonly history: readonly ApprovedHistoryRow[];
  readonly historyCount: number;
  readonly groups: Readonly<Record<PostingSide, DocumentGroupState | null>>;
  readonly onAdd: (side: PostingSide) => void;
  readonly onEdit: (rowId: number, rawAmount: string) => void;
  readonly onRemove: (rowId: number) => void;
  readonly onOpenHistory: () => void;
}

const sideLabel = (side: PostingSide) => side === 'debit' ? 'Debet' : 'Kredit';

export function TAccountCard({
  account, opening, balance, activeRows, history, historyCount, groups,
  onAdd, onEdit, onRemove, onOpenHistory,
}: TAccountCardProps) {
  const renderSide = (side: PostingSide) => {
    const rows = activeRows.filter(row => row.side === side);
    const historical = history.filter(row => row.side === side);
    const group = groups[side];
    const locked = group?.status === 'correct';
    const showIncorrect = group?.status === 'incorrect'
      && rows.some(row => row.rawAmount.trim() !== '' || row.text.trim() !== '');

    return <div className="l2-t-side" data-side={side}>
      <h4>{sideLabel(side)}</h4>
      {historical.map(row => <div className="l2-history-row" key={'history-' + row.rowId}>
        <span>{row.documentId}</span><strong>{formatLevel2Amount(row.amount)}</strong>
      </div>)}
      {rows.map(row => <PostingRow
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
        className="l2-add-row"
        aria-label={'Tilføj postering på ' + account.accountNumber + ' ' + sideLabel(side)}
        onClick={() => onAdd(side)}
      >+ Postering</button>}
      {locked && <p className="l2-group-status correct">✓ Korrekt</p>}
      {showIncorrect && <p className="l2-group-status incorrect">Ret postering</p>}
    </div>;
  };

  return <article className="l2-t-account" data-account={account.accountNumber}>
    <header>
      <div><strong>{account.accountNumber}</strong><span>{account.type === 'operating' ? 'Drift' : 'Balance'}</span></div>
      <h3>{account.name}</h3>
      <p>{account.type === 'operating' ? 'Saldo ÅTD t.o.m. 31/5' : 'Saldo pr. 1/6'}: <strong>{formatLevel2Balance(opening)}</strong></p>
    </header>
    <div className="l2-t-sides">{renderSide('debit')}{renderSide('credit')}</div>
    {historyCount > 3 && <button type="button" className="l2-history-more" onClick={onOpenHistory}>
      + {historyCount - 3} tidligere posteringer
    </button>}
    <footer><span>Aktuel saldo</span><strong>{balance ? formatLevel2Balance(balance) : 'Kan ikke beregnes'}</strong></footer>
  </article>;
}
