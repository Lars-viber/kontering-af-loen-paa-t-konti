import { describe, expect, it } from 'vitest';
import { LEVEL2_DOCUMENT_IDS, REFERENCE_R1_FIXTURE, generateLevel2Case } from '../../src/domain/level2';
import { presentLevel2Document } from '../../src/level2/workspace';

describe('J3B bilagspræsentation', () => {
  it.each([
    ['R1', REFERENCE_R1_FIXTURE],
    ['variant 42', generateLevel2Case(42)],
  ] as const)('afleder alle B1–B13 fra %s uden kontohints', (_label, source) => {
    const presentations = LEVEL2_DOCUMENT_IDS.map(documentId => presentLevel2Document(source, documentId));
    expect(presentations.map(item => item.documentId)).toEqual(LEVEL2_DOCUMENT_IDS);
    expect(presentations.every(item => item.title.length > 0 && item.periodLabel.length > 0 && item.rows.length > 0)).toBe(true);
    expect(presentations.flatMap(item => item.rows).every(row => Number.isInteger(row.amount) && row.amount >= 0)).toBe(true);
    expect(presentations.map(item => item.title).join(' ')).not.toMatch(/2210|5820|6920|6930/);
  });

  it('viser kun før- og systemsaldo på B9', () => {
    for (const source of [REFERENCE_R1_FIXTURE, generateLevel2Case(42)] as const) {
      const b9 = presentLevel2Document(source, 'B9');
      expect(b9.rows.map(row => row.label)).toEqual([
        'Bogført saldo før regulering',
        'Systemopgjort saldo pr. 30/6',
      ]);
      expect(b9.rows).toHaveLength(2);
    }
  });

  it('hardcoder ikke R1-beløbene i presentation mapping', () => {
    const r1 = LEVEL2_DOCUMENT_IDS.map(id => presentLevel2Document(REFERENCE_R1_FIXTURE, id).rows.map(row => row.amount));
    const generated = LEVEL2_DOCUMENT_IDS.map(id => presentLevel2Document(generateLevel2Case(42), id).rows.map(row => row.amount));
    expect(generated).not.toEqual(r1);
  });
});
