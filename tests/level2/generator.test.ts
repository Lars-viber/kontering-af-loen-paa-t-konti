import { describe, expect, it } from 'vitest';
import {
  canonicalStringify,
  expectedLevel2DrawCount,
  fnv1a32,
  generateLevel2Case,
  generateLevel2CaseWithRandom,
  isValidLevel2Variant,
  level2CaseFingerprint,
  level2SeedString,
} from '../../src/domain/level2';

describe('Niveau 2 Generator v1', () => {
  it('fryser seed-kontrakten og FNV-1a 32-bit', () => {
    const seed = 'payroll-level2:ruleset-2026-v1:generator-v1:42';
    expect(level2SeedString(42)).toBe(seed);
    expect(fnv1a32(seed)).toBe(3928086949);
  });

  it('afviser varianter uden for 1–999999 uden clamp', () => {
    for (const variant of [0, 1000000, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidLevel2Variant(variant)).toBe(false);
      expect(() => generateLevel2Case(variant)).toThrow(RangeError);
    }
  });

  it('bruger nøjagtigt 10 + 9H + 3M draws', () => {
    let draws = 0;
    const generated = generateLevel2CaseWithRandom(42, () => {
      draws += 1;
      return 0.5;
    });
    expect(generated.inputs.employeeCounts).toEqual({ hourly: 5, salaried: 5 });
    expect(draws).toBe(expectedLevel2DrawCount(5, 5));
    expect(draws).toBe(70);
  });

  it('er deterministisk som objekt, canonical bytes og fingerprint', () => {
    const first = generateLevel2Case(42);
    const second = generateLevel2Case(42);
    expect(second).toEqual(first);
    expect(canonicalStringify(second)).toBe(canonicalStringify(first));
    expect(level2CaseFingerprint(second)).toBe(level2CaseFingerprint(first));
  });

  it('returnerer et rekursivt frosset resultat uden mutation leaks', () => {
    const generated = generateLevel2Case(1);
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(visit);
    };
    visit(generated);
    expect(Reflect.set(generated.inputs.hourlyEmployees[0], 'hourlyRate', 999)).toBe(false);
  });

  it('bygger sikker Bank ud fra alle Bank-krediteringer og buffer', () => {
    const generated = generateLevel2Case(3);
    expect(generated.inputs.bank.bankStart % 50000).toBe(0);
    expect(generated.inputs.bank.bankStart).toBeGreaterThanOrEqual(
      generated.inputs.bank.requiredCash + generated.inputs.bank.buffer,
    );
    expect(generated.inputs.bank.bankStart - generated.inputs.bank.requiredCash).toBeGreaterThan(0);
  });
});
