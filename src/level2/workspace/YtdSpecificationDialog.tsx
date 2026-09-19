import { Dialog } from '../../ui/Dialog';
import type { Level2CaseSnapshot } from '../session';
import { formatLevel2Amount } from './format';
import { presentYtdSpecification, type YtdSpecificationRow } from './checkpointPresentation';

function Specification({
  title, rows, total,
}: {
  readonly title: string;
  readonly rows: readonly YtdSpecificationRow[];
  readonly total: number;
}) {
  return <section className="l2-ytd-section">
    <h3>{title}</h3>
    <dl>
      {rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{formatLevel2Amount(row.amount)}</dd></div>)}
      <div className="total"><dt>Total</dt><dd>{formatLevel2Amount(total)}</dd></div>
    </dl>
  </section>;
}

export function YtdSpecificationDialog({
  snapshot, onClose,
}: {
  readonly snapshot: Level2CaseSnapshot;
  readonly onClose: () => void;
}) {
  const presentation = presentYtdSpecification(snapshot);
  return <Dialog title="ÅTD-specifikation" onClose={onClose}>
    <p className="l2-dialog-intro">Readonly afstemningsgrundlag. Tallene overføres ikke til dine svar.</p>
    <div className="l2-ytd-grid">
      <Specification title="Pensioner" rows={presentation.pension} total={presentation.pensionTotal} />
      <Specification title="ATP" rows={presentation.atp} total={presentation.atpTotal} />
    </div>
  </Dialog>;
}
