export const V2_DOCUMENT_IDS = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
] as const;

export type V2DocumentId = typeof V2_DOCUMENT_IDS[number];

export const V2_ACCOUNT_NUMBERS = [
  '2210', '2211', '2215', '2223', '2230', '2235',
  '5820', '6920', '6921', '6922', '6923', '6924', '6930',
] as const;

export type V2AccountNumber = typeof V2_ACCOUNT_NUMBERS[number];
export type V2PostingSide = 'debit' | 'credit';
export type V2BalanceSide = V2PostingSide | 'zero';
export type V2EmployeeGroup = 'hourly' | 'salaried';
export type V2MonthId = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun';

export interface V2VersionIdentity {
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 2;
  readonly generatorVersion: 2;
}

export interface V2Account {
  readonly accountNumber: V2AccountNumber;
  readonly name: string;
  readonly type: 'operating' | 'balance';
}

export interface V2HourlyEmployee {
  readonly id: string;
  readonly hourlyRate: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
  readonly hours: Readonly<Record<V2MonthId, number>>;
}

export interface V2SalariedEmployee {
  readonly id: string;
  readonly monthlySalary: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
}

export interface V2PayrollLine {
  readonly employeeId: string;
  readonly employeeGroup: V2EmployeeGroup;
  readonly grossSalary: number;
  readonly taxRate: number;
  readonly monthlyDeduction: number;
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

export interface V2PayrollTotals {
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

export interface V2HolidayPayLine {
  readonly employeeId: string;
  readonly holidayEligibleSalary: number;
  readonly taxRate: number;
  readonly grossHolidayPay: number;
  readonly amContribution: number;
  readonly taxBase: number;
  readonly aTax: number;
  readonly netHolidayPay: number;
}

export interface V2HolidayPayTotals {
  readonly grossHolidayPay: number;
  readonly amContribution: number;
  readonly aTax: number;
  readonly netHolidayPay: number;
}

export interface V2ReferenceMonth {
  readonly month: V2MonthId;
  readonly hourlyPayroll: readonly V2PayrollLine[];
  readonly salariedPayroll: readonly V2PayrollLine[];
  readonly hourlyTotals: V2PayrollTotals;
  readonly salariedTotals: V2PayrollTotals;
  readonly hourlyHolidayPay: readonly V2HolidayPayLine[];
  readonly hourlyHolidayTotals: V2HolidayPayTotals;
}

export interface V2AccountBalance {
  readonly accountNumber: V2AccountNumber;
  readonly amount: number;
  readonly side: V2BalanceSide;
}

export type V2DocumentSourceFieldId =
  | 'may-a-tax'
  | 'may-am-contribution'
  | 'may-pension'
  | 'may-net-holiday-pay'
  | 'june-hourly-gross-pay'
  | 'june-hourly-employer-pension'
  | 'june-hourly-employer-atp'
  | 'june-hourly-gross-holiday-pay'
  | 'june-salaried-gross-pay'
  | 'june-salaried-employer-pension'
  | 'june-salaried-employer-atp'
  | 'holiday-liability-before-adjustment'
  | 'holiday-liability-system-assessed';

export interface V2DocumentSourceField {
  readonly id: V2DocumentSourceFieldId;
  readonly label: string;
  readonly amount: number;
}

export type V2TallyId =
  | 'hourly-gross-pay-ytd'
  | 'hourly-employee-pension-ytd'
  | 'hourly-employee-atp-ytd'
  | 'hourly-employer-pension-ytd'
  | 'hourly-employer-atp-ytd'
  | 'hourly-gross-holiday-pay-ytd'
  | 'salaried-gross-pay-ytd'
  | 'salaried-employee-pension-ytd'
  | 'salaried-employee-atp-ytd'
  | 'salaried-employer-pension-ytd'
  | 'salaried-employer-atp-ytd'
  | 'holiday-liability-system-assessed';

export type V2TallyMeasure =
  | 'gross-pay'
  | 'employee-pension'
  | 'employee-atp'
  | 'employer-pension'
  | 'employer-atp'
  | 'gross-holiday-pay'
  | 'holiday-liability-balance';

export interface V2ExternalTally {
  readonly id: V2TallyId;
  readonly employeeGroup: V2EmployeeGroup | 'all';
  readonly measure: V2TallyMeasure;
  readonly period: 'ytd-through-2026-06' | 'as-of-2026-06-30';
  readonly amount: number;
  readonly source: 'payroll-system';
  readonly presentationLabel: string;
}

export interface V2DocumentSource {
  readonly id: V2DocumentId;
  readonly title: string;
  readonly period: 'june-2026';
  readonly fields: readonly V2DocumentSourceField[];
  readonly visibleTallyIds: readonly V2TallyId[];
}

export type V2LiabilityControlId =
  | 'june-a-tax'
  | 'june-am-contribution'
  | 'june-pension'
  | 'atp-as-of-june-30'
  | 'june-net-holiday-pay'
  | 'holiday-liability-as-of-june-30';

export interface V2LiabilityControl {
  readonly id: V2LiabilityControlId;
  readonly accountNumber: '6920' | '6930' | '6922' | '6921' | '6923' | '6924';
  readonly amount: number;
  readonly period: 'june-2026' | 'as-of-2026-06-30';
  readonly source: 'payroll-system' | 'settlement-report';
  readonly presentationLabel: string;
}

export interface V2SourceCase {
  readonly identity: V2VersionIdentity;
  readonly accounts: readonly V2Account[];
  readonly hourlyEmployees: readonly V2HourlyEmployee[];
  readonly salariedEmployees: readonly V2SalariedEmployee[];
  readonly history: readonly V2ReferenceMonth[];
  readonly startBalances: readonly V2AccountBalance[];
  readonly documentSources: readonly V2DocumentSource[];
  readonly tallies: readonly V2ExternalTally[];
  readonly liabilityControls: readonly V2LiabilityControl[];
}

export interface V2ExpectedPosting {
  readonly documentId: V2DocumentId;
  readonly accountNumber: V2AccountNumber;
  readonly side: V2PostingSide;
  readonly amount: number;
  readonly text: string;
}

export interface V2ExpectedDocument {
  readonly id: V2DocumentId;
  readonly title: string;
  readonly expectedPostings: readonly V2ExpectedPosting[];
  readonly debitTotal: number;
  readonly creditTotal: number;
  readonly balanced: boolean;
}

export interface V2ReconciliationComparison {
  readonly bookedAmount: number;
  readonly controlAmount: number;
  readonly difference: number;
}

export interface V2GrossPayReconciliation extends V2ReconciliationComparison {
  readonly wageAccountYtd: number;
  readonly employeePensionYtd: number;
  readonly employeeAtpYtd: number;
  readonly calculatedGrossPayYtd: number;
  readonly externalTallyId: 'hourly-gross-pay-ytd' | 'salaried-gross-pay-ytd';
}

export interface V2PensionReconciliation extends V2ReconciliationComparison {
  readonly accountNumber: '2215';
  readonly hourlyEmployeePensionYtd: number;
  readonly hourlyEmployerPensionYtd: number;
  readonly salariedEmployeePensionYtd: number;
  readonly salariedEmployerPensionYtd: number;
}

export interface V2AtpReconciliation extends V2ReconciliationComparison {
  readonly accountNumber: '2223';
  readonly hourlyEmployeeAtpYtd: number;
  readonly hourlyEmployerAtpYtd: number;
  readonly salariedEmployeeAtpYtd: number;
  readonly salariedEmployerAtpYtd: number;
}

export interface V2HolidayPayReconciliation extends V2ReconciliationComparison {
  readonly accountNumber: '2230';
  readonly grossHolidayPayYtd: number;
}

export interface V2OtherCostReconciliation {
  readonly pension: V2PensionReconciliation;
  readonly atp: V2AtpReconciliation;
  readonly holidayPay: V2HolidayPayReconciliation;
}

export interface V2InternalOperatingControl {
  readonly operatingTotal: number;
}

export interface V2LiabilityReconciliation extends V2ReconciliationComparison {
  readonly accountNumber: V2LiabilityControl['accountNumber'];
  readonly bookedSide: 'credit';
  readonly controlId: V2LiabilityControlId;
}

export interface V2ReconciliationExpected {
  readonly A: V2GrossPayReconciliation;
  readonly B: V2GrossPayReconciliation;
  readonly C: V2OtherCostReconciliation;
  readonly D: V2InternalOperatingControl;
  readonly E: readonly V2LiabilityReconciliation[];
}

export interface V2AnswerKey {
  readonly documents: readonly V2ExpectedDocument[];
  readonly reconciliation: V2ReconciliationExpected;
  readonly finalBalances: readonly V2AccountBalance[];
  readonly operatingTotal: number;
}
