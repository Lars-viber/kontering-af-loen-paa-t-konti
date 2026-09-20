import { useState } from 'react';
import type { V2Account, V2SourceCase } from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';
import { V2AccountHistoryDialog } from './AccountHistoryDialog';
import { formatV2WorkspaceAmount, formatV2WorkspaceBalance } from './format';
import {
  groupV2WorkspaceTallies,
  selectV2WorkspaceControls,
} from './presentation';
import {
  selectV2WorkspaceBalance,
  selectV2WorkspaceHistory,
  selectV2WorkspaceOpeningBalance,
} from './workspaceSelectors';

function TallyGroup({ title, items }: {
  readonly title: string;
  readonly items: ReturnType<typeof groupV2WorkspaceTallies>['hourly'];
}) {
  return <section className="l2v2-tally-group">
    <h4>{title}</h4>
    <dl>{items.map(item => <div key={item.id}>
      <dt>{item.presentationLabel}</dt><dd>{formatV2WorkspaceAmount(item.amount)}</dd>
    </div>)}</dl>
  </section>;
}

export function V2CheckpointReferencePanel({ source, state }: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
}) {
  const [historyAccount, setHistoryAccount] = useState<V2Account | null>(null);
  const tallies = groupV2WorkspaceTallies(source);
  const controls = selectV2WorkspaceControls(source);
  return <aside className="l2v2-checkpoint-reference" aria-labelledby="l2v2-reference-title">
    <header>
      <p className="l2v2-eyebrow">AFSTEMNINGSGRUNDLAG</p>
      <h2 id="l2v2-reference-title">Reference pr. 30/6</h2>
      <p>Readonly. Oplysningerne overføres ikke til dine svar.</p>
    </header>
    <section className="l2v2-reference-section" aria-labelledby="l2v2-tallies-title">
      <h3 id="l2v2-tallies-title">A. Lønsystemets tælleværker pr. 30/6</h3>
      <TallyGroup title="TIMELØNNEDE" items={tallies.hourly} />
      <TallyGroup title="MÅNEDSLØNNEDE" items={tallies.salaried} />
      <TallyGroup title="FERIEPENGEFORPLIGTELSE" items={tallies.holiday} />
    </section>
    <section className="l2v2-reference-section" aria-labelledby="l2v2-controls-title">
      <h3 id="l2v2-controls-title">B. Eksterne kontroloplysninger pr. 30/6</h3>
      <dl className="l2v2-control-list">{controls.map(control => <div key={control.id}>
        <dt>{control.presentationLabel}</dt><dd>{formatV2WorkspaceAmount(control.amount)}</dd>
      </div>)}</dl>
    </section>
    <section className="l2v2-reference-section" aria-labelledby="l2v2-reference-accounts-title">
      <h3 id="l2v2-reference-accounts-title">C. Alle 13 T-konti pr. 30/6</h3>
      <div className="l2v2-reference-accounts">
        {source.accounts.map(account => {
          const history = selectV2WorkspaceHistory(state, account.accountNumber);
          const recent = history.slice(-4);
          const balance = selectV2WorkspaceBalance(source.startBalances, state, account.accountNumber);
          return <article className="l2v2-reference-account" data-reference-account={account.accountNumber} key={account.accountNumber}>
            <header>
              <div><strong>{account.accountNumber}</strong><span>{account.type === 'operating' ? 'Drift' : 'Balance'}</span></div>
              <h4>{account.name}</h4>
              <p>Startsaldo <strong>{formatV2WorkspaceBalance(selectV2WorkspaceOpeningBalance(source.startBalances, account.accountNumber))}</strong></p>
            </header>
            <div className="l2v2-reference-sides">
              {(['debit', 'credit'] as const).map(side => <div data-side={side} key={side}>
                <h5>{side === 'debit' ? 'Debet' : 'Kredit'}</h5>
                {recent.filter(row => row.side === side).map(row => <p key={row.documentId + '-' + row.rowId}>
                  <span>{row.documentId} · {row.text || 'Postering'}</span>
                  <strong>{formatV2WorkspaceAmount(row.amount)}</strong>
                </p>)}
              </div>)}
            </div>
            {history.length > 4 && <button type="button" onClick={() => setHistoryAccount(account)}>
              + {history.length - 4} tidligere
            </button>}
            <footer><span>Saldo pr. 30/6</span><strong>{formatV2WorkspaceBalance(balance)}</strong></footer>
          </article>;
        })}
      </div>
    </section>
    {historyAccount && <V2AccountHistoryDialog
      account={historyAccount}
      openingBalances={source.startBalances}
      state={state}
      onClose={() => setHistoryAccount(null)}
    />}
  </aside>;
}
