import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/generator-v1.json';
import { generateExercise } from '../src/domain/payroll';

describe('Låste generator-v1 fixtures', () => {
  it.each([1, 2, 3, 42, 999999])('variant %i matcher exact-data fixture', variant => {
    expect(generateExercise(variant)).toEqual(fixture[String(variant) as keyof typeof fixture]);
  });

  it('har låst SHA-256', () => {
    const bytes = readFileSync('tests/fixtures/generator-v1.json');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25');
  });
});