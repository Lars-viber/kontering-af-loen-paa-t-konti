import type { Level2Account } from '../../domain/level2';
import type { Level2CaseSnapshot } from '../session';
import type { Level2StudentState } from '../state';
import { Dialog } from '../../ui/Dialog';
import { formatLevel2Amount, formatLevel2Balance } from './format';
import { selectOpeningBalance, selectRunningHistory } from './workspaceSelectors';

export function AccountHistoryDialog({
  account, snapshot, state, onClose,
}: {
  readonly account: Level2Account;
  readonly snapshot: Level2CaseSnapshot;
  readonly state: Level2StudentState;
  readonly onClose: () => void;
}) {
  const rows = selectRunningHistory(snapshot, state, account.accountNumber);
  const opening = selectOpeningBalance(snapshot, account.accountNumber);
  return <Dialog title={account.accountNumber + ' ' + account.name} onClose={onClose}>
    <p className="l2-history-opening">Primo: <strong>{formatLevel2Balance(opening)}</strong></p>
    <div className="l2-history-table-wrap">
      <table className="l2-history-table">
        <thead><tr><th>Bilag</th><th>Side</th><th>Beløb</th><th>Saldo</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.documentId + '-' + row.rowId}>
          <td>{row.documentId}</td>
          <td>{row.side === 'debit' ? 'Debet' : 'Kredit'}</td>
          <td>{formatLevel2Amount(row.amount)}</td>
          <td>{formatLevel2Balance(row.balance)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </Dialog>;
}
