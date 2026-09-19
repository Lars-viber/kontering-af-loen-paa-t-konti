import type { Level2CaseSnapshot } from '../session';
import { presentYtdSpecification, type YtdSpecificationRow } from './checkpointPresentation';
import { formatLevel2Amount } from './format';

function Specification({ title, rows, total }: {
  readonly title: string;
  readonly rows: readonly YtdSpecificationRow[];
  readonly total: number;
}) {
  return <section className="l2-ytd-section">
    <h4>{title}</h4>
    <dl>
      {rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{formatLevel2Amount(row.amount)}</dd></div>)}
      <div className="total"><dt>Total</dt><dd>{formatLevel2Amount(total)}</dd></div>
    </dl>
  </section>;
}

export function YtdSpecification({ snapshot }: { readonly snapshot: Level2CaseSnapshot }) {
  const presentation = presentYtdSpecification(snapshot);
  return <div className="l2-ytd-grid">
    <Specification title="Pensioner" rows={presentation.pension} total={presentation.pensionTotal} />
    <Specification title="ATP" rows={presentation.atp} total={presentation.atpTotal} />
  </div>;
}
