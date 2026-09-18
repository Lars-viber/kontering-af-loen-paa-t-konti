import { describe, expect, it } from 'vitest';
import { parseAmount } from '../src/domain/payroll';

describe('Streng beløbsparser', () => {
  it.each([
    ['', 0], ['   ', 0], ['0', 0], ['00012', 12],
    ['145812', 145812], ['145.812', 145812], ['145 812', 145812],
    ['1.000', 1000], ['12.000', 12000], ['1.234.567', 1234567],
    ['1 000', 1000], ['12 000', 12000], ['1 234 567', 1234567],
    ['145\u00a0812', 145812], ['145\u202f812', 145812],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
  ])('accepterer %j som %i', (input, value) => {
    expect(parseAmount(input)).toEqual({ ok: true, value });
  });

  it.each([
    '-1', '+1', '1,5', '1.000,00', '145,812', '1.2', 'abc', '12kr', '12,-',
    '1e3', 'Infinity', 'NaN', '1.00', '14.58', '145.81', '1.23.456',
    '1 00', '14 58', '145 81', '1 23 456', '1.000 000', '1 000.000',
  ])('afviser formatet %j', input => {
    expect(parseAmount(input)).toEqual({ ok: false, error: 'invalid-format' });
  });

  it('afviser unsafe integer', () => {
    expect(parseAmount('9007199254740992')).toEqual({ ok: false, error: 'unsafe-integer' });
  });
});