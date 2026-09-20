import type { V2SourceCase } from '../../../domain/level2/v2';
import { selectAllV2StudentDerivedBalances, type V2StudentState } from '../state';
import { formatV2WorkspaceBalance } from './format';
import { V2Progress } from './Progress';

export function V2CompletedView({ variant, source, state }: {
  readonly variant: number;
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
}) {
  const balances = selectAllV2StudentDerivedBalances(source.startBalances, state);
  return <div className="l2v2-completed-view">
    <V2Progress state={state} />
    <section className="l2v2-completed-panel">
      <div className="l2v2-completed-heading">
        <span aria-hidden="true">✓</span>
        <div>
          <p className="l2v2-eyebrow">AFSLUTTET OPGAVE · VARIANT {variant}</p>
          <h1>Niveau 2 gennemført</h1>
          <p>Du har bogført juni og afstemt bogføringen pr. 30/6 mod lønsystemets tælleværker.</p>
          <p><strong>9 af 9 bilag gennemført · Afstemning ✓</strong></p>
        </div>
      </div>
      <h2>Slutoversigt pr. 30/6</h2>
      <dl className="l2v2-completed-balances">
        {source.accounts.map(account => {
          const balance = balances.find(item => item.accountNumber === account.accountNumber);
          if (!balance) return null;
          return <div key={account.accountNumber}>
            <dt><strong>{account.accountNumber}</strong> {account.name}</dt>
            <dd>{formatV2WorkspaceBalance(balance)}</dd>
          </div>;
        })}
      </dl>
    </section>
  </div>;
}
