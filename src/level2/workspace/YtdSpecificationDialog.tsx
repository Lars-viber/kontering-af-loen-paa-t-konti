import { Dialog } from '../../ui/Dialog';
import type { Level2CaseSnapshot } from '../session';
import { YtdSpecification } from './YtdSpecification';

export function YtdSpecificationDialog({
  snapshot, onClose,
}: {
  readonly snapshot: Level2CaseSnapshot;
  readonly onClose: () => void;
}) {
  return <Dialog title="ÅTD-specifikation" onClose={onClose}>
    <p className="l2-dialog-intro">Readonly afstemningsgrundlag. Tallene overføres ikke til dine svar.</p>
    <YtdSpecification snapshot={snapshot} />
  </Dialog>;
}
