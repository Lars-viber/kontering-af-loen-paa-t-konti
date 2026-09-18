import { ACCOUNT_IDS } from './accounts';
import type { Answer, EntrySide, GradedField, GradingResult } from './types';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];

export function initialGrading(): GradingResult {
  const fields = ACCOUNT_IDS.flatMap(accountId => SIDES.map(side => ({ accountId, side, status: 'unchecked' as const })));
  return { fields, correctCount: 0, incorrectCount: 0, complete: false };
}

export function gradeAnswer(studentAnswer: Answer, answerKey: Answer): GradingResult {
  const fields: GradedField[] = ACCOUNT_IDS.flatMap(accountId => SIDES.map(side => ({
    accountId,
    side,
    status: studentAnswer[accountId][side] === answerKey[accountId][side] ? 'correct' : 'incorrect',
  })));
  const correctCount = fields.filter(field => field.status === 'correct').length;
  return { fields, correctCount, incorrectCount: fields.length - correctCount, complete: correctCount === fields.length };
}

export function allFieldsCorrect(result: GradingResult): boolean {
  return result.fields.length === 16 && result.fields.every(field => field.status === 'correct');
}