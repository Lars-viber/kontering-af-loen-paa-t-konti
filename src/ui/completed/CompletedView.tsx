import type { PayrollSession } from '../../session';
import { calculateDisplayTotals } from '../../session/exercise';
import { AccountPlan } from '../exercise/AccountPlan';
import { PayslipCard } from '../exercise/PayslipCard';
import { StudentTotals } from '../exercise/StudentTotals';
import { ReadOnlyTAccount } from './ReadOnlyTAccount';

export function CompletedView({
  session,
  onGoMenu,
  onGenerate,
}: {
  session: PayrollSession;
  onGoMenu: () => void;
  onGenerate: () => void;
}) {
  const totals = calculateDisplayTotals(session.studentState);
  return <main className="exercise-view completed-view">
    <section className="completed-intro" aria-labelledby="completed-heading">
      <div><p className="eyebrow">AFSLUTTET OPGAVE</p><h2 id="completed-heading">Lønkonteringen er korrekt</h2><p>Alle posteringer er korrekt konteret.</p></div>
      <span aria-hidden="true">✓</span>
    </section>

    <div className="exercise-top">
      <PayslipCard totals={session.exerciseSnapshot.payslipTotals} employeeCount={session.exerciseSnapshot.employeeCount} />
      <AccountPlan accounts={session.exerciseSnapshot.accounts} />
    </div>

    <section className="accounts-section" aria-labelledby="completed-accounts-heading">
      <div className="section-heading"><div><p className="eyebrow">DIN FÆRDIGE KONTERING</p><h2 id="completed-accounts-heading">T-konti</h2></div><span>Read-only</span></div>
      <div className="t-account-grid">
        {session.exerciseSnapshot.accounts.map(account => <ReadOnlyTAccount
          key={account.id}
          account={account}
          fields={session.studentState[account.id]}
        />)}
      </div>
    </section>

    <StudentTotals totals={totals} />

    <div className="completed-actions">
      <button type="button" onClick={onGoMenu}>Til hovedmenu</button>
      <button type="button" className="primary" onClick={onGenerate}>Generér ny opgave</button>
    </div>
  </main>;
}
