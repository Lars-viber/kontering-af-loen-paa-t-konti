import { useState } from 'react';
import type {
  V2DocumentId,
  V2SourceCase,
} from '../../../domain/level2/v2';
import {
  selectV2CurrentDocument,
  selectV2DocumentGroup,
  type V2StudentState,
} from '../state';
import { V2AccountPlanDialog } from './AccountPlanDialog';
import { V2DocumentPanel } from './DocumentPanel';
import { V2TAccountCard } from './TAccountCard';
import type { Level2V2WorkspaceActions } from './types';
import {
  selectV2WorkspaceBalance,
  selectV2WorkspaceHistory,
  selectV2WorkspaceOpeningBalance,
} from './workspaceSelectors';

export function V2DocumentWorkspace({ source, state, actions, completedReview = false, hideProgress = false, onViewApprovedDocument }: {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly actions: Level2V2WorkspaceActions;
  readonly completedReview?: boolean;
  readonly hideProgress?: boolean;
  readonly onViewApprovedDocument?: (documentId: V2DocumentId) => void;
}) {
  const [accountPlanOpen, setAccountPlanOpen] = useState(false);
  const document = selectV2CurrentDocument(state);
  if (!document || state.currentDocumentId === null) return null;
  const reviewMode = completedReview || state.phase === 'documentReview';
  return <div className="l2v2-document-layout">
    <V2DocumentPanel
      source={source}
      state={state}
      onCheck={actions.checkDocument}
      onAdvance={actions.advanceDocument}
      onOpenAccountPlan={() => setAccountPlanOpen(true)}
      completedReview={completedReview}
      hideProgress={hideProgress}
      onViewApprovedDocument={onViewApprovedDocument}
    />
    <section className="l2v2-accounts" aria-label="T-konti">
      <div className="l2v2-account-grid">
        {source.accounts.map(account => {
          const allHistory = selectV2WorkspaceHistory(state, account.accountNumber);
          const previous = allHistory.filter(row => row.documentId !== state.currentDocumentId);
          return <V2TAccountCard
            key={account.accountNumber}
            account={account}
            opening={selectV2WorkspaceOpeningBalance(source.startBalances, account.accountNumber)}
            balance={selectV2WorkspaceBalance(source.startBalances, state, account.accountNumber)}
            activeRows={document.rows.filter(row => row.accountNumber === account.accountNumber)}
            history={previous}
            groups={{
              debit: selectV2DocumentGroup(state, account.accountNumber, 'debit'),
              credit: selectV2DocumentGroup(state, account.accountNumber, 'credit'),
            }}
            reviewMode={reviewMode}
            onAdd={side => actions.addPosting(account.accountNumber, side)}
            onEdit={actions.editPosting}
            onRemove={actions.removePosting}
          />;
        })}
      </div>
    </section>
    {accountPlanOpen && <V2AccountPlanDialog accounts={source.accounts} onClose={() => setAccountPlanOpen(false)} />}
  </div>;
}
