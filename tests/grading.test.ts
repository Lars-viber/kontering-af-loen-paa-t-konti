import { describe, expect, it } from 'vitest';
import { ACCOUNT_IDS, allFieldsCorrect, calculateStudentTotals, generateExercise, gradeAnswer, initialGrading, type AccountId, type Answer } from '../src/domain/payroll';

type MutableAnswer = Record<AccountId, { debit: number; credit: number }>;
const empty = (): MutableAnswer => Object.fromEntries(ACCOUNT_IDS.map(id => [id, { debit: 0, credit: 0 }])) as MutableAnswer;
const clone = (answer: Answer): MutableAnswer => JSON.parse(JSON.stringify(answer)) as MutableAnswer;
const field = (result: ReturnType<typeof gradeAnswer>, accountId: string, side: string) =>
  result.fields.find(item => item.accountId === accountId && item.side === side)?.status;

describe('Feltvis grading', () => {
  const answerKey = generateExercise(42).answerKey;

  it('starter med 16 ukontrollerede felter uden facitdata', () => {
    const result = initialGrading();
    expect(result.fields).toHaveLength(16);
    expect(result.fields.every(item => item.status === 'unchecked')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/expected|correctValue|facit/i);
  });

  it('grader blank/zero korrekt og felterne uafhængigt', () => {
    const student = empty();
    student['2210'].debit = answerKey['2210'].debit;
    student['2210'].credit = 7;
    const result = gradeAnswer(student, answerKey);
    expect(field(result, '2210', 'debit')).toBe('correct');
    expect(field(result, '2210', 'credit')).toBe('incorrect');
    expect(field(result, '2215', 'credit')).toBe('correct');
    expect(result.complete).toBe(false);
    expect(JSON.stringify(result)).not.toContain(String(answerKey['2210'].debit));
  });

  it('kan grade forkert Debit og korrekt Kredit separat', () => {
    const student = empty();
    student['6920'].debit = 1;
    student['6920'].credit = answerKey['6920'].credit;
    const result = gradeAnswer(student, answerKey);
    expect(field(result, '6920', 'debit')).toBe('incorrect');
    expect(field(result, '6920', 'credit')).toBe('correct');
  });

  it('godkender alle 16 felter uden at mutere answer', () => {
    const student = clone(answerKey);
    const before = JSON.stringify(student);
    const result = gradeAnswer(student, answerKey);
    expect(result.correctCount).toBe(16);
    expect(result.incorrectCount).toBe(0);
    expect(result.complete).toBe(true);
    expect(allFieldsCorrect(result)).toBe(true);
    expect(JSON.stringify(student)).toBe(before);
  });
});

describe('Elevtotaler og balance', () => {
  it('klassificerer tom, ubalanceret og balanceret', () => {
    const student = empty();
    expect(calculateStudentTotals(student)).toEqual({ debit: 0, credit: 0, status: 'empty' });
    student['2210'].debit = 100;
    expect(calculateStudentTotals(student)).toEqual({ debit: 100, credit: 0, status: 'unbalanced' });
    student['5820'].credit = 100;
    expect(calculateStudentTotals(student)).toEqual({ debit: 100, credit: 100, status: 'balanced' });
  });

  it('kan balancere og stadig være fagligt forkert', () => {
    const student = empty();
    student['2210'].debit = 100;
    student['5820'].credit = 100;
    expect(calculateStudentTotals(student).status).toBe('balanced');
    expect(gradeAnswer(student, generateExercise(42).answerKey).complete).toBe(false);
  });
});