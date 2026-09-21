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
  const sameBookedLabel = rows.every(row => row.bookedLabel === first.bookedLabel);
  const sameReferenceLabel = rows.every(row => row.referenceLabel === first.referenceLabel);
  return <section className="l2v2-reconciliation" aria-label={label}>
    <table>
      <thead><tr>
        <th>Post</th>
        <th>{sameBookedLabel ? first.bookedLabel : 'Bogføring'}</th>
        <th>{sameReferenceLabel ? first.referenceLabel : 'Kontrolgrundlag'}</th>
        <th>Difference</th>
        <th>Status</th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.rowId}>
        <th scope="row">{row.label}</th>
        <td>{!sameBookedLabel && <span className="l2v2-reconciliation-source">{row.bookedLabel}</span>}{amount(row.bookedAmount)}</td>
        <td>{!sameReferenceLabel && <span className="l2v2-reconciliation-source">{row.referenceLabel}</span>}{amount(row.referenceAmount)}</td>
        <td>{amount(row.difference)}</td>
        <td className={row.matches ? 'l2v2-correct' : 'l2v2-incorrect'}>
          {row.matches ? '✓ Stemmer' : 'Afvigelse'}
        </td>
      </tr>)}</tbody>
    </table>
  </section>;
}
