import { describe, expect, it, vi } from 'vitest';
import { browserUint32, pickRandomVariant } from '../src/session';

describe('Random variant picker', () => {
  it('mapper injected uint32 til intervallet', () => {
    expect(pickRandomVariant(undefined, () => 0)).toBe(1);
    expect(pickRandomVariant(undefined, () => 999998)).toBe(999999);
    expect(pickRandomVariant(undefined, () => 999999)).toBe(1);
  });

  it('vælger deterministisk fallback hvis aktiv variant gentages', () => {
    expect(pickRandomVariant(1, () => 0)).toBe(2);
    expect(pickRandomVariant(999999, () => 999998)).toBe(1);
  });

  it('bruger crypto.getRandomValues i browserkilden', () => {
    const original = globalThis.crypto;
    const getRandomValues = vi.fn((array: Uint32Array) => { array[0] = 41; return array; });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } });
    expect(browserUint32()).toBe(41);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original });
  });
});