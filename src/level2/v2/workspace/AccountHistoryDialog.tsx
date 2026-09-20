import { Dialog } from '../../../ui/Dialog';
import type { V2Account, V2AccountBalance } from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import { formatV2WorkspaceAmount, formatV2WorkspaceBalance } from './format';
import {
  selectV2WorkspaceOpeningBalance,
  selectV2WorkspaceRunningHistory,
  sideLabel,
} from './workspaceSelectors';

export function V2AccountHistoryDialog({
  account,
  openingBalances,
  state,
  onClose,
}: {
  readonly account: V2Account;
  readonly openingBalances: readonly V2AccountBalance[];
  readonly state: V2StudentState;
  readonly onClose: () => void;
}) {
  const rows = selectV2WorkspaceRunningHistory(openingBalances, state, account.accountNumber);
  const opening = selectV2WorkspaceOpeningBalance(openingBalances, account.accountNumber);
  return <Dialog title={account.accountNumber + ' ' + account.name} onClose={onClose}>
    <p className="l2v2-history-opening">Primo: <strong>{formatV2WorkspaceBalance(opening)}</strong></p>
    <div className="l2v2-history-table-wrap">
      <table className="l2v2-history-table">
        <thead><tr><th>Bilag</th><th>Side</th><th>Tekst</th><th>Beløb</th><th>Saldo</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.documentId + '-' + row.rowId}>
          <td>{row.documentId}</td>
          <td>{sideLabel(row.side)}</td>
          <td>{row.text || 'Postering'}</td>
          <td>{formatV2WorkspaceAmount(row.amount)}</td>
          <td>{formatV2WorkspaceBalance(row.balance)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </Dialog>;
}
