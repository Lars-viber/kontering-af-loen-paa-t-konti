import { describe, expect, it } from 'vitest';
import {
  R1_V2_ANSWER_KEY,
  R1_V2_SOURCE,
  assertV2AnswerKey,
  getV2Balance,
  getV2Tally,
  type V2AnswerKey,
} from '../../src/domain/level2/v2';

describe('Niveau 2 V2.1 tælleværker og checkpoint A-E', () => {
  it('afleder alle synlige ÅTD-tælleværker fra januar-juni', () => {
    expect(Object.fromEntries(R1_V2_SOURCE.tallies.map(tally => [tally.id, tally.amount]))).toEqual({
      'hourly-gross-pay-ytd': 956570,
      'hourly-employee-pension-ytd': 38262,
      'hourly-employee-atp-ytd': 2376,
      'hourly-employer-pension-ytd': 76526,
      'hourly-employer-atp-ytd': 4752,
      'hourly-gross-holiday-pay-ytd': 119574,
      'salaried-gross-pay-ytd': 1215000,
      'salaried-employee-pension-ytd': 48600,
      'salaried-employee-atp-ytd': 2376,
      'salaried-employer-pension-ytd': 97200,
      'salaried-employer-atp-ytd': 4752,
      'holiday-liability-adjustment-ytd': 32500,
      'holiday-liability-system-assessed': 182500,
    });
  });

  it('afstemmer checkpoint A og B mod eksterne bruttolønstælleværker', () => {
    expect(R1_V2_ANSWER_KEY.reconciliation.A).toEqual({
      wageAccountYtd: 915932,
      employeePensionYtd: 38262,
      employeeAtpYtd: 2376,
      calculatedGrossPayYtd: 956570,
      externalTallyId: 'hourly-gross-pay-ytd',
      bookedAmount: 956570,
      controlAmount: 956570,
      difference: 0,
    });
    expect(R1_V2_ANSWER_KEY.reconciliation.B).toEqual({
      wageAccountYtd: 1164024,
      employeePensionYtd: 48600,
      employeeAtpYtd: 2376,
      calculatedGrossPayYtd: 1215000,
      externalTallyId: 'salaried-gross-pay-ytd',
      bookedAmount: 1215000,
      controlAmount: 1215000,
      difference: 0,
    });
  });

  it('afstemmer checkpoint C via uafhængige bogførings- og kontrolveje', () => {
    const pensionBooked = getV2Balance(R1_V2_ANSWER_KEY.finalBalances, '2215').amount - 38262 - 48600;
    const pensionControl =
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-pension-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-pension-ytd').amount;
    const atpBooked = getV2Balance(R1_V2_ANSWER_KEY.finalBalances, '2223').amount - 2376 - 2376;
    const atpControl =
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-atp-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-atp-ytd').amount;

    expect([pensionBooked, pensionControl]).toEqual([173726, 173726]);
    expect([atpBooked, atpControl]).toEqual([9504, 9504]);
    expect(R1_V2_ANSWER_KEY.reconciliation.C).toEqual({
      employerPension: { bookedAmount: 173726, controlAmount: 173726, difference: 0 },
      employerAtp: { bookedAmount: 9504, controlAmount: 9504, difference: 0 },
      grossHolidayPay: { bookedAmount: 119574, controlAmount: 119574, difference: 0 },
      holidayLiabilityAdjustment: { bookedAmount: 32500, controlAmount: 32500, difference: 0 },
    });
  });

  it('afleder checkpoint D fra de viste komponenter', () => {
    const sumOfTallies =
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-gross-pay-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'salaried-gross-pay-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-pension-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-pension-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-employer-atp-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'salaried-employer-atp-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'hourly-gross-holiday-pay-ytd').amount +
      getV2Tally(R1_V2_SOURCE.tallies, 'holiday-liability-adjustment-ytd').amount;
    expect(sumOfTallies).toBe(2506874);
    expect(R1_V2_ANSWER_KEY.reconciliation.D).toEqual({
      bookedAmount: 2506874,
      controlAmount: 2506874,
      difference: 0,
    });
  });

  it('afstemmer checkpoint E med kredit-side og seks eksterne kontrolbeløb', () => {
    expect(R1_V2_SOURCE.liabilityControls.map(control => [
      control.accountNumber,
      control.amount,
    ])).toEqual([
      ['6920', 114447],
      ['6930', 29654],
      ['6922', 43884],
      ['6921', 14256],
      ['6923', 11716],
      ['6924', 182500],
    ]);
    expect(R1_V2_ANSWER_KEY.reconciliation.E).toEqual([
      { accountNumber: '6920', bookedSide: 'credit', controlId: 'june-a-tax', bookedAmount: 114447, controlAmount: 114447, difference: 0 },
      { accountNumber: '6930', bookedSide: 'credit', controlId: 'june-am-contribution', bookedAmount: 29654, controlAmount: 29654, difference: 0 },
      { accountNumber: '6922', bookedSide: 'credit', controlId: 'june-pension', bookedAmount: 43884, controlAmount: 43884, difference: 0 },
      { accountNumber: '6921', bookedSide: 'credit', controlId: 'atp-as-of-june-30', bookedAmount: 14256, controlAmount: 14256, difference: 0 },
      { accountNumber: '6923', bookedSide: 'credit', controlId: 'june-net-holiday-pay', bookedAmount: 11716, controlAmount: 11716, difference: 0 },
      { accountNumber: '6924', bookedSide: 'credit', controlId: 'holiday-liability-as-of-june-30', bookedAmount: 182500, controlAmount: 182500, difference: 0 },
    ]);
  });

  it('har difference 0 i samtlige afstemninger', () => {
    const comparisons = [
      R1_V2_ANSWER_KEY.reconciliation.A,
      R1_V2_ANSWER_KEY.reconciliation.B,
      ...Object.values(R1_V2_ANSWER_KEY.reconciliation.C),
      R1_V2_ANSWER_KEY.reconciliation.D,
      ...R1_V2_ANSWER_KEY.reconciliation.E,
    ];
    expect(comparisons).toHaveLength(13);
    expect(comparisons.every(item => item.difference === 0)).toBe(true);
  });

  it('afviser en ubalanceret answer key ved runtime-validation', () => {
    const invalid = structuredClone(R1_V2_ANSWER_KEY) as unknown as V2AnswerKey;
    (invalid.documents[0] as { creditTotal: number }).creditTotal = 0;
    expect(() => assertV2AnswerKey(R1_V2_SOURCE, invalid)).toThrow('B1 is not balanced');
  });
});
