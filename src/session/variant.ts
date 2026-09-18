export type Uint32Source = () => number;

export function browserUint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

export function pickRandomVariant(currentVariant?: number, source: Uint32Source = browserUint32): number {
  const picked = (source() >>> 0) % 999999 + 1;
  if (currentVariant === undefined || picked !== currentVariant) return picked;
  return currentVariant === 999999 ? 1 : currentVariant + 1;
}