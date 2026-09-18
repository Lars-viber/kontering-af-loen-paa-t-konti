export type AccountId = '2210' | '2215' | '2223' | '6920' | '6921' | '6922' | '6930' | '5820';
export type AccountType = 'Drift' | 'Balance';
export type EntrySide = 'debit' | 'credit';
export type PensionRate = 4 | 5 | 6 | 8 | 10;

export interface PayrollAccount {
  readonly id: AccountId;
  readonly name: string;
  readonly type: AccountType;
}

export interface EmployeeInput {
  readonly grossSalary: number;
  readonly pensionRate: PensionRate;
  readonly taxRate: number;
  readonly deduction: number;
}

export interface PayrollEmployee extends EmployeeInput {
  readonly atp: number;
  readonly pension: number;
  readonly amBase: number;
  readonly amContribution: number;
  readonly aTax: number;
  readonly netPay: number;
}

export interface PayslipTotals {
  readonly grossSalary: number;
  readonly atp: number;
  readonly pension: number;
  readonly amBase: number;
  readonly amContribution: number;
  readonly aTax: number;
  readonly netPay: number;
}

export interface Posting {
  readonly debit: number;
  readonly credit: number;
}

export type Answer = Readonly<Record<AccountId, Posting>>;

export interface ExerciseSnapshot {
  readonly generatorVersion: 1;
  readonly variant: number;
  readonly employeeCount: number;
  readonly employees: readonly PayrollEmployee[];
  readonly payslipTotals: PayslipTotals;
  readonly accounts: readonly PayrollAccount[];
  readonly answerKey: Answer;
}

export type FieldStatus = 'unchecked' | 'incorrect' | 'correct';

export interface GradedField {
  readonly accountId: AccountId;
  readonly side: EntrySide;
  readonly status: FieldStatus;
}

export interface GradingResult {
  readonly fields: readonly GradedField[];
  readonly correctCount: number;
  readonly incorrectCount: number;
  readonly complete: boolean;
}

export interface StudentTotals {
  readonly debit: number;
  readonly credit: number;
  readonly status: 'empty' | 'unbalanced' | 'balanced';
}