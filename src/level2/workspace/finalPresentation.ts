import type { AccountBalance } from '../../domain/level2';
import {
  FINAL_CONTROL_ITEM_IDS,
  FINAL_CONTROL_REASON_IDS,
  selectFinalControlBalances,
  type FinalControlItemId,
  type FinalControlReasonId,
  type Level2StateCase,
} from '../state';
import { FINAL_REASON_LABELS } from './checkpointPresentation';

export const FINAL_ITEM_LABELS: Readonly<Record<FinalControlItemId, string>> = Object.freeze({
  aTax: 'Skyldig A-skat',
  amContribution: 'Skyldig AM-bidrag',
  pension: 'Skyldig pension',
  holidayPay: 'Skyldige nettoferiepenge – FerieKonto',
  atp: 'Skyldig ATP',
  holidayLiability: 'Feriepengeforpligtelse',
});

export const FINAL_REASON_OPTIONS: readonly { readonly id: FinalControlReasonId; readonly label: string }[] =
  Object.freeze(FINAL_CONTROL_REASON_IDS.map(id => Object.freeze({ id, label: FINAL_REASON_LABELS[id] })));

export interface FinalItemPresentation {
  readonly itemId: FinalControlItemId;
  readonly label: string;
  readonly balance: AccountBalance;
}

export function presentFinalItems(snapshot: Level2StateCase): readonly FinalItemPresentation[] {
  const balances = selectFinalControlBalances(snapshot);
  return FINAL_CONTROL_ITEM_IDS.map(itemId => ({
    itemId,
    label: FINAL_ITEM_LABELS[itemId],
    balance: balances[itemId],
  }));
}
