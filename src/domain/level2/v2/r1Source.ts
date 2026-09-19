import { calculateHolidayPay, sumHolidayPay } from '../holidayPay';
import { calculatePayroll, sumPayroll } from '../payroll';
import { deepFreezeLevel2 } from '../readonly';
import { V2_ACCOUNTS } from './accounts';
import { V2_DOCUMENT_TITLES, V2_MONTHS, V2_RATES, V2_VERSION_IDENTITY } from './constants';
import type {
  V2AccountBalance,
  V2DocumentSource,
  V2DocumentSourceField,
  V2ExternalTally,
  V2HourlyEmployee,
  V2LiabilityControl,
  V2MonthId,
  V2ReferenceMonth,
  V2SalariedEmployee,
  V2SourceCase,
} from './types';

const JANUARY_THROUGH_MAY = V2_MONTHS.slice(0, 5);

export const R1_V2_HOURLY_EMPLOYEES = deepFreezeLevel2([
  { id: 'T1', hourlyRate: 240, taxRate: 36, monthlyDeduction: 4500, hours: { jan: 145, feb: 148, mar: 152, apr: 154, may: 156, jun: 155 } },
  { id: 'T2', hourlyRate: 240, taxRate: 37, monthlyDeduction: 4750, hours: { jan: 155, feb: 160, mar: 163, apr: 162, may: 164, jun: 165 } },
  { id: 'T3', hourlyRate: 230, taxRate: 38, monthlyDeduction: 5000, hours: { jan: 172, feb: 174, mar: 176, apr: 178, may: 177, jun: 180 } },
  { id: 'T4', hourlyRate: 250, taxRate: 39, monthlyDeduction: 5250, hours: { jan: 172, feb: 170, mar: 176, apr: 174, may: 178, jun: 180 } },
] satisfies readonly V2HourlyEmployee[]);

export const R1_V2_SALARIED_EMPLOYEES = deepFreezeLevel2([
  { id: 'M1', monthlySalary: 42000, taxRate: 37, monthlyDeduction: 5000 },
  { id: 'M2', monthlySalary: 47500, taxRate: 38, monthlyDeduction: 5250 },
  { id: 'M3', monthlySalary: 52500, taxRate: 39, monthlyDeduction: 5500 },
  { id: 'M4', monthlySalary: 60500, taxRate: 40, monthlyDeduction: 5750 },
] satisfies readonly V2SalariedEmployee[]);

export const R1_V2_HOLIDAY_LIABILITY = Object.freeze({
  balanceBeforeAdjustment: 174000,
  adjustmentYtdThroughMay: 24000,
  systemAssessedBalance: 182500,
});

function buildMonth(month: V2MonthId): V2ReferenceMonth {
  const hourlyPayroll = R1_V2_HOURLY_EMPLOYEES.map(employee => calculatePayroll({
    employeeId: employee.id,
    employeeGroup: 'hourly',
    grossSalary: employee.hours[month] * employee.hourlyRate,
    taxRate: employee.taxRate,
    monthlyDeduction: employee.monthlyDeduction,
  }));
  const salariedPayroll = R1_V2_SALARIED_EMPLOYEES.map(employee => calculatePayroll({
    employeeId: employee.id,
    employeeGroup: 'salaried',
    grossSalary: employee.monthlySalary,
    taxRate: employee.taxRate,
    monthlyDeduction: employee.monthlyDeduction,
  }));
  const hourlyHolidayPay = hourlyPayroll.map((payroll, index) => calculateHolidayPay(
    payroll.employeeId,
    payroll.grossSalary,
    R1_V2_HOURLY_EMPLOYEES[index].taxRate,
  ));

  return deepFreezeLevel2({
    month,
    hourlyPayroll,
    salariedPayroll,
    hourlyTotals: sumPayroll(hourlyPayroll),
    salariedTotals: sumPayroll(salariedPayroll),
    hourlyHolidayPay,
    hourlyHolidayTotals: sumHolidayPay(hourlyHolidayPay),
  });
}

export const R1_V2_HISTORY = deepFreezeLevel2(V2_MONTHS.map(buildMonth));

function referenceMonth(month: V2MonthId): V2ReferenceMonth {
  const result = R1_V2_HISTORY.find(candidate => candidate.month === month);
  if (!result) throw new Error('Missing R1 V2.1 month: ' + month);
  return result;
}

function sumMonths(
  months: readonly V2MonthId[],
  select: (month: V2ReferenceMonth) => number,
): number {
  return months.reduce((sum, month) => sum + select(referenceMonth(month)), 0);
}

function balance(
  accountNumber: V2AccountBalance['accountNumber'],
  amount: number,
  side: V2AccountBalance['side'],
): V2AccountBalance {
  return Object.freeze({ accountNumber, amount, side });
}

const may = referenceMonth('may');
const june = referenceMonth('jun');
const employeeCount = R1_V2_HOURLY_EMPLOYEES.length + R1_V2_SALARIED_EMPLOYEES.length;

export const R1_V2_START_BALANCES = deepFreezeLevel2([
  balance('2210', sumMonths(JANUARY_THROUGH_MAY, month => month.hourlyTotals.amBase), 'debit'),
  balance('2211', sumMonths(JANUARY_THROUGH_MAY, month => month.salariedTotals.amBase), 'debit'),
  balance('2215', sumMonths(JANUARY_THROUGH_MAY, month =>
    month.hourlyTotals.employeePension + month.hourlyTotals.employerPension +
    month.salariedTotals.employeePension + month.salariedTotals.employerPension), 'debit'),
  balance('2223', sumMonths(JANUARY_THROUGH_MAY, month =>
    month.hourlyTotals.employeeAtp + month.hourlyTotals.employerAtp +
    month.salariedTotals.employeeAtp + month.salariedTotals.employerAtp), 'debit'),
  balance('2230', sumMonths(JANUARY_THROUGH_MAY, month => month.hourlyHolidayTotals.grossHolidayPay), 'debit'),
  balance('2235', R1_V2_HOLIDAY_LIABILITY.adjustmentYtdThroughMay, 'debit'),
  balance('5820', 1500000, 'debit'),
  balance('6920', may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax, 'credit'),
  balance('6921', employeeCount * 5 * V2_RATES.totalAtp, 'credit'),
  balance('6922', may.hourlyTotals.employeePension + may.hourlyTotals.employerPension +
    may.salariedTotals.employeePension + may.salariedTotals.employerPension, 'credit'),
  balance('6923', may.hourlyHolidayTotals.netHolidayPay, 'credit'),
  balance('6924', R1_V2_HOLIDAY_LIABILITY.balanceBeforeAdjustment, 'credit'),
  balance('6930', may.hourlyTotals.amContribution + may.salariedTotals.amContribution +
    may.hourlyHolidayTotals.amContribution, 'credit'),
]);

function startAmount(accountNumber: V2AccountBalance['accountNumber']): number {
  const result = R1_V2_START_BALANCES.find(candidate => candidate.accountNumber === accountNumber);
  if (!result) throw new Error('Missing R1 V2.1 start balance: ' + accountNumber);
  return result.amount;
}

function field(
  id: V2DocumentSourceField['id'],
  label: string,
  amount: number,
): V2DocumentSourceField {
  return Object.freeze({ id, label, amount });
}

const adjustment = R1_V2_HOLIDAY_LIABILITY.systemAssessedBalance -
  R1_V2_HOLIDAY_LIABILITY.balanceBeforeAdjustment;

export const R1_V2_TALLIES = deepFreezeLevel2([
  { id: 'hourly-gross-pay-ytd', employeeGroup: 'hourly', measure: 'gross-pay', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyTotals.grossSalary), source: 'payroll-system', presentationLabel: 'Bruttoløn ÅTD – timelønnede' },
  { id: 'hourly-employee-pension-ytd', employeeGroup: 'hourly', measure: 'employee-pension', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyTotals.employeePension), source: 'payroll-system', presentationLabel: 'Medarbejderpension ÅTD – timelønnede' },
  { id: 'hourly-employee-atp-ytd', employeeGroup: 'hourly', measure: 'employee-atp', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyTotals.employeeAtp), source: 'payroll-system', presentationLabel: 'Medarbejder-ATP ÅTD – timelønnede' },
  { id: 'hourly-employer-pension-ytd', employeeGroup: 'hourly', measure: 'employer-pension', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyTotals.employerPension), source: 'payroll-system', presentationLabel: 'Arbejdsgiverpension ÅTD – timelønnede' },
  { id: 'hourly-employer-atp-ytd', employeeGroup: 'hourly', measure: 'employer-atp', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyTotals.employerAtp), source: 'payroll-system', presentationLabel: 'Arbejdsgiver-ATP ÅTD – timelønnede' },
  { id: 'hourly-gross-holiday-pay-ytd', employeeGroup: 'hourly', measure: 'gross-holiday-pay', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.hourlyHolidayTotals.grossHolidayPay), source: 'payroll-system', presentationLabel: 'Bruttoferiepenge ÅTD – timelønnede' },
  { id: 'salaried-gross-pay-ytd', employeeGroup: 'salaried', measure: 'gross-pay', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.salariedTotals.grossSalary), source: 'payroll-system', presentationLabel: 'Bruttoløn ÅTD – månedslønnede' },
  { id: 'salaried-employee-pension-ytd', employeeGroup: 'salaried', measure: 'employee-pension', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.salariedTotals.employeePension), source: 'payroll-system', presentationLabel: 'Medarbejderpension ÅTD – månedslønnede' },
  { id: 'salaried-employee-atp-ytd', employeeGroup: 'salaried', measure: 'employee-atp', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.salariedTotals.employeeAtp), source: 'payroll-system', presentationLabel: 'Medarbejder-ATP ÅTD – månedslønnede' },
  { id: 'salaried-employer-pension-ytd', employeeGroup: 'salaried', measure: 'employer-pension', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.salariedTotals.employerPension), source: 'payroll-system', presentationLabel: 'Arbejdsgiverpension ÅTD – månedslønnede' },
  { id: 'salaried-employer-atp-ytd', employeeGroup: 'salaried', measure: 'employer-atp', period: 'ytd-through-2026-06', amount: sumMonths(V2_MONTHS, month => month.salariedTotals.employerAtp), source: 'payroll-system', presentationLabel: 'Arbejdsgiver-ATP ÅTD – månedslønnede' },
  { id: 'holiday-liability-adjustment-ytd', employeeGroup: 'all', measure: 'holiday-liability-adjustment', period: 'ytd-through-2026-06', amount: R1_V2_HOLIDAY_LIABILITY.adjustmentYtdThroughMay + adjustment, source: 'payroll-system', presentationLabel: 'Regulering af feriepengeforpligtelse ÅTD' },
  { id: 'holiday-liability-system-assessed', employeeGroup: 'all', measure: 'holiday-liability-balance', period: 'as-of-2026-06-30', amount: R1_V2_HOLIDAY_LIABILITY.systemAssessedBalance, source: 'payroll-system', presentationLabel: 'Systemopgjort feriepengeforpligtelse pr. 30/6' },
] satisfies readonly V2ExternalTally[]);

export const R1_V2_LIABILITY_CONTROLS = deepFreezeLevel2([
  { id: 'june-a-tax', accountNumber: '6920', amount: june.hourlyTotals.aTax + june.salariedTotals.aTax + june.hourlyHolidayTotals.aTax, period: 'june-2026', source: 'settlement-report', presentationLabel: 'A-skat vedr. juni' },
  { id: 'june-am-contribution', accountNumber: '6930', amount: june.hourlyTotals.amContribution + june.salariedTotals.amContribution + june.hourlyHolidayTotals.amContribution, period: 'june-2026', source: 'settlement-report', presentationLabel: 'AM-bidrag vedr. juni' },
  { id: 'june-pension', accountNumber: '6922', amount: june.hourlyTotals.employeePension + june.hourlyTotals.employerPension + june.salariedTotals.employeePension + june.salariedTotals.employerPension, period: 'june-2026', source: 'settlement-report', presentationLabel: 'Pension vedr. juni' },
  { id: 'atp-as-of-june-30', accountNumber: '6921', amount: employeeCount * 6 * V2_RATES.totalAtp, period: 'as-of-2026-06-30', source: 'settlement-report', presentationLabel: 'ATP akkumuleret pr. 30/6' },
  { id: 'june-net-holiday-pay', accountNumber: '6923', amount: june.hourlyHolidayTotals.netHolidayPay, period: 'june-2026', source: 'settlement-report', presentationLabel: 'Nettoferiepenge til FerieKonto vedr. juni' },
  { id: 'holiday-liability-as-of-june-30', accountNumber: '6924', amount: R1_V2_HOLIDAY_LIABILITY.systemAssessedBalance, period: 'as-of-2026-06-30', source: 'payroll-system', presentationLabel: 'Systemopgjort feriepengeforpligtelse' },
] satisfies readonly V2LiabilityControl[]);

export const R1_V2_DOCUMENT_SOURCES = deepFreezeLevel2([
  { id: 'B1', title: V2_DOCUMENT_TITLES.B1, period: 'june-2026', fields: [field('may-a-tax', 'Skyldig A-skat vedr. maj', startAmount('6920')), field('may-am-contribution', 'Skyldigt AM-bidrag vedr. maj', startAmount('6930'))], visibleTallyIds: [] },
  { id: 'B2', title: V2_DOCUMENT_TITLES.B2, period: 'june-2026', fields: [field('may-pension', 'Skyldig pension vedr. maj', startAmount('6922'))], visibleTallyIds: [] },
  { id: 'B3', title: V2_DOCUMENT_TITLES.B3, period: 'june-2026', fields: [field('may-net-holiday-pay', 'Nettoferiepenge vedr. maj', startAmount('6923'))], visibleTallyIds: [] },
  { id: 'B4', title: V2_DOCUMENT_TITLES.B4, period: 'june-2026', fields: [field('june-hourly-gross-pay', 'Bruttoløn – timelønnede – juni', june.hourlyTotals.grossSalary)], visibleTallyIds: ['hourly-gross-pay-ytd', 'hourly-employee-pension-ytd', 'hourly-employee-atp-ytd'] },
  { id: 'B5', title: V2_DOCUMENT_TITLES.B5, period: 'june-2026', fields: [field('june-hourly-employer-pension', 'Arbejdsgiverpension – timelønnede – juni', june.hourlyTotals.employerPension), field('june-hourly-employer-atp', 'Arbejdsgiver-ATP – timelønnede – juni', june.hourlyTotals.employerAtp)], visibleTallyIds: ['hourly-employer-pension-ytd', 'hourly-employer-atp-ytd'] },
  { id: 'B6', title: V2_DOCUMENT_TITLES.B6, period: 'june-2026', fields: [field('june-hourly-gross-holiday-pay', 'Bruttoferiepenge – juni', june.hourlyHolidayTotals.grossHolidayPay)], visibleTallyIds: ['hourly-gross-holiday-pay-ytd'] },
  { id: 'B7', title: V2_DOCUMENT_TITLES.B7, period: 'june-2026', fields: [field('june-salaried-gross-pay', 'Bruttoløn – månedslønnede – juni', june.salariedTotals.grossSalary)], visibleTallyIds: ['salaried-gross-pay-ytd', 'salaried-employee-pension-ytd', 'salaried-employee-atp-ytd'] },
  { id: 'B8', title: V2_DOCUMENT_TITLES.B8, period: 'june-2026', fields: [field('june-salaried-employer-pension', 'Arbejdsgiverpension – månedslønnede – juni', june.salariedTotals.employerPension), field('june-salaried-employer-atp', 'Arbejdsgiver-ATP – månedslønnede – juni', june.salariedTotals.employerAtp)], visibleTallyIds: ['salaried-employer-pension-ytd', 'salaried-employer-atp-ytd'] },
  { id: 'B9', title: V2_DOCUMENT_TITLES.B9, period: 'june-2026', fields: [field('holiday-liability-before-adjustment', 'Bogført saldo før regulering', R1_V2_HOLIDAY_LIABILITY.balanceBeforeAdjustment), field('holiday-liability-system-assessed', 'Systemopgjort saldo pr. 30/6', R1_V2_HOLIDAY_LIABILITY.systemAssessedBalance)], visibleTallyIds: ['holiday-liability-system-assessed'] },
] satisfies readonly V2DocumentSource[]);

export const R1_V2_SOURCE: V2SourceCase = deepFreezeLevel2({
  identity: V2_VERSION_IDENTITY,
  accounts: V2_ACCOUNTS,
  hourlyEmployees: R1_V2_HOURLY_EMPLOYEES,
  salariedEmployees: R1_V2_SALARIED_EMPLOYEES,
  history: R1_V2_HISTORY,
  startBalances: R1_V2_START_BALANCES,
  documentSources: R1_V2_DOCUMENT_SOURCES,
  tallies: R1_V2_TALLIES,
  liabilityControls: R1_V2_LIABILITY_CONTROLS,
});
