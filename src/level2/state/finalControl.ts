import { freezeStudentState } from './stateUtils';
import {
  FINAL_CONTROL_ITEM_IDS,
  type FinalControlItemId,
  type FinalControlReasonId,
  type FinalControlState,
  type Level2StudentState,
} from './types';

export const FINAL_CONTROL_EXPECTED_REASONS: Readonly<Record<FinalControlItemId, FinalControlReasonId>> = Object.freeze({
  aTax: 'aTaxJunePaid',
  amContribution: 'amJunePaid',
  pension: 'pensionJunePaid',
  holidayPay: 'holidayPayJunePaid',
  atp: 'atpQ1PaidQ2Outstanding',
  holidayLiability: 'holidayLiabilityRemains',
});

export function createEmptyFinalControlState(): FinalControlState {
  return {
    items: FINAL_CONTROL_ITEM_IDS.map(itemId => ({
      itemId,
      selectedReasonId: null,
      status: 'unchecked',
    })),
  };
}

export function selectFinalControlReason(
  state: Level2StudentState,
  itemId: FinalControlItemId,
  reasonId: FinalControlReasonId,
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'finalControl') return state;
  const item = state.finalControl.items.find(candidate => candidate.itemId === itemId);
  if (!item || item.status === 'correct') return state;
  return freezeStudentState({
    ...state,
    finalControl: {
      items: state.finalControl.items.map(candidate => candidate.itemId === itemId ? {
        ...candidate,
        selectedReasonId: reasonId,
        status: candidate.status === 'incorrect' ? 'unchecked' as const : candidate.status,
      } : candidate),
    },
  });
}

export function checkFinalControlItem(
  state: Level2StudentState,
  itemId: FinalControlItemId,
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'finalControl') return state;
  const item = state.finalControl.items.find(candidate => candidate.itemId === itemId);
  if (!item || item.status === 'correct') return state;
  const correct = item.selectedReasonId === FINAL_CONTROL_EXPECTED_REASONS[itemId];
  const finalControl: FinalControlState = {
    items: state.finalControl.items.map(candidate => candidate.itemId === itemId ? {
      ...candidate,
      status: correct ? 'correct' as const : 'incorrect' as const,
    } : candidate),
  };
  if (correct && finalControl.items.every(candidate => candidate.status === 'correct')) {
    return freezeStudentState({
      ...state,
      finalControl,
      phase: { kind: 'completed' },
      completed: true,
    });
  }
  return freezeStudentState({ ...state, finalControl });
}
