import { useState } from 'react';
import { LEVEL2_ACCOUNTS, type Level2Account } from '../../domain/level2';
import type { Level2PersistedSession } from '../session';
import { AccountHistoryDialog } from './AccountHistoryDialog';
import { formatLevel2Amount, formatLevel2Balance } from './format';
import { YtdSpecification } from './YtdSpecification';
import { selectApprovedHistory, selectCurrentAccountBalance, selectOpeningBalance } from './workspaceSelectors';

export function CheckpointReferencePanel({ session }: { readonly session: Level2PersistedSession }) {
  const [historyAccount, setHistoryAccount] = useState<Level2Account | null>(null);
  const state = session.studentState;

  return <aside className="l2-checkpoint-reference" aria-labelledby="checkpoint-reference-title">
    <header>
      <p className="eyebrow">AFSTEMNINGSGRUNDLAG</p>
      <h2 id="checkpoint-reference-title">Reference</h2>
      <p>Readonly. Oplysningerne overføres ikke til dine svar.</p>
    </header>
    <section className="l2-reference-section" aria-labelledby="checkpoint-ytd-title">
      <h3 id="checkpoint-ytd-title">ÅTD-specifikation</h3>
      <YtdSpecification snapshot={session.caseSnapshot} />
    </section>
    <section className="l2-reference-section" aria-labelledby="checkpoint-accounts-title">
      <h3 id="checkpoint-accounts-title">T-konti pr. 30/6</h3>
      <div className="l2-reference-accounts">
        {LEVEL2_ACCOUNTS.map(account => {
          const history = selectApprovedHistory(state, account.accountNumber);
          const recent = history.slice(-4);
          const balance = selectCurrentAccountBalance(session.caseSnapshot, state, account.accountNumber);
          return <article className="l2-reference-account" data-reference-account={account.accountNumber} key={account.accountNumber}>
            <header>
              <div><strong>{account.accountNumber}</strong><span>{account.type === 'operating' ? 'Drift' : 'Balance'}</span></div>
              <h4>{account.name}</h4>
              <p>Startsaldo <strong>{formatLevel2Balance(selectOpeningBalance(session.caseSnapshot, account.accountNumber))}</strong></p>
            </header>
            <div className="l2-reference-sides">
              {(['debit', 'credit'] as const).map(side => <div data-side={side} key={side}>
                <h5>{side === 'debit' ? 'Debet' : 'Kredit'}</h5>
                {recent.filter(row => row.side === side).map(row => <p key={row.documentId + '-' + row.rowId}>
                  <span>{row.documentId} · {row.text || 'Postering'}</span><strong>{formatLevel2Amount(row.amount)}</strong>
                </p>)}
              </div>)}
            </div>
            {history.length > 4 && <button type="button" onClick={() => setHistoryAccount(account)}>+ {history.length - 4} tidligere</button>}
            <footer><span>Saldo pr. 30/6</span><strong>{balance ? formatLevel2Balance(balance) : 'Kan ikke beregnes'}</strong></footer>
          </article>;
        })}
      </div>
    </section>
    {historyAccount && <AccountHistoryDialog
      account={historyAccount}
      snapshot={session.caseSnapshot}
      state={state}
      onClose={() => setHistoryAccount(null)}
    />}
  </aside>;
}
