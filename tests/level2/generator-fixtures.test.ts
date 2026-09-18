import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/level2-generator-v1-fixtures.json';
import {
  canonicalStringify,
  generateLevel2Case,
} from '../../src/domain/level2';

export const LEVEL2_GENERATOR_FIXTURE_SHA256 = 'a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342';

describe('Niveau 2 Generator v1 fixtures', () => {
  it.each([1, 2, 3, 42, 999999])('variant %i matcher den frosne fixture', variant => {
    expect(generateLevel2Case(variant)).toEqual(fixtures[String(variant) as keyof typeof fixtures]);
  });

  it('har låst SHA-256 over canonical UTF-8', () => {
    const hash = createHash('sha256').update(canonicalStringify(fixtures)).digest('hex');
    expect(hash).toBe(LEVEL2_GENERATOR_FIXTURE_SHA256);
  });
});
