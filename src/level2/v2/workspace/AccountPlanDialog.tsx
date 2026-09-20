import { Dialog } from '../../../ui/Dialog';
import type { V2Account } from '../../../domain/level2/v2';

export function V2AccountPlanDialog({ accounts, onClose }: {
  readonly accounts: readonly V2Account[];
  readonly onClose: () => void;
}) {
  return <Dialog title="Kontoplan" onClose={onClose}>
    <table className="l2v2-account-plan">
      <thead><tr><th>Konto</th><th>Navn</th><th>Type</th></tr></thead>
      <tbody>{accounts.map(account => <tr key={account.accountNumber}>
        <td>{account.accountNumber}</td>
        <td>{account.name}</td>
        <td>{account.type === 'operating' ? 'Drift' : 'Balance'}</td>
      </tr>)}</tbody>
    </table>
  </Dialog>;
}
