import { describe, expect, it } from 'vitest';
import { parseCheckpointAmount, parsePostingAmount } from '../../src/level2/state';

describe('Niveau 2 elevbeløbsparser', () => {
  it.each([
    ['145812', 145812],
    ['145.812', 145812],
    ['145 812', 145812],
    ['145 812', 145812],
    ['145 812', 145812],
  ])('accepterer postingbeløbet %s', (raw, expected) => {
    expect(parsePostingAmount(raw)).toEqual({ kind: 'valid', value: expected });
  });

  it.each([
    '0', '-100', '+100', '145,50', '145.812,00', 'kr. 100',
    '100 kr.', '1e5', 'Infinity', 'NaN', '12.34', '1.23.456',
    '145.812 000', '9007199254740992', '001',
  ])('afviser postingbeløbet %s', raw => {
    expect(parsePostingAmount(raw)).toEqual({ kind: 'invalid' });
  });

  it('skelner blank draft fra nul', () => {
    expect(parsePostingAmount('   ')).toEqual({ kind: 'empty' });
    expect(parseCheckpointAmount('')).toEqual({ kind: 'empty' });
    expect(parseCheckpointAmount('0')).toEqual({ kind: 'valid', value: 0 });
    expect(parseCheckpointAmount('-1')).toEqual({ kind: 'invalid' });
  });
});
