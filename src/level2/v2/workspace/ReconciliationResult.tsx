import { formatV2WorkspaceAmount } from './format';
import type { V2WorkspaceComparisonRow } from './presentation';

function amount(value: number | null): string {
  return value === null ? '—' : formatV2WorkspaceAmount(value);
}

export function V2ReconciliationResult({ rows, label }: {
  readonly rows: readonly V2WorkspaceComparisonRow[];
  readonly label: string;
}) {
  if (rows.length === 0) return null;
  const first = rows[0];
  return <section className="l2v2-reconciliation" aria-label={label}>
    <table>
      <thead><tr>
        <th>Post</th>
        <th>{first.bookedLabel}</th>
        <th>{first.referenceLabel}</th>
        <th>Difference</th>
        <th>Status</th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.rowId}>
        <th scope="row">{row.label}</th>
        <td>{amount(row.bookedAmount)}</td>
        <td>{formatV2WorkspaceAmount(row.referenceAmount)}</td>
        <td>{amount(row.difference)}</td>
        <td className={row.matches ? 'l2v2-correct' : 'l2v2-incorrect'}>
          {row.matches ? '✓ Stemmer' : 'Afvigelse'}
        </td>
      </tr>)}</tbody>
    </table>
  </section>;
}
