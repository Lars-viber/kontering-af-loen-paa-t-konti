import { describe, expect, it } from 'vitest';
import {
  R1_CHECKPOINT,
  R1_YTD_SPECIFICATION,
  getBalance,
  R1_CHECKPOINT_LEDGER,
} from '../../src/domain/level2';

describe('Niveau 2 checkpoint og ÅTD-specifikation', () => {
  it('afstemmer pension og ATP til de fælles driftskonti', () => {
    expect(R1_YTD_SPECIFICATION.pension).toEqual({
      hourlyEmployee: 38262, hourlyEmployer: 76526,
      salariedEmployee: 48600, salariedEmployer: 97200,
    });
    expect(R1_YTD_SPECIFICATION.atp).toEqual({
      hourlyEmployee: 2376, hourlyEmployer: 4752,
      salariedEmployee: 2376, salariedEmployer: 4752,
    });
    expect(R1_CHECKPOINT.pensionSpecificationTotal).toBe(getBalance(R1_CHECKPOINT_LEDGER, '2215').amount);
    expect(R1_CHECKPOINT.atpSpecificationTotal).toBe(getBalance(R1_CHECKPOINT_LEDGER, '2223').amount);
  });

  it('reproducerer bruttoløn for begge grupper', () => {
    expect(R1_CHECKPOINT.hourlyGrossPayroll).toEqual({
      wageAccount: 915932, employeePension: 38262, employeeAtp: 2376, grossPayroll: 956570,
    });
    expect(R1_CHECKPOINT.salariedGrossPayroll).toEqual({
      wageAccount: 1164024, employeePension: 48600, employeeAtp: 2376, grossPayroll: 1215000,
    });
  });

  it('afstemmer seks driftskonti til 2.506.874', () => {
    expect(R1_CHECKPOINT.otherPayrollCosts).toEqual({
      employerPension: 173726,
      employerAtp: 9504,
      hourlyHolidayPay: 119574,
      holidayLiabilityAdjustment: 32500,
    });
    expect(R1_CHECKPOINT.operatingTotal).toBe(2506874);
    expect(
      R1_CHECKPOINT.hourlyGrossPayroll.grossPayroll +
      R1_CHECKPOINT.salariedGrossPayroll.grossPayroll +
      R1_CHECKPOINT.otherPayrollCosts.employerPension +
      R1_CHECKPOINT.otherPayrollCosts.employerAtp +
      R1_CHECKPOINT.otherPayrollCosts.hourlyHolidayPay +
      R1_CHECKPOINT.otherPayrollCosts.holidayLiabilityAdjustment,
    ).toBe(2506874);
  });
});
