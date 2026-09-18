import { calculateAtp, type AtpSummary } from './atp';
import { calculateHolidayPay, sumHolidayPay } from './holidayPay';
import { applyLedger } from './ledger';
import { calculatePayroll, sumPayroll } from './payroll';
import { createDocument, flattenPostings } from './postings';
import { deepFreezeLevel2 } from './readonly';
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

export const LEVEL2_MONTHS = Object.freeze(['jan', 'feb', 'mar', 'apr', 'may', 'jun'] as const);
const JANUARY_THROUGH_MAY = LEVEL2_MONTHS.slice(0, 5);

export interface Level2CaseInput {
  readonly hourlyEmployees: readonly HourlyEmployeeReference[];
  readonly salariedEmployees: readonly SalariedEmployeeReference[];
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly holidayLiabilityAdjustmentYtdMay: number;
  readonly juneHolidayLiabilityAdjustment: number;
  readonly bankStartBalance: number;
}

export interface Level2AtpTimeline {
  readonly monthly: AtpSummary;
  readonly q1: AtpSummary;
  readonly q2: AtpSummary;
  readonly januaryThroughMay: AtpSummary;
  readonly januaryThroughJune: AtpSummary;
}

export interface Level2YtdSpecification {
  readonly pension: {
    readonly hourlyEmployee: number;
    readonly hourlyEmployer: number;
    readonly salariedEmployee: number;
    readonly salariedEmployer: number;
  };
  readonly atp: {
    readonly hourlyEmployee: number;
    readonly hourlyEmployer: number;
    readonly salariedEmployee: number;
    readonly salariedEmployer: number;
  };
}

export interface Level2Checkpoint {
  readonly hourlyGrossPayroll: {
    readonly wageAccount: number;
    readonly employeePension: number;
    readonly employeeAtp: number;
    readonly grossPayroll: number;
  };
  readonly salariedGrossPayroll: {
    readonly wageAccount: number;
    readonly employeePension: number;
    readonly employeeAtp: number;
    readonly grossPayroll: number;
  };
  readonly otherPayrollCosts: {
    readonly employerPension: number;
    readonly employerAtp: number;
    readonly hourlyHolidayPay: number;
    readonly holidayLiabilityAdjustment: number;
  };
  readonly operatingTotal: number;
  readonly pensionSpecificationTotal: number;
  readonly atpSpecificationTotal: number;
}

export interface DerivedLevel2Case {
  readonly history: Readonly<Record<MonthId, ReferenceMonth>>;
  readonly atp: Level2AtpTimeline;
  readonly startBalances: readonly AccountBalance[];
  readonly juneDocuments: readonly Level2Document[];
  readonly checkpointLedger: LedgerState;
  readonly ytdSpecification: Level2YtdSpecification;
  readonly checkpoint: Level2Checkpoint;
  readonly julyDocuments: readonly Level2Document[];
  readonly documents: readonly Level2Document[];
  readonly finalLedger: LedgerState;
}

function buildMonth(input: Level2CaseInput, month: MonthId): ReferenceMonth {
  const hourlyPayroll = Object.freeze(input.hourlyEmployees.map(employee =>
    calculatePayroll({
      employeeId: employee.id,
      employeeGroup: 'hourly',
      grossSalary: employee.hours[month] * employee.hourlyRate,
      taxRate: employee.taxRate,
      monthlyDeduction: employee.monthlyDeduction,
    }),
  ));
  const salariedPayroll = Object.freeze(input.salariedEmployees.map(employee =>
    calculatePayroll({
      employeeId: employee.id,
      employeeGroup: 'salaried',
      grossSalary: employee.monthlySalary,
      taxRate: employee.taxRate,
      monthlyDeduction: employee.monthlyDeduction,
    }),
  ));
  const hourlyHolidayPay = Object.freeze(hourlyPayroll.map((payroll, index) =>
    calculateHolidayPay(payroll.employeeId, payroll.grossSalary, input.hourlyEmployees[index].taxRate),
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

function sumMonths(
  history: Readonly<Record<MonthId, ReferenceMonth>>,
  months: readonly MonthId[],
  select: (month: ReferenceMonth) => number,
): number {
  return months.reduce((sum, month) => sum + select(history[month]), 0);
}

function balance(accountNumber: AccountBalance['accountNumber'], amount: number, side: AccountBalance['side']): AccountBalance {
  return Object.freeze({ accountNumber, amount, side });
}

function createStartBalances(
  input: Level2CaseInput,
  history: Readonly<Record<MonthId, ReferenceMonth>>,
  atp: Level2AtpTimeline,
): readonly AccountBalance[] {
  const may = history.may;
  const pensionThroughMay = sumMonths(history, JANUARY_THROUGH_MAY, month =>
    month.hourlyTotals.employeePension + month.hourlyTotals.employerPension +
    month.salariedTotals.employeePension + month.salariedTotals.employerPension,
  );
  const atpExpenseThroughMay = sumMonths(history, JANUARY_THROUGH_MAY, month =>
    month.hourlyTotals.employeeAtp + month.hourlyTotals.employerAtp +
    month.salariedTotals.employeeAtp + month.salariedTotals.employerAtp,
  );

  return Object.freeze([
    balance('2210', sumMonths(history, JANUARY_THROUGH_MAY, month => month.hourlyTotals.amBase), 'debit'),
    balance('2211', sumMonths(history, JANUARY_THROUGH_MAY, month => month.salariedTotals.amBase), 'debit'),
    balance('2215', pensionThroughMay, 'debit'),
    balance('2223', atpExpenseThroughMay, 'debit'),
    balance('2230', sumMonths(history, JANUARY_THROUGH_MAY, month => month.hourlyHolidayTotals.grossHolidayPay), 'debit'),
    balance('2235', input.holidayLiabilityAdjustmentYtdMay, 'debit'),
    balance('5820', input.bankStartBalance, input.bankStartBalance === 0 ? 'zero' : 'debit'),
    balance('6920', may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax, 'credit'),
    balance('6921', atp.januaryThroughMay.total, 'credit'),
    balance('6922', may.hourlyTotals.employeePension + may.hourlyTotals.employerPension + may.salariedTotals.employeePension + may.salariedTotals.employerPension, 'credit'),
    balance('6923', may.hourlyHolidayTotals.netHolidayPay, 'credit'),
    balance('6924', input.holidayLiabilityBeforeAdjustment, 'credit'),
    balance('6930', may.hourlyTotals.amContribution + may.salariedTotals.amContribution + may.hourlyHolidayTotals.amContribution, 'credit'),
  ]);
}

function amountByAccount(balances: readonly AccountBalance[]): Record<AccountBalance['accountNumber'], number> {
  return Object.fromEntries(balances.map(item => [item.accountNumber, item.amount])) as Record<AccountBalance['accountNumber'], number>;
}

function buildJuneDocuments(
  startBalances: readonly AccountBalance[],
  june: ReferenceMonth,
  juneHolidayLiabilityAdjustment: number,
): readonly Level2Document[] {
  const start = amountByAccount(startBalances);
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
      { accountNumber: '2235', side: 'debit', amount: juneHolidayLiabilityAdjustment, text: 'Regulering af feriepengeforpligtelse', employeeGroup: 'salaried', role: 'adjustment' },
      { accountNumber: '6924', side: 'credit', amount: juneHolidayLiabilityAdjustment, text: 'Feriepengeforpligtelse ultimo', employeeGroup: 'salaried', role: 'adjustment' },
    ]),
  ]);
}

function ledgerAmount(ledger: LedgerState, accountNumber: AccountBalance['accountNumber']): number {
  const account = ledger.accounts.find(item => item.accountNumber === accountNumber);
  if (!account) throw new Error('Missing Level 2 account: ' + accountNumber);
  return account.balance.amount;
}

function buildYtdSpecification(
  history: Readonly<Record<MonthId, ReferenceMonth>>,
): Level2YtdSpecification {
  return Object.freeze({
    pension: Object.freeze({
      hourlyEmployee: sumMonths(history, LEVEL2_MONTHS, month => month.hourlyTotals.employeePension),
      hourlyEmployer: sumMonths(history, LEVEL2_MONTHS, month => month.hourlyTotals.employerPension),
      salariedEmployee: sumMonths(history, LEVEL2_MONTHS, month => month.salariedTotals.employeePension),
      salariedEmployer: sumMonths(history, LEVEL2_MONTHS, month => month.salariedTotals.employerPension),
    }),
    atp: Object.freeze({
      hourlyEmployee: sumMonths(history, LEVEL2_MONTHS, month => month.hourlyTotals.employeeAtp),
      hourlyEmployer: sumMonths(history, LEVEL2_MONTHS, month => month.hourlyTotals.employerAtp),
      salariedEmployee: sumMonths(history, LEVEL2_MONTHS, month => month.salariedTotals.employeeAtp),
      salariedEmployer: sumMonths(history, LEVEL2_MONTHS, month => month.salariedTotals.employerAtp),
    }),
  });
}

function buildCheckpoint(
  ledger: LedgerState,
  specification: Level2YtdSpecification,
): Level2Checkpoint {
  const pensionSpecificationTotal = Object.values(specification.pension).reduce((sum, amount) => sum + amount, 0);
  const atpSpecificationTotal = Object.values(specification.atp).reduce((sum, amount) => sum + amount, 0);
  return Object.freeze({
    hourlyGrossPayroll: Object.freeze({
      wageAccount: ledgerAmount(ledger, '2210'),
      employeePension: specification.pension.hourlyEmployee,
      employeeAtp: specification.atp.hourlyEmployee,
      grossPayroll: ledgerAmount(ledger, '2210') + specification.pension.hourlyEmployee + specification.atp.hourlyEmployee,
    }),
    salariedGrossPayroll: Object.freeze({
      wageAccount: ledgerAmount(ledger, '2211'),
      employeePension: specification.pension.salariedEmployee,
      employeeAtp: specification.atp.salariedEmployee,
      grossPayroll: ledgerAmount(ledger, '2211') + specification.pension.salariedEmployee + specification.atp.salariedEmployee,
    }),
    otherPayrollCosts: Object.freeze({
      employerPension: specification.pension.hourlyEmployer + specification.pension.salariedEmployer,
      employerAtp: specification.atp.hourlyEmployer + specification.atp.salariedEmployer,
      hourlyHolidayPay: ledgerAmount(ledger, '2230'),
      holidayLiabilityAdjustment: ledgerAmount(ledger, '2235'),
    }),
    operatingTotal: (['2210', '2211', '2215', '2223', '2230', '2235'] as const)
      .reduce((sum, accountNumber) => sum + ledgerAmount(ledger, accountNumber), 0),
    pensionSpecificationTotal,
    atpSpecificationTotal,
  });
}

function buildJulyDocuments(
  checkpointLedger: LedgerState,
  atp: Level2AtpTimeline,
): readonly Level2Document[] {
  const aTax = ledgerAmount(checkpointLedger, '6920');
  const am = ledgerAmount(checkpointLedger, '6930');
  const pension = ledgerAmount(checkpointLedger, '6922');
  const holidayNet = ledgerAmount(checkpointLedger, '6923');
  return Object.freeze([
    createDocument('B10', 'july', 'july-settlement', 'Betaling af ATP vedr. Q1', [
      { accountNumber: '6921', side: 'debit', amount: atp.q1.total, text: 'ATP Q1', role: 'payment' },
      { accountNumber: '5820', side: 'credit', amount: atp.q1.total, text: 'Betaling via bank', role: 'payment' },
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

export function balancesOf(ledger: LedgerState): readonly AccountBalance[] {
  return Object.freeze(ledger.accounts.map(account => account.balance));
}

export function buildLevel2Case(input: Level2CaseInput): DerivedLevel2Case {
  if (input.hourlyEmployees.length === 0 || input.salariedEmployees.length === 0) {
    throw new Error('Level 2 requires both employee groups');
  }

  const history = Object.freeze(
    Object.fromEntries(LEVEL2_MONTHS.map(month => [month, buildMonth(input, month)])) as Record<MonthId, ReferenceMonth>,
  );
  const employeeCount = input.hourlyEmployees.length + input.salariedEmployees.length;
  const atp = Object.freeze({
    monthly: calculateAtp(employeeCount),
    q1: calculateAtp(employeeCount, 3),
    q2: calculateAtp(employeeCount, 3),
    januaryThroughMay: calculateAtp(employeeCount, 5),
    januaryThroughJune: calculateAtp(employeeCount, 6),
  });
  const startBalances = createStartBalances(input, history, atp);
  const juneDocuments = buildJuneDocuments(startBalances, history.jun, input.juneHolidayLiabilityAdjustment);
  const checkpointLedger = applyLedger(startBalances, flattenPostings(juneDocuments));
  const ytdSpecification = buildYtdSpecification(history);
  const checkpoint = buildCheckpoint(checkpointLedger, ytdSpecification);
  const julyDocuments = buildJulyDocuments(checkpointLedger, atp);
  const documents = Object.freeze([...juneDocuments, ...julyDocuments]);
  const finalLedger = applyLedger(startBalances, flattenPostings(documents));

  if (documents.some((document, index) => document.id !== LEVEL2_DOCUMENT_IDS[index])) {
    throw new Error('Level 2 document order differs from the frozen document order');
  }

  return deepFreezeLevel2({
    history,
    atp,
    startBalances,
    juneDocuments,
    checkpointLedger,
    ytdSpecification,
    checkpoint,
    julyDocuments,
    documents,
    finalLedger,
  });
}
