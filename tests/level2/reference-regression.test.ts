import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/level2-r1-v1.json';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
  REFERENCE_R1_FIXTURE,
  canonicalStringify,
} from '../../src/domain/level2';

export const LEVEL2_R1_FIXTURE_SHA256 = '9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0';

describe('Niveau 2 fuld R1-domæneregression', () => {
  it('holder ruleset og generatorversion adskilt', () => {
    expect(LEVEL2_RULESET_YEAR).toBe(2026);
    expect(LEVEL2_RULESET_VERSION).toBe(1);
    expect(LEVEL2_GENERATOR_VERSION).toBe(1);
  });

  it('matcher den frosne referencefixture fra historik til slutsaldi', () => {
    expect(REFERENCE_R1_FIXTURE).toEqual(fixture);
  });

  it('har låst canonical SHA-256', () => {
    const canonical = canonicalStringify(REFERENCE_R1_FIXTURE);
    expect(createHash('sha256').update(canonical).digest('hex')).toBe(LEVEL2_R1_FIXTURE_SHA256);
    expect(JSON.parse(readFileSync('tests/fixtures/level2-r1-v1.json', 'utf8'))).toEqual(REFERENCE_R1_FIXTURE);
  });

  it('er rekursivt immutable i domænet', () => {
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(visit);
    };
    visit(REFERENCE_R1_FIXTURE);
  });
});
