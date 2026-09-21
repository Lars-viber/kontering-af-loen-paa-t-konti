import type {
  V2AccountNumber,
  V2DocumentId,
  V2PostingSide,
} from '../../../domain/level2/v2';

export const V2_STUDENT_PHASES = [
  'documentEntry',
  'documentReview',
  'checkpoint',
  'checkpointReview',
  'completed',
] as const;

export type V2StudentPhase = typeof V2_STUDENT_PHASES[number];
export type V2GradingStatus = 'unchecked' | 'incorrect' | 'correct';
export type V2DocumentStatus = 'pending' | 'active' | 'completed';
export type V2GroupIssue = 'missing' | 'invalid' | 'incorrectSum' | 'unexpected';

export interface V2StudentPostingRow {
  readonly rowId: number;
  readonly documentId: V2DocumentId;
  readonly accountNumber: V2AccountNumber;
  readonly side: V2PostingSide;
  readonly rawAmount: string;
  readonly text: string;
}

export interface V2DocumentGroupState {
  readonly accountNumber: V2AccountNumber;
  readonly side: V2PostingSide;
  readonly status: V2GradingStatus;
  readonly issue?: V2GroupIssue;
}

export interface V2StudentDocumentState {
  readonly documentId: V2DocumentId;
  readonly status: V2DocumentStatus;
  readonly rows: readonly V2StudentPostingRow[];
  readonly groups: readonly V2DocumentGroupState[];
}

export interface V2GrossCheckpointValues {
  readonly wageAccountYtd: string;
  readonly employeePensionYtd: string;
  readonly employeeAtpYtd: string;
  readonly calculatedGrossPayYtd: string;
}

export interface V2OtherCostCheckpointValues {
  readonly pensionBookBalance: string;
  readonly hourlyEmployeePensionYtd: string;
  readonly hourlyEmployerPensionYtd: string;
  readonly salariedEmployeePensionYtd: string;
  readonly salariedEmployerPensionYtd: string;
  readonly atpBookBalance: string;
  readonly hourlyEmployeeAtpYtd: string;
  readonly hourlyEmployerAtpYtd: string;
  readonly salariedEmployeeAtpYtd: string;
  readonly salariedEmployerAtpYtd: string;
  readonly holidayPayBookBalance: string;
  readonly holidayPayGrossYtd: string;
}

export interface V2TotalCheckpointValues {
  readonly operatingTotal: string;
}

export const V2_CHECKPOINT_BALANCE_ACCOUNTS = [
  '6920', '6930', '6922', '6921', '6923', '6924',
] as const satisfies readonly V2AccountNumber[];

export type V2CheckpointBalanceAccount = typeof V2_CHECKPOINT_BALANCE_ACCOUNTS[number];
export type V2CheckpointBalanceSide = 'D' | 'K' | 'blank';

export interface V2CheckpointBalanceInput {
  readonly accountNumber: V2CheckpointBalanceAccount;
  readonly rawAmount: string;
  readonly side: V2CheckpointBalanceSide;
}

export interface V2AmountCheckpointSection<TValues> {
  readonly status: V2GradingStatus;
  readonly values: TValues;
}

export interface V2CheckpointState {
  readonly A: V2AmountCheckpointSection<V2GrossCheckpointValues>;
  readonly B: V2AmountCheckpointSection<V2GrossCheckpointValues>;
  readonly C: V2AmountCheckpointSection<V2OtherCostCheckpointValues>;
  readonly D: V2AmountCheckpointSection<V2TotalCheckpointValues>;
  readonly E: {
    readonly status: V2GradingStatus;
    readonly balances: readonly V2CheckpointBalanceInput[];
  };
}

export type V2CheckpointSectionId = keyof V2CheckpointState;
export type V2AmountCheckpointSectionId = 'A' | 'B' | 'C' | 'D';
export type V2CheckpointAmountField =
  | keyof V2GrossCheckpointValues
  | keyof V2OtherCostCheckpointValues
  | keyof V2TotalCheckpointValues;

export interface V2StudentState {
  readonly phase: V2StudentPhase;
  readonly currentDocumentId: V2DocumentId | null;
  readonly documents: readonly V2StudentDocumentState[];
  readonly nextRowId: number;
  readonly checkpoint: V2CheckpointState;
}

export interface V2PostingRowChanges {
  readonly rawAmount?: string;
  readonly text?: string;
}

export interface V2StateProgress {
  readonly phase: V2StudentPhase;
  readonly currentDocumentId: V2DocumentId | null;
  readonly completedDocumentCount: number;
  readonly remainingDocumentCount: number;
}

export interface V2ApprovedRowFilter {
  readonly documentId?: V2DocumentId;
  readonly accountNumber?: V2AccountNumber;
  readonly side?: V2PostingSide;
}

export interface V2StudentSideTotal {
  readonly total: number | null;
  readonly hasInvalidInput: boolean;
}

export interface V2StudentDocumentTotals {
  readonly debit: V2StudentSideTotal;
  readonly credit: V2StudentSideTotal;
  readonly balanceState: 'none' | 'balanced' | 'unbalanced';
}
