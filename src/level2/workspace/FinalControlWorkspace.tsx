import type { Level2SaveStatus } from '../controller';
import type { Level2PersistedSession } from '../session';
import {
  checkFinalControlItem,
  selectFinalControlReason,
  type FinalControlItemId,
  type FinalControlReasonId,
  type Level2StudentState,
} from '../state';
import { FINAL_REASON_LABELS } from './checkpointPresentation';
import { FINAL_REASON_OPTIONS, presentFinalItems } from './finalPresentation';
import { formatLevel2Balance } from './format';
import { WorkspaceSaveStatus } from './WorkspaceSaveStatus';

export function FinalControlWorkspace({
  session, saveStatus, onStudentStateChange, onRetrySave, onGoHome,
}: {
  readonly session: Level2PersistedSession;
  readonly saveStatus: Level2SaveStatus;
  readonly onStudentStateChange: (next: Level2StudentState) => void;
  readonly onRetrySave: () => void;
  readonly onGoHome: () => void;
}) {
  const state = session.studentState;
  const presentation = presentFinalItems(session.caseSnapshot);
  const apply = (next: Level2StudentState) => onStudentStateChange(next);
  const selectReason = (itemId: FinalControlItemId, reasonId: FinalControlReasonId) =>
    apply(selectFinalControlReason(state, itemId, reasonId));
  const check = (itemId: FinalControlItemId) => apply(checkFinalControlItem(state, itemId));
  const correctCount = state.finalControl.items.filter(item => item.status === 'correct').length;

  return <main className="l2-phase-workspace l2-final-workspace">
    <button type="button" className="l2-main-home" onClick={onGoHome}>Til forsiden</button>
    <WorkspaceSaveStatus status={saveStatus} onRetry={onRetrySave} />
    <header className="l2-phase-intro">
      <div><p className="eyebrow">NIVEAU 2 · SLUTKONTROL</p><h1>Slutkontrol</h1>
        <p>Forklar hvorfor de afsluttende saldi ser sådan ud.</p></div>
      <div className="l2-phase-progress"><strong>{correctCount} af 6 korrekte</strong></div>
    </header>
    <div className="l2-final-grid">
      {presentation.map(item => {
        const studentItem = state.finalControl.items.find(candidate => candidate.itemId === item.itemId);
        if (!studentItem) return null;
        const locked = studentItem.status === 'correct';
        return <section className={'l2-final-item status-' + studentItem.status} key={item.itemId}>
          <header><h2>{item.label}</h2><strong>{formatLevel2Balance(item.balance)}</strong></header>
          {locked
            ? <p className="l2-final-reason">{studentItem.selectedReasonId ? FINAL_REASON_LABELS[studentItem.selectedReasonId] : ''}</p>
            : <div className="l2-final-control">
              <label htmlFor={'final-reason-' + item.itemId}>Vælg forklaring</label>
              <select
                id={'final-reason-' + item.itemId}
                value={studentItem.selectedReasonId ?? ''}
                onChange={event => selectReason(item.itemId, event.target.value as FinalControlReasonId)}
              >
                <option value="" disabled>Vælg forklaring</option>
                {FINAL_REASON_OPTIONS.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}
              </select>
            </div>}
          {locked && <p className="l2-section-status correct">✓ Korrekt</p>}
          {studentItem.status === 'incorrect' && <p className="l2-section-feedback" role="status">Vælg en anden forklaring.</p>}
          {!locked && <button type="button" className="primary l2-section-check" onClick={() => check(item.itemId)}>
            Kontrollér {item.label}
          </button>}
        </section>;
      })}
    </div>
  </main>;
}
