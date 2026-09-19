import { calculateHolidayPay, sumHolidayPay } from '../holidayPay';
import { calculatePayroll, sumPayroll } from '../payroll';
import { deepFreezeLevel2 } from '../readonly';
import { V2_ACCOUNTS } from './accounts';
import { V2_DOCUMENT_TITLES, V2_MONTHS, V2_RATES, V2_VERSION_IDENTITY } from './constants';
import {
  applyV2Ledger,
  createV2ExpectedDocument,
  getV2Balance,
  getV2LiabilityControl,
  getV2Tally,
  reconciliationDifference,
} from './helpers';
import type {
  V2AccountBalance,
  V2AnswerKey,
  V2DocumentSource,
  V2DocumentSourceField,
  V2ExpectedDocument,
  V2ExternalTally,
  V2GrossPayReconciliation,
  V2HourlyEmployee,
  V2LiabilityControl,
  V2LiabilityControlId,
  V2LiabilityReconciliation,
  V2MonthId,
  V2OtherCostReconciliation,
  V2ReconciliationComparison,
  V2ReferenceMonth,
  V2SalariedEmployee,
  V2SourceCase,
  V2TallyId,
} from './types';

export interface V2CaseBuildInput {
  readonly hourlyEmployees: readonly V2HourlyEmployee[];
  readonly salariedEmployees: readonly V2SalariedEmployee[];
  readonly holidayLiabilityAdjustmentYtdMay: number;
  readonly juneHolidayLiabilityAdjustment: number;
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly systemAssessedHolidayLiability: number;
  readonly bankStartBalance: number;
}

const JANUARY_THROUGH_MAY = V2_MONTHS.slice(0, 5);

function buildMonth(input: V2CaseBuildInput, month: V2MonthId): V2ReferenceMonth {
  const hourlyPayroll = input.hourlyEmployees.map(employee => calculatePayroll({
    employeeId: employee.id,
    employeeGroup: 'hourly',
    grossSalary: employee.hours[month] * employee.hourlyRate,
    taxRate: employee.taxRate,
    monthlyDeduction: employee.monthlyDeduction,
  }));
  const salariedPayroll = input.salariedEmployees.map(employee => calculatePayroll({
    employeeId: employee.id,
    employeeGroup: 'salaried',
    grossSalary: employee.monthlySalary,
    taxRate: employee.taxRate,
    monthlyDeduction: employee.monthlyDeduction,
  }));
  const hourlyHolidayPay = hourlyPayroll.map((payroll, index) => calculateHolidayPay(
    payroll.employeeId,
    payroll.grossSalary,
    input.hourlyEmployees[index].taxRate,
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

function month(history: readonly V2ReferenceMonth[], id: V2MonthId): V2ReferenceMonth {
  const result = history.find(candidate => candidate.month === id);
  if (!result) throw new Error('Missing V2.1 month: ' + id);
  return result;
}

function sumMonths(
  history: readonly V2ReferenceMonth[],
  months: readonly V2MonthId[],
  select: (value: V2ReferenceMonth) => number,
): number {
  return months.reduce((sum, id) => sum + select(month(history, id)), 0);
}

function balance(
  accountNumber: V2AccountBalance['accountNumber'],
  amount: number,
  side: V2AccountBalance['side'],
): V2AccountBalance {
  return Object.freeze({ accountNumber, amount, side });
}

function field(id: V2DocumentSourceField['id'], label: string, amount: number): V2DocumentSourceField {
  return Object.freeze({ id, label, amount });
}

export function buildV2SourceCase(input: V2CaseBuildInput): V2SourceCase {
  const history = deepFreezeLevel2(V2_MONTHS.map(id => buildMonth(input, id)));
  const may = month(history, 'may');
  const june = month(history, 'jun');
  const employeeCount = input.hourlyEmployees.length + input.salariedEmployees.length;
  const startBalances = deepFreezeLevel2([
    balance('2210', sumMonths(history, JANUARY_THROUGH_MAY, value => value.hourlyTotals.amBase), 'debit'),
    balance('2211', sumMonths(history, JANUARY_THROUGH_MAY, value => value.salariedTotals.amBase), 'debit'),
    balance('2215', sumMonths(history, JANUARY_THROUGH_MAY, value =>
      value.hourlyTotals.employeePension + value.hourlyTotals.employerPension +
      value.salariedTotals.employeePension + value.salariedTotals.employerPension), 'debit'),
    balance('2223', sumMonths(history, JANUARY_THROUGH_MAY, value =>
      value.hourlyTotals.employeeAtp + value.hourlyTotals.employerAtp +
      value.salariedTotals.employeeAtp + value.salariedTotals.employerAtp), 'debit'),
    balance('2230', sumMonths(history, JANUARY_THROUGH_MAY, value => value.hourlyHolidayTotals.grossHolidayPay), 'debit'),
    balance('2235', input.holidayLiabilityAdjustmentYtdMay, 'debit'),
    balance('5820', input.bankStartBalance, input.bankStartBalance === 0 ? 'zero' : 'debit'),
    balance('6920', may.hourlyTotals.aTax + may.salariedTotals.aTax + may.hourlyHolidayTotals.aTax, 'credit'),
    balance('6921', employeeCount * 5 * V2_RATES.totalAtp, 'credit'),
    balance('6922', may.hourlyTotals.employeePension + may.hourlyTotals.employerPension +
      may.salariedTotals.employeePension + may.salariedTotals.employerPension, 'credit'),
    balance('6923', may.hourlyHolidayTotals.netHolidayPay, 'credit'),
    balance('6924', input.holidayLiabilityBeforeAdjustment, 'credit'),
    balance('6930', may.hourlyTotals.amContribution + may.salariedTotals.amContribution +
      may.hourlyHolidayTotals.amContribution, 'credit'),
  ]);
  const startAmount = (accountNumber: V2AccountBalance['accountNumber']): number => {
    const result = startBalances.find(candidate => candidate.accountNumber === accountNumber);
    if (!result) throw new Error('Missing V2.1 start balance: ' + accountNumber);
    return result.amount;
  };

  const tallies = deepFreezeLevel2([
    { id: 'hourly-gross-pay-ytd', employeeGroup: 'hourly', measure: 'gross-pay', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyTotals.grossSalary), source: 'payroll-system', presentationLabel: 'Bruttoløn ÅTD – timelønnede' },
    { id: 'hourly-employee-pension-ytd', employeeGroup: 'hourly', measure: 'employee-pension', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyTotals.employeePension), source: 'payroll-system', presentationLabel: 'Medarbejderpension ÅTD – timelønnede' },
    { id: 'hourly-employee-atp-ytd', employeeGroup: 'hourly', measure: 'employee-atp', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyTotals.employeeAtp), source: 'payroll-system', presentationLabel: 'Medarbejder-ATP ÅTD – timelønnede' },
    { id: 'hourly-employer-pension-ytd', employeeGroup: 'hourly', measure: 'employer-pension', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyTotals.employerPension), source: 'payroll-system', presentationLabel: 'Arbejdsgiverpension ÅTD – timelønnede' },
    { id: 'hourly-employer-atp-ytd', employeeGroup: 'hourly', measure: 'employer-atp', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyTotals.employerAtp), source: 'payroll-system', presentationLabel: 'Arbejdsgiver-ATP ÅTD – timelønnede' },
    { id: 'hourly-gross-holiday-pay-ytd', employeeGroup: 'hourly', measure: 'gross-holiday-pay', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.hourlyHolidayTotals.grossHolidayPay), source: 'payroll-system', presentationLabel: 'Bruttoferiepenge ÅTD – timelønnede' },
    { id: 'salaried-gross-pay-ytd', employeeGroup: 'salaried', measure: 'gross-pay', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.salariedTotals.grossSalary), source: 'payroll-system', presentationLabel: 'Bruttoløn ÅTD – månedslønnede' },
    { id: 'salaried-employee-pension-ytd', employeeGroup: 'salaried', measure: 'employee-pension', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.salariedTotals.employeePension), source: 'payroll-system', presentationLabel: 'Medarbejderpension ÅTD – månedslønnede' },
    { id: 'salaried-employee-atp-ytd', employeeGroup: 'salaried', measure: 'employee-atp', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.salariedTotals.employeeAtp), source: 'payroll-system', presentationLabel: 'Medarbejder-ATP ÅTD – månedslønnede' },
    { id: 'salaried-employer-pension-ytd', employeeGroup: 'salaried', measure: 'employer-pension', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.salariedTotals.employerPension), source: 'payroll-system', presentationLabel: 'Arbejdsgiverpension ÅTD – månedslønnede' },
    { id: 'salaried-employer-atp-ytd', employeeGroup: 'salaried', measure: 'employer-atp', period: 'ytd-through-2026-06', amount: sumMonths(history, V2_MONTHS, value => value.salariedTotals.employerAtp), source: 'payroll-system', presentationLabel: 'Arbejdsgiver-ATP ÅTD – månedslønnede' },
    { id: 'holiday-liability-adjustment-ytd', employeeGroup: 'all', measure: 'holiday-liability-adjustment', period: 'ytd-through-2026-06', amount: input.holidayLiabilityAdjustmentYtdMay + input.juneHolidayLiabilityAdjustment, source: 'payroll-system', presentationLabel: 'Regulering af feriepengeforpligtelse ÅTD' },
    { id: 'holiday-liability-system-assessed', employeeGroup: 'all', measure: 'holiday-liability-balance', period: 'as-of-2026-06-30', amount: input.systemAssessedHolidayLiability, source: 'payroll-system', presentationLabel: 'Systemopgjort feriepengeforpligtelse pr. 30/6' },
  ] satisfies readonly V2ExternalTally[]);

  const liabilityControls = deepFreezeLevel2([
    { id: 'june-a-tax', accountNumber: '6920', amount: june.hourlyTotals.aTax + june.salariedTotals.aTax + june.hourlyHolidayTotals.aTax, period: 'june-2026', source: 'settlement-report', presentationLabel: 'A-skat vedr. juni' },
    { id: 'june-am-contribution', accountNumber: '6930', amount: june.hourlyTotals.amContribution + june.salariedTotals.amContribution + june.hourlyHolidayTotals.amContribution, period: 'june-2026', source: 'settlement-report', presentationLabel: 'AM-bidrag vedr. juni' },
    { id: 'june-pension', accountNumber: '6922', amount: june.hourlyTotals.employeePension + june.hourlyTotals.employerPension + june.salariedTotals.employeePension + june.salariedTotals.employerPension, period: 'june-2026', source: 'settlement-report', presentationLabel: 'Pension vedr. juni' },
    { id: 'atp-as-of-june-30', accountNumber: '6921', amount: employeeCount * 6 * V2_RATES.totalAtp, period: 'as-of-2026-06-30', source: 'settlement-report', presentationLabel: 'ATP akkumuleret pr. 30/6' },
    { id: 'june-net-holiday-pay', accountNumber: '6923', amount: june.hourlyHolidayTotals.netHolidayPay, period: 'june-2026', source: 'settlement-report', presentationLabel: 'Nettoferiepenge til FerieKonto vedr. juni' },
    { id: 'holiday-liability-as-of-june-30', accountNumber: '6924', amount: input.systemAssessedHolidayLiability, period: 'as-of-2026-06-30', source: 'payroll-system', presentationLabel: 'Systemopgjort feriepengeforpligtelse' },
  ] satisfies readonly V2LiabilityControl[]);

  const documentSources = deepFreezeLevel2([
    { id: 'B1', title: V2_DOCUMENT_TITLES.B1, period: 'june-2026', fields: [field('may-a-tax', 'Skyldig A-skat vedr. maj', startAmount('6920')), field('may-am-contribution', 'Skyldigt AM-bidrag vedr. maj', startAmount('6930'))], visibleTallyIds: [] },
    { id: 'B2', title: V2_DOCUMENT_TITLES.B2, period: 'june-2026', fields: [field('may-pension', 'Skyldig pension vedr. maj', startAmount('6922'))], visibleTallyIds: [] },
    { id: 'B3', title: V2_DOCUMENT_TITLES.B3, period: 'june-2026', fields: [field('may-net-holiday-pay', 'Nettoferiepenge vedr. maj', startAmount('6923'))], visibleTallyIds: [] },
    { id: 'B4', title: V2_DOCUMENT_TITLES.B4, period: 'june-2026', fields: [field('june-hourly-gross-pay', 'Bruttoløn – timelønnede – juni', june.hourlyTotals.grossSalary)], visibleTallyIds: ['hourly-gross-pay-ytd', 'hourly-employee-pension-ytd', 'hourly-employee-atp-ytd'] },
    { id: 'B5', title: V2_DOCUMENT_TITLES.B5, period: 'june-2026', fields: [field('june-hourly-employer-pension', 'Arbejdsgiverpension – timelønnede – juni', june.hourlyTotals.employerPension), field('june-hourly-employer-atp', 'Arbejdsgiver-ATP – timelønnede – juni', june.hourlyTotals.employerAtp)], visibleTallyIds: ['hourly-employer-pension-ytd', 'hourly-employer-atp-ytd'] },
    { id: 'B6', title: V2_DOCUMENT_TITLES.B6, period: 'june-2026', fields: [field('june-hourly-gross-holiday-pay', 'Bruttoferiepenge – juni', june.hourlyHolidayTotals.grossHolidayPay)], visibleTallyIds: ['hourly-gross-holiday-pay-ytd'] },
    { id: 'B7', title: V2_DOCUMENT_TITLES.B7, period: 'june-2026', fields: [field('june-salaried-gross-pay', 'Bruttoløn – månedslønnede – juni', june.salariedTotals.grossSalary)], visibleTallyIds: ['salaried-gross-pay-ytd', 'salaried-employee-pension-ytd', 'salaried-employee-atp-ytd'] },
    { id: 'B8', title: V2_DOCUMENT_TITLES.B8, period: 'june-2026', fields: [field('june-salaried-employer-pension', 'Arbejdsgiverpension – månedslønnede – juni', june.salariedTotals.employerPension), field('june-salaried-employer-atp', 'Arbejdsgiver-ATP – månedslønnede – juni', june.salariedTotals.employerAtp)], visibleTallyIds: ['salaried-employer-pension-ytd', 'salaried-employer-atp-ytd'] },
    { id: 'B9', title: V2_DOCUMENT_TITLES.B9, period: 'june-2026', fields: [field('holiday-liability-before-adjustment', 'Bogført saldo før regulering', input.holidayLiabilityBeforeAdjustment), field('holiday-liability-system-assessed', 'Systemopgjort saldo pr. 30/6', input.systemAssessedHolidayLiability)], visibleTallyIds: ['holiday-liability-system-assessed'] },
  ] satisfies readonly V2DocumentSource[]);

  return deepFreezeLevel2({
    identity: V2_VERSION_IDENTITY,
    accounts: V2_ACCOUNTS,
    hourlyEmployees: input.hourlyEmployees,
    salariedEmployees: input.salariedEmployees,
    history,
    startBalances,
    documentSources,
    tallies,
    liabilityControls,
  });
}

function comparison(bookedAmount: number, controlAmount: number): V2ReconciliationComparison {
  return Object.freeze({ bookedAmount, controlAmount, difference: reconciliationDifference(bookedAmount, controlAmount) });
}

export function buildV2AnswerKey(source: V2SourceCase, input: V2CaseBuildInput): V2AnswerKey {
  const june = month(source.history, 'jun');
  const startAmount = (accountNumber: V2AccountBalance['accountNumber']): number =>
    getV2Balance(source.startBalances, accountNumber).amount;
  const documents: readonly V2ExpectedDocument[] = deepFreezeLevel2([
    createV2ExpectedDocument('B1', V2_DOCUMENT_TITLES.B1, [
      { accountNumber: '6920', side: 'debit', amount: startAmount('6920'), text: 'A-skat vedr. maj' },
      { accountNumber: '6930', side: 'debit', amount: startAmount('6930'), text: 'AM-bidrag vedr. maj' },
      { accountNumber: '5820', side: 'credit', amount: startAmount('6920') + startAmount('6930'), text: 'Betaling via bank' },
    ]),
    createV2ExpectedDocument('B2', V2_DOCUMENT_TITLES.B2, [
      { accountNumber: '6922', side: 'debit', amount: startAmount('6922'), text: 'Pension vedr. maj' },
      { accountNumber: '5820', side: 'credit', amount: startAmount('6922'), text: 'Betaling via bank' },
    ]),
    createV2ExpectedDocument('B3', V2_DOCUMENT_TITLES.B3, [
      { accountNumber: '6923', side: 'debit', amount: startAmount('6923'), text: 'Nettoferiepenge vedr. maj' },
      { accountNumber: '5820', side: 'credit', amount: startAmount('6923'), text: 'Betaling via bank' },
    ]),
    createV2ExpectedDocument('B4', V2_DOCUMENT_TITLES.B4, [
      { accountNumber: '2210', side: 'debit', amount: june.hourlyTotals.amBase, text: 'Løn efter eget ATP og pension' },
      { accountNumber: '2215', side: 'debit', amount: june.hourlyTotals.employeePension, text: 'Medarbejderpension' },
      { accountNumber: '2223', side: 'debit', amount: june.hourlyTotals.employeeAtp, text: 'Medarbejder-ATP' },
      { accountNumber: '6920', side: 'credit', amount: june.hourlyTotals.aTax, text: 'Skyldig A-skat' },
      { accountNumber: '6930', side: 'credit', amount: june.hourlyTotals.amContribution, text: 'Skyldig AM-bidrag' },
      { accountNumber: '6922', side: 'credit', amount: june.hourlyTotals.employeePension, text: 'Skyldig medarbejderpension' },
      { accountNumber: '6921', side: 'credit', amount: june.hourlyTotals.employeeAtp, text: 'Skyldig medarbejder-ATP' },
      { accountNumber: '5820', side: 'credit', amount: june.hourlyTotals.netPay, text: 'Nettoløn' },
    ]),
    createV2ExpectedDocument('B5', V2_DOCUMENT_TITLES.B5, [
      { accountNumber: '2215', side: 'debit', amount: june.hourlyTotals.employerPension, text: 'Arbejdsgiverpension' },
      { accountNumber: '2223', side: 'debit', amount: june.hourlyTotals.employerAtp, text: 'Arbejdsgiver-ATP' },
      { accountNumber: '6922', side: 'credit', amount: june.hourlyTotals.employerPension, text: 'Skyldig arbejdsgiverpension' },
      { accountNumber: '6921', side: 'credit', amount: june.hourlyTotals.employerAtp, text: 'Skyldig arbejdsgiver-ATP' },
    ]),
    createV2ExpectedDocument('B6', V2_DOCUMENT_TITLES.B6, [
      { accountNumber: '2230', side: 'debit', amount: june.hourlyHolidayTotals.grossHolidayPay, text: 'Bruttoferiepenge' },
      { accountNumber: '6930', side: 'credit', amount: june.hourlyHolidayTotals.amContribution, text: 'AM-bidrag af feriepenge' },
      { accountNumber: '6920', side: 'credit', amount: june.hourlyHolidayTotals.aTax, text: 'A-skat af feriepenge' },
      { accountNumber: '6923', side: 'credit', amount: june.hourlyHolidayTotals.netHolidayPay, text: 'Nettoferiepenge' },
    ]),
    createV2ExpectedDocument('B7', V2_DOCUMENT_TITLES.B7, [
      { accountNumber: '2211', side: 'debit', amount: june.salariedTotals.amBase, text: 'Løn efter eget ATP og pension' },
      { accountNumber: '2215', side: 'debit', amount: june.salariedTotals.employeePension, text: 'Medarbejderpension' },
      { accountNumber: '2223', side: 'debit', amount: june.salariedTotals.employeeAtp, text: 'Medarbejder-ATP' },
      { accountNumber: '6920', side: 'credit', amount: june.salariedTotals.aTax, text: 'Skyldig A-skat' },
      { accountNumber: '6930', side: 'credit', amount: june.salariedTotals.amContribution, text: 'Skyldig AM-bidrag' },
      { accountNumber: '6922', side: 'credit', amount: june.salariedTotals.employeePension, text: 'Skyldig medarbejderpension' },
      { accountNumber: '6921', side: 'credit', amount: june.salariedTotals.employeeAtp, text: 'Skyldig medarbejder-ATP' },
      { accountNumber: '5820', side: 'credit', amount: june.salariedTotals.netPay, text: 'Nettoløn' },
    ]),
    createV2ExpectedDocument('B8', V2_DOCUMENT_TITLES.B8, [
      { accountNumber: '2215', side: 'debit', amount: june.salariedTotals.employerPension, text: 'Arbejdsgiverpension' },
      { accountNumber: '2223', side: 'debit', amount: june.salariedTotals.employerAtp, text: 'Arbejdsgiver-ATP' },
      { accountNumber: '6922', side: 'credit', amount: june.salariedTotals.employerPension, text: 'Skyldig arbejdsgiverpension' },
      { accountNumber: '6921', side: 'credit', amount: june.salariedTotals.employerAtp, text: 'Skyldig arbejdsgiver-ATP' },
    ]),
    createV2ExpectedDocument('B9', V2_DOCUMENT_TITLES.B9, [
      { accountNumber: '2235', side: 'debit', amount: input.juneHolidayLiabilityAdjustment, text: 'Regulering af feriepengeforpligtelse' },
      { accountNumber: '6924', side: 'credit', amount: input.juneHolidayLiabilityAdjustment, text: 'Feriepengeforpligtelse ultimo' },
    ]),
  ]);
  const finalBalances = applyV2Ledger(source.startBalances, documents);
  const gross = (
    wageAccount: '2210' | '2211',
    pensionId: V2TallyId,
    atpId: V2TallyId,
    grossId: V2GrossPayReconciliation['externalTallyId'],
  ): V2GrossPayReconciliation => {
    const wageAccountYtd = getV2Balance(finalBalances, wageAccount).amount;
    const employeePensionYtd = getV2Tally(source.tallies, pensionId).amount;
    const employeeAtpYtd = getV2Tally(source.tallies, atpId).amount;
    const calculatedGrossPayYtd = wageAccountYtd + employeePensionYtd + employeeAtpYtd;
    const controlAmount = getV2Tally(source.tallies, grossId).amount;
    return Object.freeze({ wageAccountYtd, employeePensionYtd, employeeAtpYtd, calculatedGrossPayYtd, externalTallyId: grossId, bookedAmount: calculatedGrossPayYtd, controlAmount, difference: reconciliationDifference(calculatedGrossPayYtd, controlAmount) });
  };
  const hourlyEmployeePension = getV2Tally(source.tallies, 'hourly-employee-pension-ytd').amount;
  const salariedEmployeePension = getV2Tally(source.tallies, 'salaried-employee-pension-ytd').amount;
  const hourlyEmployeeAtp = getV2Tally(source.tallies, 'hourly-employee-atp-ytd').amount;
  const salariedEmployeeAtp = getV2Tally(source.tallies, 'salaried-employee-atp-ytd').amount;
  const otherCosts: V2OtherCostReconciliation = deepFreezeLevel2({
    employerPension: comparison(getV2Balance(finalBalances, '2215').amount - hourlyEmployeePension - salariedEmployeePension, getV2Tally(source.tallies, 'hourly-employer-pension-ytd').amount + getV2Tally(source.tallies, 'salaried-employer-pension-ytd').amount),
    employerAtp: comparison(getV2Balance(finalBalances, '2223').amount - hourlyEmployeeAtp - salariedEmployeeAtp, getV2Tally(source.tallies, 'hourly-employer-atp-ytd').amount + getV2Tally(source.tallies, 'salaried-employer-atp-ytd').amount),
    grossHolidayPay: comparison(getV2Balance(finalBalances, '2230').amount, getV2Tally(source.tallies, 'hourly-gross-holiday-pay-ytd').amount),
    holidayLiabilityAdjustment: comparison(getV2Balance(finalBalances, '2235').amount, getV2Tally(source.tallies, 'holiday-liability-adjustment-ytd').amount),
  });
  const operatingTotal = (['2210', '2211', '2215', '2223', '2230', '2235'] as const)
    .reduce((sum, accountNumber) => sum + getV2Balance(finalBalances, accountNumber).amount, 0);
  const tallyTotal = getV2Tally(source.tallies, 'hourly-gross-pay-ytd').amount +
    getV2Tally(source.tallies, 'salaried-gross-pay-ytd').amount +
    otherCosts.employerPension.controlAmount + otherCosts.employerAtp.controlAmount +
    otherCosts.grossHolidayPay.controlAmount + otherCosts.holidayLiabilityAdjustment.controlAmount;
  const controlIds = ['june-a-tax', 'june-am-contribution', 'june-pension', 'atp-as-of-june-30', 'june-net-holiday-pay', 'holiday-liability-as-of-june-30'] as const satisfies readonly V2LiabilityControlId[];
  const liabilities = controlIds.map((controlId): V2LiabilityReconciliation => {
    const control = getV2LiabilityControl(source.liabilityControls, controlId);
    const value = getV2Balance(finalBalances, control.accountNumber);
    return Object.freeze({ accountNumber: control.accountNumber, bookedSide: 'credit', controlId, bookedAmount: value.amount, controlAmount: control.amount, difference: reconciliationDifference(value.amount, control.amount) });
  });
  return deepFreezeLevel2({
    documents,
    reconciliation: {
      A: gross('2210', 'hourly-employee-pension-ytd', 'hourly-employee-atp-ytd', 'hourly-gross-pay-ytd'),
      B: gross('2211', 'salaried-employee-pension-ytd', 'salaried-employee-atp-ytd', 'salaried-gross-pay-ytd'),
      C: otherCosts,
      D: comparison(operatingTotal, tallyTotal),
      E: liabilities,
    },
    finalBalances,
    operatingTotal,
  });
}
