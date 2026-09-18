export const LEVEL2_ACCOUNT_NUMBERS = [
  '2210', '2211', '2215', '2223', '2230', '2235',
  '5820', '6920', '6921', '6922', '6923', '6924', '6930',
] as const;

export type Level2AccountNumber = typeof LEVEL2_ACCOUNT_NUMBERS[number];
export type Level2AccountType = 'operating' | 'balance';
export type PostingSide = 'debit' | 'credit';
export type BalanceSide = PostingSide | 'zero';
export type EmployeeGroup = 'hourly' | 'salaried';
export type MonthId = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun';
export type DocumentPeriod = 'june' | 'july';
export type DocumentPhase = 'june-booking' | 'july-settlement';

export const LEVEL2_DOCUMENT_IDS = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
  'B8', 'B9', 'B10', 'B11', 'B12', 'B13',
] as const;

export type Level2DocumentId = typeof LEVEL2_DOCUMENT_IDS[number];

export interface Level2Account {
  readonly accountNumber: Level2AccountNumber;
  readonly name: string;
  readonly type: Level2AccountType;
  readonly teachingAccount: boolean;
}

export interface PayrollInput {
  readonly employeeId: string;
  readonly employeeGroup: EmployeeGroup;
  readonly grossSalary: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
}

export interface PayrollResult extends PayrollInput {
  readonly employeePension: number;
  readonly employerPension: number;
  readonly employeeAtp: number;
  readonly employerAtp: number;
  readonly amBase: number;
  readonly amContribution: number;
  readonly taxBase: number;
  readonly aTax: number;
  readonly netPay: number;
}

export interface PayrollTotals {
  readonly grossSalary: number;
  readonly employeePension: number;
  readonly employerPension: number;
  readonly employeeAtp: number;
  readonly employerAtp: number;
  readonly amBase: number;
  readonly amContribution: number;
  readonly aTax: number;
  readonly netPay: number;
}

export interface HolidayPayResult {
  readonly employeeId: string;
  readonly holidayEligibleSalary: number;
  readonly taxRate: number;
  readonly grossHolidayPay: number;
  readonly amContribution: number;
  readonly taxBase: number;
  readonly aTax: number;
  readonly netHolidayPay: number;
}

export interface HolidayPayTotals {
  readonly grossHolidayPay: number;
  readonly amContribution: number;
  readonly aTax: number;
  readonly netHolidayPay: number;
}

export interface Posting {
  readonly documentId: Level2DocumentId;
  readonly accountNumber: Level2AccountNumber;
  readonly side: PostingSide;
  readonly amount: number;
  readonly text: string;
  readonly employeeGroup?: EmployeeGroup;
  readonly role?: 'employee' | 'employer' | 'payment' | 'adjustment';
}

export interface Level2Document {
  readonly id: Level2DocumentId;
  readonly period: DocumentPeriod;
  readonly phase: DocumentPhase;
  readonly title: string;
  readonly expectedPostings: readonly Posting[];
  readonly debitTotal: number;
  readonly creditTotal: number;
  readonly balanced: boolean;
}

export interface AccountBalance {
  readonly accountNumber: Level2AccountNumber;
  readonly amount: number;
  readonly side: BalanceSide;
}

export interface AccountMovement {
  readonly documentId: Level2DocumentId;
  readonly side: PostingSide;
  readonly amount: number;
  readonly text: string;
}

export interface LedgerAccount {
  readonly accountNumber: Level2AccountNumber;
  readonly openingBalance: AccountBalance;
  readonly movements: readonly AccountMovement[];
  readonly balance: AccountBalance;
}

export interface LedgerState {
  readonly accounts: readonly LedgerAccount[];
}

export interface HourlyEmployeeReference {
  readonly id: string;
  readonly hourlyRate: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
  readonly hours: Readonly<Record<MonthId, number>>;
}

export interface SalariedEmployeeReference {
  readonly id: string;
  readonly monthlySalary: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
}

export interface ReferenceMonth {
  readonly month: MonthId;
  readonly hourlyPayroll: readonly PayrollResult[];
  readonly salariedPayroll: readonly PayrollResult[];
  readonly hourlyTotals: PayrollTotals;
  readonly salariedTotals: PayrollTotals;
  readonly hourlyHolidayPay: readonly HolidayPayResult[];
  readonly hourlyHolidayTotals: HolidayPayTotals;
}
