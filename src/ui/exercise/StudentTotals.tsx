import type { DisplayTotals } from '../../session/exercise';
import { formatAmount } from '../formatAmount';

function shown(value: number | null): string {
  return value === null ? '—' : formatAmount(value);
}

export function StudentTotals({ totals }: { totals: DisplayTotals }) {
  const status = totals.status === 'balanced' ? 'Balancerer' : totals.status === 'unbalanced' ? 'Balancerer ikke' : '';
  return <section className="student-totals" aria-labelledby="student-totals-heading">
    <div><h2 id="student-totals-heading">Elevens posteringer</h2><p>Balancerer betyder kun, at Debet og Kredit er lige store.</p></div>
    <dl>
      <div><dt>Debet i alt</dt><dd>{shown(totals.debit)}</dd></div>
      <div><dt>Kredit i alt</dt><dd>{shown(totals.credit)}</dd></div>
    </dl>
    {totals.status === 'invalid'
      ? <p className="totals-message invalid-total" role="status">Ret ugyldige beløb for at beregne totalen.</p>
      : status && <p className={`totals-message ${totals.status}`} role="status">{status}</p>}
  </section>;
}

