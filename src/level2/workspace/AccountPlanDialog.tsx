import { LEVEL2_ACCOUNTS } from '../../domain/level2';
import { Dialog } from '../../ui/Dialog';

export function AccountPlanDialog({ onClose }: { readonly onClose: () => void }) {
  return <Dialog title="Kontoplan – Niveau 2" onClose={onClose}>
    <ul className="l2-account-plan">
      {LEVEL2_ACCOUNTS.map(account => <li key={account.accountNumber}>
        <strong>{account.accountNumber}</strong><span>{account.name}</span>
        <small>{account.type === 'operating' ? 'Drift' : 'Balance'}</small>
      </li>)}
    </ul>
  </Dialog>;
}
