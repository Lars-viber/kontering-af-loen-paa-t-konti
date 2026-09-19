import { useState } from 'react';
import { LEVEL2_ACCOUNTS, type Level2Account, type Level2AccountNumber, type PostingSide } from '../../domain/level2';
import type { Level2SaveStatus } from '../controller';
import type { Level2PersistedSession } from '../session';
import {
  addStudentPostingRow,
  checkActiveDocument,
  editStudentPostingRow,
  removeStudentPostingRow,
  selectActiveDocument,
  selectActiveDocumentTotals,
  selectDocumentGroup,
  type Level2StudentState,
} from '../state';
import { AccountHistoryDialog } from './AccountHistoryDialog';
import { AccountPlanDialog } from './AccountPlanDialog';
import { CheckpointWorkspace } from './CheckpointWorkspace';
import { DocumentPanel } from './DocumentPanel';
import { FinalControlWorkspace } from './FinalControlWorkspace';
import { Level2CompletedView } from './Level2CompletedView';
import { TAccountCard } from './TAccountCard';
import { VideoDialog } from './VideoDialog';
import { WorkspaceSaveStatus } from './WorkspaceSaveStatus';
import {
  selectApprovedHistory,
  selectCurrentAccountBalance,
  selectOpeningBalance,
} from './workspaceSelectors';

export interface Level2WorkspaceProps {
  readonly session: Level2PersistedSession;
  readonly saveStatus: Level2SaveStatus;
  readonly onStudentStateChange: (next: Level2StudentState) => void;
  readonly onRetrySave: () => void;
  readonly onGoHome: () => void;
}

export function Level2Workspace({
  session, saveStatus, onStudentStateChange, onRetrySave, onGoHome,
}: Level2WorkspaceProps) {
  const [accountPlanOpen, setAccountPlanOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<Level2Account | null>(null);
  const state = session.studentState;

  if (state.phase.kind === 'checkpoint') return <CheckpointWorkspace
    session={session}
    saveStatus={saveStatus}
    onStudentStateChange={onStudentStateChange}
    onRetrySave={onRetrySave}
    onGoHome={onGoHome}
  />;
  if (state.phase.kind === 'finalControl') return <FinalControlWorkspace
    session={session}
    saveStatus={saveStatus}
    onStudentStateChange={onStudentStateChange}
    onRetrySave={onRetrySave}
    onGoHome={onGoHome}
  />;
  if (state.phase.kind === 'completed') return <Level2CompletedView session={session} onGoHome={onGoHome} />;

  const active = selectActiveDocument(state);
  if (!active) return null;
  const activeId = state.phase.activeDocumentId;
  const approved = (accountNumber: Level2AccountNumber) =>
    selectApprovedHistory(state, accountNumber).filter(row => row.documentId !== activeId);
  const apply = (next: Level2StudentState) => onStudentStateChange(next);

  const add = (accountNumber: Level2AccountNumber, side: PostingSide) =>
    apply(addStudentPostingRow(state, accountNumber, side));
  const edit = (rowId: number, rawAmount: string) =>
    apply(editStudentPostingRow(state, rowId, { rawAmount }));
  const remove = (rowId: number) =>
    apply(removeStudentPostingRow(state, rowId));
  const check = () => apply(checkActiveDocument(session.caseSnapshot, state));

  return <main className="l2-workspace">
    <h2 className="sr-only">Niveau 2</h2>
    <button type="button" className="l2-main-home" onClick={onGoHome}>Til forsiden</button>
    <WorkspaceSaveStatus status={saveStatus} onRetry={onRetrySave} />
    <div className="l2-workspace-grid">
      <DocumentPanel
        snapshot={session.caseSnapshot}
        state={state}
        totals={selectActiveDocumentTotals(state)}
        onCheck={check}
        onOpenAccountPlan={() => setAccountPlanOpen(true)}
        onOpenVideo={() => setVideoOpen(true)}
      />
      <section className="l2-accounts" aria-label="T-konti">
        <div className="l2-account-grid">
          {LEVEL2_ACCOUNTS.map(account => {
            const history = approved(account.accountNumber);
            return <TAccountCard
              key={account.accountNumber}
              account={account}
              opening={selectOpeningBalance(session.caseSnapshot, account.accountNumber)}
              balance={selectCurrentAccountBalance(session.caseSnapshot, state, account.accountNumber)}
              activeRows={active.rows.filter(row => row.accountNumber === account.accountNumber)}
              history={history.slice(-3)}
              historyCount={history.length}
              groups={{
                debit: selectDocumentGroup(state, account.accountNumber, 'debit'),
                credit: selectDocumentGroup(state, account.accountNumber, 'credit'),
              }}
              onAdd={side => add(account.accountNumber, side)}
              onEdit={edit}
              onRemove={remove}
              onOpenHistory={() => setHistoryAccount(account)}
            />;
          })}
        </div>
      </section>
    </div>
    {accountPlanOpen && <AccountPlanDialog onClose={() => setAccountPlanOpen(false)} />}
    {videoOpen && <VideoDialog onClose={() => setVideoOpen(false)} />}
    {historyAccount && <AccountHistoryDialog
      account={historyAccount}
      snapshot={session.caseSnapshot}
      state={state}
      onClose={() => setHistoryAccount(null)}
    />}
  </main>;
}
