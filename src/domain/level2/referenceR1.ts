import { LEVEL2_ACCOUNTS } from './accounts';
import { calculateAtp } from './atp';
import { applyLedger } from './ledger';
import { calculatePayroll, sumPayroll } from './payroll';
import { calculateHolidayPay, sumHolidayPay } from './holidayPay';
import { createDocument, flattenPostings } from './postings';
import { deepFreezeLevel2 } from './readonly';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from './ruleset';
import {
  LEVEL2_DOCUMENT_IDS,
  type AccountBalance,
  type HourlyEmployeeReference,
  type LedgerState,
  type Level2Document,
  type MonthId,
  type ReferenceMonth,
  type SalariedEmployeeReference,
} from './types';

export const R1_MONTHS = Object.freeze(['jan', 'feb', 'mar', 'apr', 'may', 'jun'] as const);

export const R1_HOURLY_EMPLOYEES = Object.freeze([
  Object.freeze({ id: 'T1', hourlyRate: 240, taxRate: 36, monthlyDeduction: 4500, hours: Object.freeze({ jan: 145, feb: 148, mar: 152, apr: 154, may: 156, jun: 155 }) }),
  Object.freeze({ id: 'T2', hourlyRate: 240, taxRate: 37, monthlyDeduction: 4750, hours: Object.freeze({ jan: 155, feb: 160, mar: 163, apr: 162, may: 164, jun: 165 }) }),
  Object.freeze({ id: 'T3', hourlyRate: 230, taxRate: 38, monthlyDeduction: 5000, hours: Object.freeze({ jan: 172, feb: 174, mar: 176, apr: 178, may: 177, jun: 180 }) }),
  Object.freeze({ id: 'T4', hourlyRate: 250, taxRate: 39, monthlyDeduction: 5250, hours: Object.freeze({ jan: 172, feb: 170, mar: 176, apr: 174, may: 178, jun: 180 }) }),
] as const satisfies readonly HourlyEmployeeReference[]);

export const R1_SALARIED_EMPLOYEES = Object.freeze([
  Object.freeze({ id: 'M1', monthlySalary: 42000, taxRate: 37, monthlyDeduction: 5000 }),
  Object.freeze({ id: 'M2', monthlySalary: 47500, taxRate: 38, monthlyDeduction: 5250 }),
  Object.freeze({ id: 'M3', monthlySalary: 52500, taxRate: 39, monthlyDeduction: 5500 }),
  Object.freeze({ id: 'M4', monthlySalary: 60500, taxRate: 40, monthlyDeduction: 5750 }),
] as const satisfies readonly SalariedEmployeeReference[]);

export const R1_HOLIDAY_LIABILITY = Object.freeze({
  holidayLiabilityBeforeAdjustment: 174000,
  systemAssessedHolidayLiability: 182500,
  adjustment: 182500 - 174000,
});

function buildMonth(month: MonthId): ReferenceMonth {
  const hourlyPayroll = Object.freeze(R1_HOURLY_EMPLOYEES.map(employee =>
    calculatePayroll({
      employeeId: employee.id,
      employeeGroup: 'hourly',
      grossSalary: employee.hours[month] * employee.hourlyRate,
      taxRate: employee.taxRate,
      monthlyDeduction: employee.monthlyDeduction,
    }),
  ));
  const salariedPayroll = Object.freeze(R1_SALARIED_EMPLOYEES.map(employee =>
    calculatePayroll({
      employeeId: employee.id,
      employeeGroup: 'salaried',
      grossSalary: employee.monthlySalary,
      taxRate: employee.taxRate,
      monthlyDeduction: employee.monthlyDeduction,
    }),
  ));
  const hourlyHolidayPay = Object.freeze(hourlyPayroll.map((payroll, index) =>
    calculateHolidayPay(payroll.employeeId, payroll.grossSalary, R1_HOURLY_EMPLOYEES[index].taxRate),
  ));

  return Object.freeze({
    month,
    hourlyPayroll,
    salariedPayroll,
    hourlyTotals: sumPayroll(hourlyPayroll),
    salariedTotals: sumPayroll(salariedPayroll),
    hourlyHolidayPay,
    hourlyHolidayTotals: sumHolidayPay(hourlyHolidayPay),
  });
}

export const R1_HISTORY = Object.freeze(
  Object.fromEntries(R1_MONTHS.map(month => [month, buildMonth(month)])) as Record<MonthId, ReferenceMonth>,
);

function sumMonths(
  months: readonly MonthId[],
  select: (month: ReferenceMonth) => number,
): number {
  return months.reduce((sum, month) => sum + select(R1_HISTORY[month]), 0);
}

const JAN_MAY = R1_MONTHS.slice(0, 5);
const may = R1_HISTORY.may;
const june = R1_HISTORY.jun;

const employeeCount = R1_HOURLY_EMPLOYEES.length + R1_SALARIED_EMPLOYEES.length;
export const R1_ATP = Object.freeze({
  monthly: calculateAtp(employeeCount),
  q1: calculateAtp(employeeCount, 3),
  q2: calculateAtp(employeeCount, 3),
  januaryThroughMay: calculateAtp(employeeCount, 5),
  januaryThroughJune: calculateAtp(employeeCount, 6),
});

function balance(accountNumber: AccountBalance['accountNumber'], amount: number, side: AccountBalance['side']): AccountBalance {
  return Object.freeze({ accountNumber, amount, side });
}

const pensionThroughMay = sumMonths(JAN_MAY, month =>
  month.hourlyTotals.employeePension + month.hourlyTotals.employerPension +
  month.salariedTotals.employeePension + month.salariedTotals.employerPension,
);
const atpExpenseThroughMay = sumMonths(JAN_MAY, month =>
  month.hourlyTotals.employeeAtp + month.hourlyTotals.employerAtp +
  month.salariedTotals.employeeAtp + month.salariedTotals.employerAtp,
);

export const R1_START_BALANCES = Object.freeze([
  balance('2210', sumMonths(JAN_MAY, month => month.hourlyTotals.amBase), 'debit'),
  balance('2211', sumMonths(JAN_MAY, month => month.salariedTotals.amBase), 'debit'),
  balance('2215', pensionThroughMay, 'debit'),
  balance('2223', atpExpenseThroughMay, 'debit'),
  balance('2230', sumMonths(JAN_MAY, month => month.hourlyHolidayTotals.grossHolidayPay), 'debit'),
  balance('2235', 24000, 'debit'),
  balance('5820', 1500000, 'debit'),
  balance('6920', may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax, 'credit'),
  balance('6921', R1_ATP.januaryThroughMay.total, 'credit'),
  balance('6922', may.hourlyTotals.employeePension + may.hourlyTotals.employerPension + may.salariedTotals.employeePension + may.salariedTotals.employerPension, 'credit'),
  balance('6923', may.hourlyHolidayTotals.netHolidayPay, 'credit'),
  balance('6924', R1_HOLIDAY_LIABILITY.holidayLiabilityBeforeAdjustment, 'credit'),
  balance('6930', may.hourlyTotals.amContribution + may.salariedTotals.amContribution + may.hourlyHolidayTotals.amContribution, 'credit'),
] as const);

function buildJuneDocuments(): readonly Level2Document[] {
  const start = Object.fromEntries(R1_START_BALANCES.map(item => [item.accountNumber, item.amount]));
  return Object.freeze([
    createDocument('B1', 'june', 'june-booking', 'Betaling af A-skat og AM-bidrag vedr. maj', [
      { accountNumber: '6920', side: 'debit', amount: start['6920'], text: 'A-skat vedr. maj', role: 'payment' },
      { accountNumber: '6930', side: 'debit', amount: start['6930'], text: 'AM-bidrag vedr. maj', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: start['6920'] + start['6930'], text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B2', 'june', 'june-booking', 'Betaling af pension vedr. maj', [
      { accountNumber: '6922', side: 'debit', amount: start['6922'], text: 'Pension vedr. maj', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: start['6922'], text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B3', 'june', 'june-booking', 'Betaling til FerieKonto vedr. maj', [
      { accountNumber: '6923', side: 'debit', amount: start['6923'], text: 'Nettoferiepenge vedr. maj', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: start['6923'], text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B4', 'june', 'june-booking', 'Lønbilag – timelønnede', [
      { accountNumber: '2210', side: 'debit', amount: june.hourlyTotals.amBase, text: 'Løn efter eget ATP og pension', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '2215', side: 'debit', amount: june.hourlyTotals.employeePension, text: 'Medarbejderpension', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '2223', side: 'debit', amount: june.hourlyTotals.employeeAtp, text: 'Medarbejder-ATP', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6920', side: 'credit', amount: june.hourlyTotals.aTax, text: 'Skyldig A-skat', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6930', side: 'credit', amount: june.hourlyTotals.amContribution, text: 'Skyldig AM-bidrag', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6922', side: 'credit', amount: june.hourlyTotals.employeePension, text: 'Skyldig medarbejderpension', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6921', side: 'credit', amount: june.hourlyTotals.employeeAtp, text: 'Skyldig medarbejder-ATP', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '5820', side: 'credit', amount: june.hourlyTotals.netPay, text: 'Nettoløn', employeeGroup: 'hourly', role: 'payment' },
    ]),
    createDocument('B5', 'june', 'june-booking', 'Arbejdsgiver ATP og pension – timelønnede', [
      { accountNumber: '2215', side: 'debit', amount: june.hourlyTotals.employerPension, text: 'Arbejdsgiverpension', employeeGroup: 'hourly', role: 'employer' },
      { accountNumber: '2223', side: 'debit', amount: june.hourlyTotals.employerAtp, text: 'Arbejdsgiver-ATP', employeeGroup: 'hourly', role: 'employer' },
      { accountNumber: '6922', side: 'credit', amount: june.hourlyTotals.employerPension, text: 'Skyldig arbejdsgiverpension', employeeGroup: 'hourly', role: 'employer' },
      { accountNumber: '6921', side: 'credit', amount: june.hourlyTotals.employerAtp, text: 'Skyldig arbejdsgiver-ATP', employeeGroup: 'hourly', role: 'employer' },
    ]),
    createDocument('B6', 'june', 'june-booking', 'Feriepengebilag – timelønnede', [
      { accountNumber: '2230', side: 'debit', amount: june.hourlyHolidayTotals.grossHolidayPay, text: 'Bruttoferiepenge', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6930', side: 'credit', amount: june.hourlyHolidayTotals.amContribution, text: 'AM-bidrag af feriepenge', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6920', side: 'credit', amount: june.hourlyHolidayTotals.aTax, text: 'A-skat af feriepenge', employeeGroup: 'hourly', role: 'employee' },
      { accountNumber: '6923', side: 'credit', amount: june.hourlyHolidayTotals.netHolidayPay, text: 'Nettoferiepenge', employeeGroup: 'hourly', role: 'employee' },
    ]),
    createDocument('B7', 'june', 'june-booking', 'Lønbilag – månedslønnede', [
      { accountNumber: '2211', side: 'debit', amount: june.salariedTotals.amBase, text: 'Løn efter eget ATP og pension', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '2215', side: 'debit', amount: june.salariedTotals.employeePension, text: 'Medarbejderpension', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '2223', side: 'debit', amount: june.salariedTotals.employeeAtp, text: 'Medarbejder-ATP', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '6920', side: 'credit', amount: june.salariedTotals.aTax, text: 'Skyldig A-skat', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '6930', side: 'credit', amount: june.salariedTotals.amContribution, text: 'Skyldig AM-bidrag', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '6922', side: 'credit', amount: june.salariedTotals.employeePension, text: 'Skyldig medarbejderpension', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '6921', side: 'credit', amount: june.salariedTotals.employeeAtp, text: 'Skyldig medarbejder-ATP', employeeGroup: 'salaried', role: 'employee' },
      { accountNumber: '5820', side: 'credit', amount: june.salariedTotals.netPay, text: 'Nettoløn', employeeGroup: 'salaried', role: 'payment' },
    ]),
    createDocument('B8', 'june', 'june-booking', 'Arbejdsgiver ATP og pension – månedslønnede', [
      { accountNumber: '2215', side: 'debit', amount: june.salariedTotals.employerPension, text: 'Arbejdsgiverpension', employeeGroup: 'salaried', role: 'employer' },
      { accountNumber: '2223', side: 'debit', amount: june.salariedTotals.employerAtp, text: 'Arbejdsgiver-ATP', employeeGroup: 'salaried', role: 'employer' },
      { accountNumber: '6922', side: 'credit', amount: june.salariedTotals.employerPension, text: 'Skyldig arbejdsgiverpension', employeeGroup: 'salaried', role: 'employer' },
      { accountNumber: '6921', side: 'credit', amount: june.salariedTotals.employerAtp, text: 'Skyldig arbejdsgiver-ATP', employeeGroup: 'salaried', role: 'employer' },
    ]),
    createDocument('B9', 'june', 'june-booking', 'Regulering af feriepengeforpligtelse – månedslønnede', [
      { accountNumber: '2235', side: 'debit', amount: R1_HOLIDAY_LIABILITY.adjustment, text: 'Regulering af feriepengeforpligtelse', employeeGroup: 'salaried', role: 'adjustment' },
      { accountNumber: '6924', side: 'credit', amount: R1_HOLIDAY_LIABILITY.adjustment, text: 'Feriepengeforpligtelse ultimo', employeeGroup: 'salaried', role: 'adjustment' },
    ]),
  ]);
}

export const R1_JUNE_DOCUMENTS = buildJuneDocuments();
export const R1_CHECKPOINT_LEDGER = applyLedger(R1_START_BALANCES, flattenPostings(R1_JUNE_DOCUMENTS));

function currentAmount(accountNumber: AccountBalance['accountNumber']): number {
  const account = R1_CHECKPOINT_LEDGER.accounts.find(item => item.accountNumber === accountNumber);
  if (!account) throw new Error('Missing R1 account: ' + accountNumber);
  return account.balance.amount;
}

export const R1_YTD_SPECIFICATION = Object.freeze({
  pension: Object.freeze({
    hourlyEmployee: sumMonths(R1_MONTHS, month => month.hourlyTotals.employeePension),
    hourlyEmployer: sumMonths(R1_MONTHS, month => month.hourlyTotals.employerPension),
    salariedEmployee: sumMonths(R1_MONTHS, month => month.salariedTotals.employeePension),
    salariedEmployer: sumMonths(R1_MONTHS, month => month.salariedTotals.employerPension),
  }),
  atp: Object.freeze({
    hourlyEmployee: sumMonths(R1_MONTHS, month => month.hourlyTotals.employeeAtp),
    hourlyEmployer: sumMonths(R1_MONTHS, month => month.hourlyTotals.employerAtp),
    salariedEmployee: sumMonths(R1_MONTHS, month => month.salariedTotals.employeeAtp),
    salariedEmployer: sumMonths(R1_MONTHS, month => month.salariedTotals.employerAtp),
  }),
});

const pensionSpecificationTotal = Object.values(R1_YTD_SPECIFICATION.pension).reduce((sum, amount) => sum + amount, 0);
const atpSpecificationTotal = Object.values(R1_YTD_SPECIFICATION.atp).reduce((sum, amount) => sum + amount, 0);

export const R1_CHECKPOINT = Object.freeze({
  hourlyGrossPayroll: Object.freeze({
    wageAccount: currentAmount('2210'),
    employeePension: R1_YTD_SPECIFICATION.pension.hourlyEmployee,
    employeeAtp: R1_YTD_SPECIFICATION.atp.hourlyEmployee,
    grossPayroll: currentAmount('2210') + R1_YTD_SPECIFICATION.pension.hourlyEmployee + R1_YTD_SPECIFICATION.atp.hourlyEmployee,
  }),
  salariedGrossPayroll: Object.freeze({
    wageAccount: currentAmount('2211'),
    employeePension: R1_YTD_SPECIFICATION.pension.salariedEmployee,
    employeeAtp: R1_YTD_SPECIFICATION.atp.salariedEmployee,
    grossPayroll: currentAmount('2211') + R1_YTD_SPECIFICATION.pension.salariedEmployee + R1_YTD_SPECIFICATION.atp.salariedEmployee,
  }),
  otherPayrollCosts: Object.freeze({
    employerPension: R1_YTD_SPECIFICATION.pension.hourlyEmployer + R1_YTD_SPECIFICATION.pension.salariedEmployer,
    employerAtp: R1_YTD_SPECIFICATION.atp.hourlyEmployer + R1_YTD_SPECIFICATION.atp.salariedEmployer,
    hourlyHolidayPay: currentAmount('2230'),
    holidayLiabilityAdjustment: currentAmount('2235'),
  }),
  operatingTotal: ['2210', '2211', '2215', '2223', '2230', '2235']
    .reduce((sum, accountNumber) => sum + currentAmount(accountNumber as AccountBalance['accountNumber']), 0),
  pensionSpecificationTotal,
  atpSpecificationTotal,
});

function buildJulyDocuments(): readonly Level2Document[] {
  const aTax = currentAmount('6920');
  const am = currentAmount('6930');
  const pension = currentAmount('6922');
  const holidayNet = currentAmount('6923');
  return Object.freeze([
    createDocument('B10', 'july', 'july-settlement', 'Betaling af ATP vedr. Q1', [
      { accountNumber: '6921', side: 'debit', amount: R1_ATP.q1.total, text: 'ATP Q1', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: R1_ATP.q1.total, text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B11', 'july', 'july-settlement', 'Betaling af A-skat og AM-bidrag vedr. juni', [
      { accountNumber: '6920', side: 'debit', amount: aTax, text: 'A-skat vedr. juni', role: 'payment' },
      { accountNumber: '6930', side: 'debit', amount: am, text: 'AM-bidrag vedr. juni', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: aTax + am, text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B12', 'july', 'july-settlement', 'Betaling af pension vedr. juni', [
      { accountNumber: '6922', side: 'debit', amount: pension, text: 'Pension vedr. juni', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: pension, text: 'Betaling via bank', role: 'payment' },
    ]),
    createDocument('B13', 'july', 'july-settlement', 'Betaling til FerieKonto vedr. juni', [
      { accountNumber: '6923', side: 'debit', amount: holidayNet, text: 'Nettoferiepenge vedr. juni', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: holidayNet, text: 'Betaling via bank', role: 'payment' },
    ]),
  ]);
}

export const R1_JULY_DOCUMENTS = buildJulyDocuments();
export const R1_DOCUMENTS = Object.freeze([...R1_JUNE_DOCUMENTS, ...R1_JULY_DOCUMENTS]);
export const R1_FINAL_LEDGER: LedgerState = applyLedger(
  R1_START_BALANCES,
  flattenPostings(R1_DOCUMENTS),
);

if (R1_DOCUMENTS.some((document, index) => document.id !== LEVEL2_DOCUMENT_IDS[index])) {
  throw new Error('R1 document order differs from the frozen document order');
}

function balancesOf(ledger: LedgerState): readonly AccountBalance[] {
  return Object.freeze(ledger.accounts.map(account => account.balance));
}

export const REFERENCE_R1_FIXTURE = deepFreezeLevel2({
  rulesetYear: LEVEL2_RULESET_YEAR,
  rulesetVersion: LEVEL2_RULESET_VERSION,
  generatorVersion: LEVEL2_GENERATOR_VERSION,
  accounts: LEVEL2_ACCOUNTS,
  hourlyEmployees: R1_HOURLY_EMPLOYEES,
  salariedEmployees: R1_SALARIED_EMPLOYEES,
  history: R1_MONTHS.map(month => R1_HISTORY[month]),
  holidayLiability: R1_HOLIDAY_LIABILITY,
  atp: R1_ATP,
  startBalances: R1_START_BALANCES,
  documents: R1_DOCUMENTS,
  checkpointBalances: balancesOf(R1_CHECKPOINT_LEDGER),
  ytdSpecification: R1_YTD_SPECIFICATION,
  checkpoint: R1_CHECKPOINT,
  finalBalances: balancesOf(R1_FINAL_LEDGER),
});
