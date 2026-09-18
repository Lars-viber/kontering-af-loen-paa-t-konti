import type { PayslipTotals } from '../../domain/payroll';
import { formatAmount } from '../formatAmount';

const rows: readonly { key: keyof PayslipTotals; label: string; negative?: boolean }[] = [
  { key: 'grossSalary', label: 'Bruttoløn' },
  { key: 'atp', label: 'ATP', negative: true },
  { key: 'pension', label: 'Pension', negative: true },
  { key: 'amBase', label: 'Bruttoløn efter pensioner (AM-grundlag)' },
  { key: 'amContribution', label: 'AM-bidrag, afrundet', negative: true },
  { key: 'aTax', label: 'A-skat', negative: true },
  { key: 'netPay', label: 'Nettoløn' },
];

export function PayslipCard({ totals, employeeCount }: { totals: PayslipTotals; employeeCount: number }) {
  return <section className="exercise-card payslip-card" aria-labelledby="payslip-heading">
    <div className="card-heading">
      <div><p className="eyebrow">OPGAVEGRUNDLAG</p><h2 id="payslip-heading">Lønbilag</h2></div>
      <span>Alle beløb i kr.</span>
    </div>
    <p className="card-intro" role="heading" aria-level={3} aria-label={`Samlebilag for ${employeeCount} medarbejdere`}>
      Samlebilag for månedsløn, {employeeCount} medarbejdere.
    </p>
    <dl className="payslip-lines">
      {rows.map(row => <div key={row.key} className={row.key === 'netPay' ? 'payslip-total' : undefined}>
        <dt>{row.label}</dt>
        <dd>{row.negative ? '−' : ''}{formatAmount(totals[row.key])}</dd>
      </div>)}
    </dl>
  </section>;
}
