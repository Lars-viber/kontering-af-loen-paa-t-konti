import type {
  AccountBalance,
  Level2AccountNumber,
  Level2Checkpoint,
  Level2Document,
  Level2DocumentId,
  Level2YtdSpecification,
  PostingSide,
} from '../../domain/level2';

export type GradingStatus = 'unchecked' | 'incorrect' | 'correct';
export type DocumentStatus = 'pending' | 'active' | 'completed';
export type BalanceState = 'none' | 'balanced' | 'unbalanced';

export type StudentPhase =
  | { readonly kind: 'document'; readonly activeDocumentId: Level2DocumentId }
  | { readonly kind: 'checkpoint' }
  | { readonly kind: 'finalControl' }
  | { readonly kind: 'completed' };

export interface StudentPostingRow {
  readonly rowId: number;
  readonly documentId: Level2DocumentId;
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly rawAmount: string;
  readonly text: string;
}

export type GroupIssue = 'missing' | 'invalid' | 'incorrectSum' | 'unexpected';

export interface DocumentGroupState {
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly status: GradingStatus;
  readonly issue?: GroupIssue;
}

export interface StudentDocumentState {
  readonly documentId: Level2DocumentId;
  readonly status: DocumentStatus;
  readonly rows: readonly StudentPostingRow[];
  readonly groups: readonly DocumentGroupState[];
}

export interface GrossPayrollCheckpointValues {
  readonly wageAccount: string;
  readonly employeePension: string;
  readonly employeeAtp: string;
  readonly grossPayroll: string;
}

export interface OtherPayrollCheckpointValues {
  readonly employerPension: string;
  readonly employerAtp: string;
  readonly hourlyHolidayPay: string;
  readonly holidayLiabilityAdjustment: string;
}

export interface TotalCheckpointValues {
  readonly operatingTotal: string;
}

export const CHECKPOINT_BALANCE_ACCOUNTS = [
  '6920', '6930', '6922', '6921', '6923', '6924',
] as const satisfies readonly Level2AccountNumber[];

export type CheckpointBalanceAccount = typeof CHECKPOINT_BALANCE_ACCOUNTS[number];
export type CheckpointBalanceSide = PostingSide | 'zero' | 'blank';

export interface CheckpointBalanceInput {
  readonly accountNumber: CheckpointBalanceAccount;
  readonly rawAmount: string;
  readonly side: CheckpointBalanceSide;
}

export interface AmountCheckpointSection<TValues> {
  readonly status: GradingStatus;
  readonly values: TValues;
}

export interface CheckpointState {
  readonly A: AmountCheckpointSection<GrossPayrollCheckpointValues>;
  readonly B: AmountCheckpointSection<GrossPayrollCheckpointValues>;
  readonly C: AmountCheckpointSection<OtherPayrollCheckpointValues>;
  readonly D: AmountCheckpointSection<TotalCheckpointValues>;
  readonly E: {
    readonly status: GradingStatus;
    readonly balances: readonly CheckpointBalanceInput[];
  };
}

export type CheckpointSectionId = keyof CheckpointState;
export type AmountCheckpointSectionId = 'A' | 'B' | 'C' | 'D';
export type CheckpointAmountField =
  | keyof GrossPayrollCheckpointValues
  | keyof OtherPayrollCheckpointValues
  | keyof TotalCheckpointValues;

export const FINAL_CONTROL_ITEM_IDS = [
  'aTax', 'amContribution', 'pension', 'holidayPay', 'atp', 'holidayLiability',
] as const;

export type FinalControlItemId = typeof FINAL_CONTROL_ITEM_IDS[number];

export const FINAL_CONTROL_REASON_IDS = [
  'aTaxJunePaid',
  'amJunePaid',
  'pensionJunePaid',
  'holidayPayJunePaid',
  'atpQ1PaidQ2Outstanding',
  'holidayLiabilityRemains',
] as const;

export type FinalControlReasonId = typeof FINAL_CONTROL_REASON_IDS[number];

export interface FinalControlItemState {
  readonly itemId: FinalControlItemId;
  readonly selectedReasonId: FinalControlReasonId | null;
  readonly status: GradingStatus;
}

export interface FinalControlState {
  readonly items: readonly FinalControlItemState[];
}

export interface Level2StudentState {
  readonly phase: StudentPhase;
  readonly documents: readonly StudentDocumentState[];
  readonly nextRowId: number;
  readonly checkpoint: CheckpointState;
  readonly finalControl: FinalControlState;
  readonly completed: boolean;
}

export interface Level2StateCaseData {
  readonly documents: readonly Level2Document[];
  readonly checkpointBalances: readonly AccountBalance[];
  readonly ytdSpecification: Level2YtdSpecification;
  readonly checkpoint: Level2Checkpoint;
  readonly finalBalances: readonly AccountBalance[];
}

export type Level2StateCase =
  | Level2StateCaseData
  | { readonly derived: Level2StateCaseData };

export interface StudentSideTotal {
  readonly total: number | null;
  readonly hasInvalidInput: boolean;
}

export interface StudentDocumentTotals {
  readonly debit: StudentSideTotal;
  readonly credit: StudentSideTotal;
  readonly balanceState: BalanceState;
}
