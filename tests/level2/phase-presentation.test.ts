import { describe, expect, it } from 'vitest';
import { REFERENCE_R1_FIXTURE, generateLevel2Case } from '../../src/domain/level2';
import {
  FINAL_ITEM_LABELS,
  FINAL_REASON_OPTIONS,
  presentFinalItems,
  presentYtdSpecification,
} from '../../src/level2/workspace';

describe('J3C presentation', () => {
  it.each([
    ['R1', REFERENCE_R1_FIXTURE],
    ['variant 42', generateLevel2Case(42)],
  ] as const)('afleder ÅTD-specifikation fra %s', (_label, source) => {
    const presentation = presentYtdSpecification(source);
    expect(presentation.pension).toHaveLength(4);
    expect(presentation.atp).toHaveLength(4);
    expect(presentation.pension.reduce((sum, row) => sum + row.amount, 0)).toBe(presentation.pensionTotal);
    expect(presentation.atp.reduce((sum, row) => sum + row.amount, 0)).toBe(presentation.atpTotal);
  });

  it.each([
    ['R1', REFERENCE_R1_FIXTURE],
    ['variant 42', generateLevel2Case(42)],
  ] as const)('afleder seks final-saldi fra %s', (_label, source) => {
    const items = presentFinalItems(source);
    expect(items).toHaveLength(6);
    expect(items.map(item => item.label)).toEqual(Object.values(FINAL_ITEM_LABELS));
    expect(items.slice(0, 4).every(item => item.balance.amount === 0 && item.balance.side === 'zero')).toBe(true);
    expect(items[4].balance.side).toBe('credit');
    expect(items[5].balance.side).toBe('credit');
  });

  it('har seks neutrale reason-options uden correct-metadata', () => {
    expect(FINAL_REASON_OPTIONS).toHaveLength(6);
    expect(new Set(FINAL_REASON_OPTIONS.map(option => option.id)).size).toBe(6);
    expect(JSON.stringify(FINAL_REASON_OPTIONS)).not.toContain('correct');
  });
});
