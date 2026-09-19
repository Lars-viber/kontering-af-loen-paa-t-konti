import type { Level2PersistedSession } from '../session';
import { presentFinalItems } from './finalPresentation';
import { formatLevel2Balance } from './format';
import { Level2Progress } from './Level2Progress';

export function Level2CompletedView({
  session, onGoHome,
}: {
  readonly session: Level2PersistedSession;
  readonly onGoHome: () => void;
}) {
  const items = presentFinalItems(session.caseSnapshot);
  return <main className="l2-phase-workspace l2-completed-workspace">
    <button type="button" className="l2-main-home" onClick={onGoHome}>Til forsiden</button>
    <Level2Progress state={session.studentState} />
    <section className="l2-completed-panel">
      <div className="l2-completed-heading">
        <span aria-hidden="true">✓</span>
        <div><p className="eyebrow">AFSLUTTET OPGAVE · VARIANT {session.variant}</p>
          <h1>Niveau 2 gennemført</h1>
          <p>Du har gennemført bilagene, afstemningen pr. 30/6 og slutkontrollen.</p></div>
      </div>
      <dl className="l2-completed-balances">
        {items.map(item => <div key={item.itemId}><dt>{item.label}</dt><dd>{formatLevel2Balance(item.balance)}</dd></div>)}
      </dl>
    </section>
  </main>;
}
