import type { V2ControllerUint32Source } from './types';

const V2_VARIANT_COUNT = 999999;
const UINT32_SPACE = 0x100000000;
const V2_ACCEPTANCE_LIMIT = Math.floor(UINT32_SPACE / V2_VARIANT_COUNT) * V2_VARIANT_COUNT;

export function randomV2ControllerVariant(source: V2ControllerUint32Source): number {
  for (;;) {
    const value = source();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_SPACE) {
      throw new RangeError('V2.1 random source must return a uint32');
    }
    if (value < V2_ACCEPTANCE_LIMIT) return value % V2_VARIANT_COUNT + 1;
  }
}

export function browserV2ControllerUint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}
