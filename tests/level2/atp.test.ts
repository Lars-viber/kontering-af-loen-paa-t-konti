import { describe, expect, it } from 'vitest';
import { R1_ATP, calculateAtp } from '../../src/domain/level2';

describe('Niveau 2 ATP-model', () => {
  it('beregner måneds- og gruppesatser', () => {
    expect(calculateAtp(1)).toEqual({ employeeCount: 1, months: 1, employeeShare: 99, employerShare: 198, total: 297 });
    expect(calculateAtp(8)).toEqual({ employeeCount: 8, months: 1, employeeShare: 792, employerShare: 1584, total: 2376 });
  });

  it('reproducerer Q1, Q2 og januar-juni', () => {
    expect(R1_ATP.q1.total).toBe(7128);
    expect(R1_ATP.q2.total).toBe(7128);
    expect(R1_ATP.januaryThroughMay.total).toBe(11880);
    expect(R1_ATP.januaryThroughJune.total).toBe(14256);
  });
});
