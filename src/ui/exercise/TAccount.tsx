import { parseAmount, type EntrySide, type PayrollAccount } from '../../domain/payroll';
import type { AccountFieldState } from '../../session';

const SIDES: readonly { key: EntrySide; label: string }[] = [
  { key: 'debit', label: 'Debet' },
  { key: 'credit', label: 'Kredit' },
];

export function TAccount({
  account,
  fields,
  onEdit,
}: {
  account: PayrollAccount;
  fields: AccountFieldState;
  onEdit: (side: EntrySide, rawInput: string) => void;
}) {
  return <article className="t-account" data-account-id={account.id}>
    <header><div><strong>{account.id} {account.name}</strong><span>{account.type}</span></div></header>
    <div className="t-fields">
      {SIDES.map(({ key, label }) => {
        const field = fields[key];
        const parsed = parseAmount(field.rawInput);
        const invalidFormat = field.rawInput.trim() !== '' && !parsed.ok;
        const message = field.status === 'correct'
          ? '✓ Korrekt'
          : invalidFormat
            ? 'Ugyldigt beløb'
            : field.status === 'incorrect'
              ? 'Forkert – ret beløbet'
              : '';
        const messageId = `${account.id}-${key}-status`;
        return <div className={`t-field status-${field.status}`} key={key}>
          <label htmlFor={`${account.id}-${key}`}>{label}</label>
          <input
            id={`${account.id}-${key}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${account.id} ${account.name} – ${label}`}
            aria-invalid={invalidFormat || field.status === 'incorrect'}
            aria-describedby={message ? messageId : undefined}
            value={field.rawInput}
            disabled={field.locked}
            onChange={event => onEdit(key, event.target.value)}
          />
          <span id={messageId} className="field-status" aria-live="polite">{message}</span>
        </div>;
      })}
    </div>
  </article>;
}
