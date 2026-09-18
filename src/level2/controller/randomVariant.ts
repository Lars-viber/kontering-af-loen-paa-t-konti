import type { Level2VariantParseResult } from './types';

export type Level2Uint32Source = () => number;

const LEVEL2_VARIANT_COUNT = 999999;
const UINT32_SPACE = 0x100000000;
const ACCEPTANCE_LIMIT = Math.floor(UINT32_SPACE / LEVEL2_VARIANT_COUNT) * LEVEL2_VARIANT_COUNT;

export function parseLevel2VariantInput(raw: string): Level2VariantParseResult {
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return { ok: false };
  const variant = Number(trimmed);
  return Number.isSafeInteger(variant) && variant >= 1 && variant <= LEVEL2_VARIANT_COUNT
    ? { ok: true, variant }
    : { ok: false };
}

export function randomLevel2Variant(source: Level2Uint32Source): number {
  for (;;) {
    const value = source();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_SPACE) {
      throw new RangeError('Level 2 random source must return a uint32');
    }
    if (value < ACCEPTANCE_LIMIT) return value % LEVEL2_VARIANT_COUNT + 1;
  }
}

export function browserLevel2Uint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}
