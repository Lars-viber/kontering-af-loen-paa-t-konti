export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export function isSafeWhole(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function hasStep(value: number, minimum: number, maximum: number, step: number): boolean {
  return value >= minimum && value <= maximum && (value - minimum) % step === 0;
}

export function clonePlainData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => clonePlainData(item)) as T;
  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, clonePlainData(child)]),
    ) as T;
  }
  return value;
}
