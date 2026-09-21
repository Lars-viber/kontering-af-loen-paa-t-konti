import { deepFreezeLevel2 } from '../readonly';
import { V2_DOCUMENT_TITLES } from './constants';
import {
  applyV2Ledger,
  createV2ExpectedDocument,
  getV2Balance,
  getV2LiabilityControl,
  getV2Tally,
  reconciliationDifference,
} from './helpers';
import { R1_V2_HOLIDAY_LIABILITY, R1_V2_SOURCE } from './r1Source';
import type {
  V2AnswerKey,
  V2ExpectedDocument,
  V2GrossPayReconciliation,
  V2LiabilityControlId,
  V2LiabilityReconciliation,
  V2MonthId,
  V2OtherCostReconciliation,
  V2ReconciliationComparison,
  V2ReferenceMonth,
  V2TallyId,
} from './types';

function month(id: V2MonthId): V2ReferenceMonth {
  const result = R1_V2_SOURCE.history.find(candidate => candidate.month === id);
  if (!result) throw new Error('Missing R1 V2.1 month: ' + id);
  return result;
}

function startAmount(accountNumber: V2AnswerKey['finalBalances'][number]['accountNumber']): number {
  const result = R1_V2_SOURCE.startBalances.find(candidate => candidate.accountNumber === accountNumber);
  if (!result) throw new Error('Missing R1 V2.1 start balance: ' + accountNumber);
  return result.amount;
}

const june = month('jun');
const holidayLiabilityAdjustment = R1_V2_HOLIDAY_LIABILITY.systemAssessedBalance -
  R1_V2_HOLIDAY_LIABILITY.balanceBeforeAdjustment;

export const R1_V2_EXPECTED_DOCUMENTS: readonly V2ExpectedDocument[] = deepFreezeLevel2([
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
    { accountNumber: '2235', side: 'debit', amount: holidayLiabilityAdjustment, text: 'Regulering af feriepengeforpligtelse' },
    { accountNumber: '6924', side: 'credit', amount: holidayLiabilityAdjustment, text: 'Feriepengeforpligtelse ultimo' },
  ]),
]);

export const R1_V2_FINAL_BALANCES = applyV2Ledger(
  R1_V2_SOURCE.startBalances,
  R1_V2_EXPECTED_DOCUMENTS,
);

function comparison(bookedAmount: number, controlAmount: number): V2ReconciliationComparison {
  return Object.freeze({
    bookedAmount,
    controlAmount,
    difference: reconciliationDifference(bookedAmount, controlAmount),
  });
}

function grossPayReconciliation(
  wageAccount: '2210' | '2211',
  employeePensionTallyId: V2TallyId,
  employeeAtpTallyId: V2TallyId,
  grossPayTallyId: V2GrossPayReconciliation['externalTallyId'],
): V2GrossPayReconciliation {
  const wageAccountYtd = getV2Balance(R1_V2_FINAL_BALANCES, wageAccount).amount;
  const employeePensionYtd = getV2Tally(R1_V2_SOURCE.tallies, employeePensionTallyId).amount;
  const employeeAtpYtd = getV2Tally(R1_V2_SOURCE.tallies, employeeAtpTallyId).amount;
  const calculatedGrossPayYtd = wageAccountYtd + employeePensionYtd + employeeAtpYtd;
  const controlAmount = getV2Tally(R1_V2_SOURCE.tallies, grossPayTallyId).amount;
  return Object.freeze({
    wageAccountYtd,
    employeePensionYtd,
    employeeAtpYtd,
    calculatedGrossPayYtd,
    externalTallyId: grossPayTallyId,
    bookedAmount: calculatedGrossPayYtd,
    controlAmount,
    difference: reconciliationDifference(calculatedGrossPayYtd, controlAmount),
  });
}

const hourlyEmployeePension = getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employee-pension-ytd').amount;
const hourlyEmployerPension = getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-pension-ytd').amount;
const salariedEmployeePension = getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employee-pension-ytd').amount;
const salariedEmployerPension = getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-pension-ytd').amount;
const hourlyEmployeeAtp = getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employee-atp-ytd').amount;
const hourlyEmployerAtp = getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-atp-ytd').amount;
const salariedEmployeeAtp = getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employee-atp-ytd').amount;
const salariedEmployerAtp = getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-atp-ytd').amount;
const grossHolidayPayYtd = getV2Tally(R1_V2_SOURCE.tallies, 'hourly-gross-holiday-pay-ytd').amount;

const otherCosts: V2OtherCostReconciliation = deepFreezeLevel2({
  pension: {
    accountNumber: '2215',
    hourlyEmployeePensionYtd: hourlyEmployeePension,
    hourlyEmployerPensionYtd: hourlyEmployerPension,
    salariedEmployeePensionYtd: salariedEmployeePension,
    salariedEmployerPensionYtd: salariedEmployerPension,
    ...comparison(
      getV2Balance(R1_V2_FINAL_BALANCES, '2215').amount,
      hourlyEmployeePension + hourlyEmployerPension + salariedEmployeePension + salariedEmployerPension,
    ),
  },
  atp: {
    accountNumber: '2223',
    hourlyEmployeeAtpYtd: hourlyEmployeeAtp,
    hourlyEmployerAtpYtd: hourlyEmployerAtp,
    salariedEmployeeAtpYtd: salariedEmployeeAtp,
    salariedEmployerAtpYtd: salariedEmployerAtp,
    ...comparison(
      getV2Balance(R1_V2_FINAL_BALANCES, '2223').amount,
      hourlyEmployeeAtp + hourlyEmployerAtp + salariedEmployeeAtp + salariedEmployerAtp,
    ),
  },
  holidayPay: {
    accountNumber: '2230',
    grossHolidayPayYtd,
    ...comparison(getV2Balance(R1_V2_FINAL_BALANCES, '2230').amount, grossHolidayPayYtd),
  },
});

const operatingAccounts = ['2210', '2211', '2215', '2223', '2230', '2235'] as const;
const operatingTotal = operatingAccounts.reduce(
  (sum, accountNumber) => sum + getV2Balance(R1_V2_FINAL_BALANCES, accountNumber).amount,
  0,
);


const liabilityControlIds = [
  'june-a-tax',
  'june-am-contribution',
  'june-pension',
  'atp-as-of-june-30',
  'june-net-holiday-pay',
  'holiday-liability-as-of-june-30',
] as const satisfies readonly V2LiabilityControlId[];

const liabilityReconciliation = liabilityControlIds.map((controlId): V2LiabilityReconciliation => {
  const control = getV2LiabilityControl(R1_V2_SOURCE.liabilityControls, controlId);
  const balance = getV2Balance(R1_V2_FINAL_BALANCES, control.accountNumber);
  return Object.freeze({
    accountNumber: control.accountNumber,
    bookedSide: 'credit',
    controlId,
    bookedAmount: balance.amount,
    controlAmount: control.amount,
    difference: reconciliationDifference(balance.amount, control.amount),
  });
});

export const R1_V2_ANSWER_KEY: V2AnswerKey = deepFreezeLevel2({
  documents: R1_V2_EXPECTED_DOCUMENTS,
  reconciliation: {
    A: grossPayReconciliation(
      '2210',
      'hourly-employee-pension-ytd',
      'hourly-employee-atp-ytd',
      'hourly-gross-pay-ytd',
    ),
    B: grossPayReconciliation(
      '2211',
      'salaried-employee-pension-ytd',
      'salaried-employee-atp-ytd',
      'salaried-gross-pay-ytd',
    ),
    C: otherCosts,
    D: { operatingTotal },
    E: liabilityReconciliation,
  },
  finalBalances: R1_V2_FINAL_BALANCES,
  operatingTotal,
});
