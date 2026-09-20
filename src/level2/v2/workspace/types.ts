import type {
  V2AccountNumber,
  V2PostingSide,
  V2SourceCase,
} from '../../../domain/level2/v2';
import type { V2ControllerSaveStatus } from '../controller';
import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2CheckpointBalanceAccount,
  V2CheckpointBalanceSide,
  V2CheckpointSectionId,
  V2PostingRowChanges,
  V2StudentState,
} from '../state';

export interface Level2V2WorkspaceActions {
  readonly addPosting: (
    accountNumber: V2AccountNumber,
    side: V2PostingSide,
    rawAmount?: string,
    text?: string,
  ) => void;
  readonly editPosting: (rowId: number, changes: V2PostingRowChanges) => void;
  readonly removePosting: (rowId: number) => void;
  readonly checkDocument: () => void;
  readonly advanceDocument: () => void;
  readonly editCheckpointAmount: (
    sectionId: V2AmountCheckpointSectionId,
    field: V2CheckpointAmountField,
    rawAmount: string,
  ) => void;
  readonly editCheckpointBalance: (
    accountNumber: V2CheckpointBalanceAccount,
    changes: { readonly rawAmount?: string; readonly side?: V2CheckpointBalanceSide },
  ) => void;
  readonly checkCheckpointSection: (sectionId: V2CheckpointSectionId) => void;
  readonly complete: () => void;
  readonly retrySave: () => void;
}

export interface Level2V2WorkspaceProps {
  readonly variant: number;
  readonly source: V2SourceCase;
  readonly studentState: V2StudentState;
  readonly saveStatus: V2ControllerSaveStatus;
  readonly actions: Level2V2WorkspaceActions;
  readonly onGoHome?: () => void;
}
