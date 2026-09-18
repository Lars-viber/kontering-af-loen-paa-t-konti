import { deepFreeze } from './readonly';
import type { AccountId, PayrollAccount } from './types';

export const ACCOUNTS = deepFreeze([
  { id: '2210', name: 'Lønninger', type: 'Drift' },
  { id: '2215', name: 'Pensioner', type: 'Drift' },
  { id: '2223', name: 'ATP', type: 'Drift' },
  { id: '6920', name: 'Skyldig A-skat', type: 'Balance' },
  { id: '6921', name: 'Skyldig ATP', type: 'Balance' },
  { id: '6922', name: 'Skyldig pension', type: 'Balance' },
  { id: '6930', name: 'Skyldig AM-bidrag', type: 'Balance' },
  { id: '5820', name: 'Bankkonto', type: 'Balance' },
] as const satisfies readonly PayrollAccount[]);

export const ACCOUNT_IDS = deepFreeze(ACCOUNTS.map(account => account.id) as AccountId[]);