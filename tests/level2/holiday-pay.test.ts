import { describe, expect, it } from 'vitest';
import { R1_HISTORY, calculateHolidayPay } from '../../src/domain/level2';

describe('Niveau 2 feriepenge', () => {
  it('beregner juni pr. timelønnet uden månedsfradrag', () => {
    expect(R1_HISTORY.jun.hourlyHolidayPay).toEqual([
      { employeeId: 'T1', holidayEligibleSalary: 37200, taxRate: 36, grossHolidayPay: 4650, amContribution: 372, taxBase: 4278, aTax: 1540, netHolidayPay: 2738 },
      { employeeId: 'T2', holidayEligibleSalary: 39600, taxRate: 37, grossHolidayPay: 4950, amContribution: 396, taxBase: 4554, aTax: 1685, netHolidayPay: 2869 },
      { employeeId: 'T3', holidayEligibleSalary: 41400, taxRate: 38, grossHolidayPay: 5175, amContribution: 414, taxBase: 4761, aTax: 1809, netHolidayPay: 2952 },
      { employeeId: 'T4', holidayEligibleSalary: 45000, taxRate: 39, grossHolidayPay: 5625, amContribution: 450, taxBase: 5175, aTax: 2018, netHolidayPay: 3157 },
    ]);
  });

  it('reproducerer juni-totalen efter individuel afrunding', () => {
    expect(R1_HISTORY.jun.hourlyHolidayTotals).toEqual({
      grossHolidayPay: 20400,
      amContribution: 1632,
      aTax: 7052,
      netHolidayPay: 11716,
    });
  });

  it('afviser beløb med øre i input', () => {
    expect(() => calculateHolidayPay('T1', 1000.5, 36)).toThrow(/whole-krone/);
  });
});
