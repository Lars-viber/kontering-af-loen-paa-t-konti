import type { AccountId, EntrySide } from '../../domain/payroll';
import type { PayrollSession } from '../../session';
import { calculateDisplayTotals, hasStudentProgress } from '../../session/exercise';
import { AccountPlan } from './AccountPlan';
import { PayslipCard } from './PayslipCard';
import { StudentTotals } from './StudentTotals';
import { TAccount } from './TAccount';
import { VideoGuide } from './VideoGuide';

export function ExerciseView({
  session,
  onEdit,
  onCheck,
  onRequestReset,
  onOpenCompleted,
  onGoMenu,
  onGenerate,
}: {
  session: PayrollSession;
  onEdit: (accountId: AccountId, side: EntrySide, rawInput: string) => void;
  onCheck: () => void;
  onRequestReset: () => void;
  onOpenCompleted: () => void;
  onGoMenu: () => void;
  onGenerate: () => void;
}) {
  const totals = calculateDisplayTotals(session.studentState);
  const canReset = hasStudentProgress(session.studentState);

  return <main className="exercise-view">
    <section className="exercise-intro">
      <p className="eyebrow">LØNBOGFØRING · DOBBELT BOGFØRING</p>
      <p>Læs lønbilaget og kontér lønnen på T-kontiene fra kontoplanen. Alle beløb skal indsættes på den rigtige side. Tryk <strong>Kontrollér</strong>, når du vil kontrollere dine svar.</p>
    </section>

    <div className="exercise-top">
      <PayslipCard totals={session.exerciseSnapshot.payslipTotals} employeeCount={session.exerciseSnapshot.employeeCount} />
      <AccountPlan accounts={session.exerciseSnapshot.accounts} />
    </div>

    <VideoGuide />

    <section className="accounts-section" aria-labelledby="accounts-heading">
      <div className="section-heading"><div><p className="eyebrow">DIN BESVARELSE</p><h2 id="accounts-heading">T-konti</h2></div><span>Indtast hele kroner</span></div>
      <div className="t-account-grid">
        {session.exerciseSnapshot.accounts.map(account => <TAccount
          key={account.id}
          account={account}
          fields={session.studentState[account.id]}
          onEdit={(side, rawInput) => onEdit(account.id, side, rawInput)}
        />)}
      </div>
    </section>

    <StudentTotals totals={totals} />

    {session.completed ? <section className="completion-message completion-panel" role="status">
      <div><strong>Lønkonteringen er korrekt</strong><p>Alle posteringer er korrekt konteret.</p><p>Alle T-konti er nu låste.</p></div>
      <div className="completion-actions">
        <button type="button" className="primary" onClick={onOpenCompleted}>Se afsluttet opgave</button>
        <button type="button" onClick={onGoMenu}>Til hovedmenu</button>
        <button type="button" onClick={onGenerate}>Generér ny opgave</button>
      </div>
    </section> : <div className="exercise-controls">
      <button type="button" onClick={onRequestReset} disabled={!canReset}>Nulstil svar</button>
      <button type="button" className="primary" onClick={onCheck}>Kontrollér</button>
    </div>}
  </main>;
}
