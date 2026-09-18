import { describe, expect, it } from 'vitest';
import {
  R1_HISTORY,
  calculatePayroll,
  roundWholeKrone,
} from '../../src/domain/level2';

describe('Niveau 2 medarbejderløn', () => {
  it('bruger den frosne helkroneafrunding, inklusive .5 opad', () => {
    expect(roundWholeKrone(1.49)).toBe(1);
    expect(roundWholeKrone(1.5)).toBe(2);
    expect(roundWholeKrone(2.5)).toBe(3);
  });

  it('beregner juni pr. timelønnet før summering', () => {
    expect(R1_HISTORY.jun.hourlyPayroll).toEqual([
      {
        employeeId: 'T1', employeeGroup: 'hourly', grossSalary: 37200, taxRate: 36, monthlyDeduction: 4500,
        employeePension: 1488, employerPension: 2976, employeeAtp: 99, employerAtp: 198,
        amBase: 35613, amContribution: 2849, taxBase: 28264, aTax: 10175, netPay: 22589,
      },
      {
        employeeId: 'T2', employeeGroup: 'hourly', grossSalary: 39600, taxRate: 37, monthlyDeduction: 4750,
        employeePension: 1584, employerPension: 3168, employeeAtp: 99, employerAtp: 198,
        amBase: 37917, amContribution: 3033, taxBase: 30134, aTax: 11150, netPay: 23734,
      },
      {
        employeeId: 'T3', employeeGroup: 'hourly', grossSalary: 41400, taxRate: 38, monthlyDeduction: 5000,
        employeePension: 1656, employerPension: 3312, employeeAtp: 99, employerAtp: 198,
        amBase: 39645, amContribution: 3172, taxBase: 31473, aTax: 11960, netPay: 24513,
      },
      {
        employeeId: 'T4', employeeGroup: 'hourly', grossSalary: 45000, taxRate: 39, monthlyDeduction: 5250,
        employeePension: 1800, employerPension: 3600, employeeAtp: 99, employerAtp: 198,
        amBase: 43101, amContribution: 3448, taxBase: 34403, aTax: 13417, netPay: 26236,
      },
    ]);
    expect(R1_HISTORY.jun.hourlyTotals).toEqual({
      grossSalary: 163200, employeePension: 6528, employerPension: 13056,
      employeeAtp: 396, employerAtp: 792, amBase: 156276,
      amContribution: 12502, aTax: 46702, netPay: 97072,
    });
  });

  it('reproducerer månedslønnede og summerer individuelt afrundede værdier', () => {
    expect(R1_HISTORY.jun.salariedTotals).toEqual({
      grossSalary: 202500, employeePension: 8100, employerPension: 16200,
      employeeAtp: 396, employerAtp: 792, amBase: 194004,
      amContribution: 15520, aTax: 60693, netPay: 117791,
    });
  });

  it('klamper et negativt skattegrundlag til nul A-skat', () => {
    const result = calculatePayroll({
      employeeId: 'EDGE', employeeGroup: 'hourly', grossSalary: 1000,
      taxRate: 40, monthlyDeduction: 5000,
    });
    expect(result.taxBase).toBe(0);
    expect(result.aTax).toBe(0);
  });
});
