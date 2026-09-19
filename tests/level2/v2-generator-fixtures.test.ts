import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/level2-generator-v2-fixtures.json';
import {
  generateV2Case,
  toV2GeneratorFixture,
} from '../../src/domain/level2/v2';
import { canonicalStringify } from '../../src/domain/level2';

export const LEVEL2_GENERATOR_V2_FIXTURE_SHA256 =
  '595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941';

describe('Niveau 2 V2.1 Generator V2 fixtures', () => {
  it.each([1, 2, 3, 42, 999999])('variant %i matcher den frosne V2-fixture', variant => {
    expect(toV2GeneratorFixture(generateV2Case(variant)))
      .toEqual(fixtures[String(variant) as keyof typeof fixtures]);
  });

  it('har låst SHA-256 over canonical UTF-8', () => {
    const hash = createHash('sha256').update(canonicalStringify(fixtures)).digest('hex');
    expect(hash).toBe(LEVEL2_GENERATOR_V2_FIXTURE_SHA256);
  });
});
