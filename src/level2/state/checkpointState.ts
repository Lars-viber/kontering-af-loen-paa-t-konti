import type { Level2AccountNumber } from '../../domain/level2';
import { parseCheckpointAmount } from './amountParser';
import { getLevel2CaseData } from './case';
import { freezeStudentState } from './stateUtils';
import {
  CHECKPOINT_BALANCE_ACCOUNTS,
  type AmountCheckpointSectionId,
  type CheckpointAmountField,
  type CheckpointBalanceAccount,
  type CheckpointBalanceSide,
  type CheckpointSectionId,
  type CheckpointState,
  type GradingStatus,
  type Level2StateCase,
  type Level2StudentState,
} from './types';

const GROSS_FIELDS = ['wageAccount', 'employeePension', 'employeeAtp', 'grossPayroll'] as const;
const OTHER_FIELDS = ['employerPension', 'employerAtp', 'hourlyHolidayPay', 'holidayLiabilityAdjustment'] as const;

export function createEmptyCheckpointState(): CheckpointState {
  return {
    A: { status: 'unchecked', values: { wageAccount: '', employeePension: '', employeeAtp: '', grossPayroll: '' } },
    B: { status: 'unchecked', values: { wageAccount: '', employeePension: '', employeeAtp: '', grossPayroll: '' } },
    C: { status: 'unchecked', values: { employerPension: '', employerAtp: '', hourlyHolidayPay: '', holidayLiabilityAdjustment: '' } },
    D: { status: 'unchecked', values: { operatingTotal: '' } },
    E: {
      status: 'unchecked',
      balances: CHECKPOINT_BALANCE_ACCOUNTS.map(accountNumber => ({ accountNumber, rawAmount: '', side: 'blank' })),
    },
  };
}

function editedStatus(status: GradingStatus): GradingStatus {
  return status === 'incorrect' ? 'unchecked' : status;
}

export function editCheckpointAmount(
  state: Level2StudentState,
  sectionId: AmountCheckpointSectionId,
  field: CheckpointAmountField,
  rawAmount: string,
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'checkpoint') return state;
  const section = state.checkpoint[sectionId];
  if (section.status === 'correct') return state;

  let checkpoint: CheckpointState;
  if ((sectionId === 'A' || sectionId === 'B') && (GROSS_FIELDS as readonly string[]).includes(field)) {
    checkpoint = {
      ...state.checkpoint,
      [sectionId]: {
        status: editedStatus(section.status),
        values: { ...(sectionId === 'A' ? state.checkpoint.A.values : state.checkpoint.B.values), [field]: rawAmount },
      },
    };
  } else if (sectionId === 'C' && (OTHER_FIELDS as readonly string[]).includes(field)) {
    checkpoint = {
      ...state.checkpoint,
      C: {
        status: editedStatus(section.status),
        values: { ...state.checkpoint.C.values, [field]: rawAmount },
      },
    };
  } else if (sectionId === 'D' && field === 'operatingTotal') {
    checkpoint = {
      ...state.checkpoint,
      D: {
        status: editedStatus(section.status),
        values: { operatingTotal: rawAmount },
      },
    };
  } else {
    return state;
  }
  return freezeStudentState({ ...state, checkpoint });
}

export function editCheckpointBalance(
  state: Level2StudentState,
  accountNumber: CheckpointBalanceAccount,
  changes: { readonly rawAmount?: string; readonly side?: CheckpointBalanceSide },
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'checkpoint') return state;
  if (!(CHECKPOINT_BALANCE_ACCOUNTS as readonly string[]).includes(accountNumber)) {
    throw new RangeError('Unknown checkpoint account');
  }
  if (state.checkpoint.E.status === 'correct') return state;
  const checkpoint: CheckpointState = {
    ...state.checkpoint,
    E: {
      status: editedStatus(state.checkpoint.E.status),
      balances: state.checkpoint.E.balances.map(balance =>
        balance.accountNumber === accountNumber ? { ...balance, ...changes } : balance,
      ),
    },
  };
  return freezeStudentState({ ...state, checkpoint });
}

function amountFieldsCorrect(
  values: object,
  expected: object,
): boolean {
  const valueRecord = values as Record<string, string>;
  return Object.entries(expected as Record<string, number>).every(([field, expectedAmount]) => {
    const parsed = parseCheckpointAmount(valueRecord[field] ?? '');
    return parsed.kind === 'valid' && parsed.value === expectedAmount;
  });
}

function gradeCheckpointE(source: Level2StateCase, state: Level2StudentState): boolean {
  const caseData = getLevel2CaseData(source);
  return state.checkpoint.E.balances.every(input => {
    const expected = caseData.checkpointBalances.find(balance => balance.accountNumber === input.accountNumber);
    if (!expected) throw new Error('Missing checkpoint balance ' + input.accountNumber);
    const parsed = parseCheckpointAmount(input.rawAmount);
    return parsed.kind === 'valid' && parsed.value === expected.amount && input.side === expected.side;
  });
}

function allSectionsCorrect(checkpoint: CheckpointState): boolean {
  return (Object.keys(checkpoint) as CheckpointSectionId[])
    .every(sectionId => checkpoint[sectionId].status === 'correct');
}

export function checkCheckpointSection(
  source: Level2StateCase,
  state: Level2StudentState,
  sectionId: CheckpointSectionId,
): Level2StudentState {
  if (state.completed || state.phase.kind !== 'checkpoint') return state;
  if (state.checkpoint[sectionId].status === 'correct') return state;
  const caseData = getLevel2CaseData(source);

  let correct: boolean;
  if (sectionId === 'A') {
    correct = amountFieldsCorrect(state.checkpoint.A.values, caseData.checkpoint.hourlyGrossPayroll);
  } else if (sectionId === 'B') {
    correct = amountFieldsCorrect(state.checkpoint.B.values, caseData.checkpoint.salariedGrossPayroll);
  } else if (sectionId === 'C') {
    correct = amountFieldsCorrect(state.checkpoint.C.values, caseData.checkpoint.otherPayrollCosts);
  } else if (sectionId === 'D') {
    correct = amountFieldsCorrect(state.checkpoint.D.values, { operatingTotal: caseData.checkpoint.operatingTotal });
  } else {
    correct = gradeCheckpointE(source, state);
  }

  const checkpoint = {
    ...state.checkpoint,
    [sectionId]: { ...state.checkpoint[sectionId], status: correct ? 'correct' as const : 'incorrect' as const },
  } as CheckpointState;

  if (correct && allSectionsCorrect(checkpoint)) {
    return freezeStudentState({
      ...state,
      checkpoint,
      phase: { kind: 'document', activeDocumentId: 'B10' },
      documents: state.documents.map(document =>
        document.documentId === 'B10' ? { ...document, status: 'active' as const } : document,
      ),
    });
  }
  return freezeStudentState({ ...state, checkpoint });
}

export function expectedCheckpointBalanceSide(
  source: Level2StateCase,
  accountNumber: Level2AccountNumber,
): 'debit' | 'credit' | 'zero' {
  const expected = getLevel2CaseData(source).checkpointBalances.find(balance => balance.accountNumber === accountNumber);
  if (!expected) throw new Error('Missing checkpoint account');
  return expected.side;
}
