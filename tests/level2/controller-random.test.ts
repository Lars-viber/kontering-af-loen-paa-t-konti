import { describe, expect, it, vi } from 'vitest';
import {
  browserLevel2Uint32,
  parseLevel2VariantInput,
  randomLevel2Variant,
} from '../../src/level2/controller';

describe('Level 2 variant input and secure random selection', () => {
  it.each([
    ['1', 1],
    ['999999', 999999],
    [' 42 ', 42],
  ])('parses %j as variant %i', (raw, variant) => {
    expect(parseLevel2VariantInput(raw)).toEqual({ ok: true, variant });
  });

  it.each(['', ' ', '0', '1000000', '1.5', 'abc', '+1', '-1'])('rejects invalid input %j', raw => {
    expect(parseLevel2VariantInput(raw)).toEqual({ ok: false });
  });

  it('covers both endpoints and a middle value', () => {
    expect(randomLevel2Variant(() => 0)).toBe(1);
    expect(randomLevel2Variant(() => 999998)).toBe(999999);
    expect(randomLevel2Variant(() => 499999)).toBe(500000);
  });

  it('uses rejection sampling above the unbiased acceptance limit', () => {
    const limit = Math.floor(0x100000000 / 999999) * 999999;
    const draws = [limit, 0xffffffff, 999998];
    let index = 0;
    expect(randomLevel2Variant(() => draws[index++])).toBe(999999);
    expect(index).toBe(3);
  });

  it('always returns an integer in range for representative uint32 values', () => {
    const highestAccepted = Math.floor(0x100000000 / 999999) * 999999 - 1;
    for (const value of [0, 1, 41, 999998, 999999, 123456789, highestAccepted]) {
      const variant = randomLevel2Variant(() => value);
      expect(Number.isInteger(variant)).toBe(true);
      expect(variant).toBeGreaterThanOrEqual(1);
      expect(variant).toBeLessThanOrEqual(999999);
    }
  });

  it('uses crypto.getRandomValues in the browser source', () => {
    const original = globalThis.crypto;
    const getRandomValues = vi.fn((array: Uint32Array) => { array[0] = 41; return array; });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } });
    expect(browserLevel2Uint32()).toBe(41);
    expect(getRandomValues).toHaveBeenCalledOnce();
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original });
  });
});
