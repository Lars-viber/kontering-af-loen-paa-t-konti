import { describe, expect, it } from 'vitest';
import {
  R1_V2_ANSWER_KEY,
  R1_V2_SOURCE,
  V2_ACCOUNTS,
  V2_ACCOUNT_NUMBERS,
  V2_DOCUMENT_IDS,
  V2_DOCUMENT_TITLES,
  V2_GENERATOR_VERSION,
  V2_RATES,
  V2_RULESET_VERSION,
  V2_RULESET_YEAR,
  assertV2Contract,
  assertV2SourceCase,
  isV2DocumentId,
  type V2DocumentId,
  type V2SourceCase,
} from '../../src/domain/level2/v2';

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeepFrozen);
}

describe('Niveau 2 V2.1 domænekontrakt', () => {
  it('fryser versionsidentiteten uden at ændre aktiv V2.0.x-runtime', () => {
    expect(V2_RULESET_YEAR).toBe(2026);
    expect(V2_RULESET_VERSION).toBe(2);
    expect(V2_GENERATOR_VERSION).toBe(2);
    expect(R1_V2_SOURCE.identity).toEqual({
      rulesetYear: 2026,
      rulesetVersion: 2,
      generatorVersion: 2,
    });
    expect(V2_RATES).toEqual({
      employeePensionPercent: 4,
      employerPensionPercent: 8,
      employeeAtp: 99,
      employerAtp: 198,
      totalAtp: 297,
      amPercent: 8,
      holidayPayPercent: 12.5,
    });
  });

  it('tillader compile- og runtime-mæssigt kun B1-B9', () => {
    const valid: V2DocumentId = 'B9';
    // @ts-expect-error V2.1-kontrakten må ikke acceptere et dokument efter B9.
    const invalid: V2DocumentId = 'B10';
    expect(valid).toBe('B9');
    expect(invalid).toBe('B10');
    expect(V2_DOCUMENT_IDS).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']);
    for (const legacyId of ['B10', 'B11', 'B12', 'B13']) expect(isV2DocumentId(legacyId)).toBe(false);
  });

  it('fryser præcis 13 konti og de ni godkendte bilagstitler', () => {
    expect(V2_ACCOUNTS).toHaveLength(13);
    expect(V2_ACCOUNTS.map(account => account.accountNumber)).toEqual(V2_ACCOUNT_NUMBERS);
    expect(R1_V2_SOURCE.documentSources.map(document => document.title)).toEqual(
      V2_DOCUMENT_IDS.map(id => V2_DOCUMENT_TITLES[id]),
    );
  });

  it('holder synlige kildedata adskilt fra answer key', () => {
    expect(R1_V2_SOURCE.documentSources).toHaveLength(9);
    for (const source of R1_V2_SOURCE.documentSources) {
      expect(source).not.toHaveProperty('expectedPostings');
    }
    expect(R1_V2_ANSWER_KEY.documents.every(document => document.expectedPostings.length > 0)).toBe(true);
  });

  it('beskytter B9 mod et direkte reguleringsfacit i bilagskilden', () => {
    const b9 = R1_V2_SOURCE.documentSources.find(document => document.id === 'B9');
    expect(b9?.fields.map(item => item.id)).toEqual([
      'holiday-liability-before-adjustment',
      'holiday-liability-system-assessed',
    ]);
    expect(b9?.visibleTallyIds).toEqual(['holiday-liability-system-assessed']);
    expect(b9?.fields.map(item => item.amount)).toEqual([174000, 182500]);
    expect(b9?.fields.some(item => item.amount === 8500)).toBe(false);
  });

  it('er rekursivt immutable og består runtime-validation', () => {
    assertV2Contract(R1_V2_SOURCE, R1_V2_ANSWER_KEY);
    expectDeepFrozen(R1_V2_SOURCE);
    expectDeepFrozen(R1_V2_ANSWER_KEY);
  });

  it('afviser forkert version og manglende tælleværk', () => {
    const invalidVersion = structuredClone(R1_V2_SOURCE) as unknown as V2SourceCase;
    (invalidVersion.identity as { rulesetVersion: number }).rulesetVersion = 1;
    expect(() => assertV2SourceCase(invalidVersion)).toThrow('Invalid V2.1 version identity');

    const missingTally = structuredClone(R1_V2_SOURCE) as unknown as V2SourceCase;
    (missingTally as unknown as { tallies: unknown[] }).tallies.pop();
    expect(() => assertV2SourceCase(missingTally)).toThrow('tælleværker must match');
  });
});
