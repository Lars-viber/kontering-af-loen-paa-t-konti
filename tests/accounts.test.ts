import { describe, expect, it } from 'vitest';
import { ACCOUNT_IDS, ACCOUNTS } from '../src/domain/payroll';

describe('Fast kontoplan', () => {
  it('har præcis otte konti i låst rækkefølge', () => {
    expect(ACCOUNTS).toEqual([
      { id: '2210', name: 'Lønninger', type: 'Drift' },
      { id: '2215', name: 'Pensioner', type: 'Drift' },
      { id: '2223', name: 'ATP', type: 'Drift' },
      { id: '6920', name: 'Skyldig A-skat', type: 'Balance' },
      { id: '6921', name: 'Skyldig ATP', type: 'Balance' },
      { id: '6922', name: 'Skyldig pension', type: 'Balance' },
      { id: '6930', name: 'Skyldig AM-bidrag', type: 'Balance' },
      { id: '5820', name: 'Bankkonto', type: 'Balance' },
    ]);
    expect(ACCOUNT_IDS).toEqual(['2210', '2215', '2223', '6920', '6921', '6922', '6930', '5820']);
    expect(new Set(ACCOUNT_IDS).size).toBe(8);
  });

  it('er rekursivt immutable', () => {
    expect(Object.isFrozen(ACCOUNTS)).toBe(true);
    expect(ACCOUNTS.every(Object.isFrozen)).toBe(true);
    expect(Reflect.set(ACCOUNTS[0], 'name', 'Ændret')).toBe(false);
  });
});