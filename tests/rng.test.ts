import { describe, expect, it } from 'vitest';
import { fnv1a32, mulberry32, seedInput } from '../src/domain/payroll';

describe('FNV-1a og Mulberry32', () => {
  it.each([
    ['', 0x811c9dc5],
    ['a', 0xe40c292c],
    ['foobar', 0xbf9cf968],
  ])('hasher %j med standard FNV-1a 32-bit', (input, expected) => {
    expect(fnv1a32(input)).toBe(expected);
  });

  it('låser seed-inputkontrakten', () => {
    expect(seedInput(42)).toBe('payroll:v1:42');
    expect(fnv1a32(seedInput(42))).toBe(1981966991);
  });

  it('giver deterministiske draws i intervallet [0,1)', () => {
    const left = mulberry32(123456);
    const right = mulberry32(123456);
    const a = Array.from({ length: 20 }, () => left());
    const b = Array.from({ length: 20 }, () => right());
    expect(a).toEqual(b);
    expect(a.every(value => value >= 0 && value < 1)).toBe(true);
  });
});