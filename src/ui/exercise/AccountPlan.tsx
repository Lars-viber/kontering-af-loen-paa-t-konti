import type { PayrollAccount } from '../../domain/payroll';

export function AccountPlan({ accounts }: { accounts: readonly PayrollAccount[] }) {
  return <section className="exercise-card account-plan" aria-labelledby="account-plan-heading">
    <div className="card-heading"><div><p className="eyebrow">HJÆLP</p><h2 id="account-plan-heading">Kontoplan</h2></div></div>
    <ol>
      {accounts.map(account => <li key={account.id}>
        <strong>{account.id} {account.name}</strong><span>{account.type}</span>
      </li>)}
    </ol>
  </section>;
}
