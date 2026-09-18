import { parseAmount, type EntrySide, type PayrollAccount } from '../../domain/payroll';
import type { AccountFieldState } from '../../session';
import { formatAmount } from '../formatAmount';

const SIDES: readonly { key: EntrySide; label: string }[] = [
  { key: 'debit', label: 'Debet' },
  { key: 'credit', label: 'Kredit' },
];

function displayValue(rawInput: string): string {
  const parsed = parseAmount(rawInput);
  return parsed.ok && parsed.value > 0 ? formatAmount(parsed.value) : '–';
}

export function ReadOnlyTAccount({ account, fields }: { account: PayrollAccount; fields: AccountFieldState }) {
  return <article className="t-account completed-t-account" data-completed-account-id={account.id}>
    <header><div><strong>{account.id} {account.name}</strong><span>{account.type}</span></div></header>
    <div className="t-fields">
      {SIDES.map(({ key, label }) => <div className="readonly-t-field" key={key}>
        <span>{label}</span>
        <strong>{displayValue(fields[key].rawInput)}</strong>
      </div>)}
    </div>
  </article>;
}
