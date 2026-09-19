import type { V2Account } from './types';
import { V2_ACCOUNT_NUMBERS } from './types';

export const V2_ACCOUNTS = Object.freeze([
  Object.freeze({ accountNumber: '2210', name: 'Lønninger – timelønnede', type: 'operating' }),
  Object.freeze({ accountNumber: '2211', name: 'Lønninger – månedslønnede', type: 'operating' }),
  Object.freeze({ accountNumber: '2215', name: 'Pensioner', type: 'operating' }),
  Object.freeze({ accountNumber: '2223', name: 'ATP', type: 'operating' }),
  Object.freeze({ accountNumber: '2230', name: 'Feriepenge – timelønnede', type: 'operating' }),
  Object.freeze({ accountNumber: '2235', name: 'Regulering af feriepengeforpligtelse', type: 'operating' }),
  Object.freeze({ accountNumber: '5820', name: 'Bankkonto', type: 'balance' }),
  Object.freeze({ accountNumber: '6920', name: 'Skyldig A-skat', type: 'balance' }),
  Object.freeze({ accountNumber: '6921', name: 'Skyldig ATP', type: 'balance' }),
  Object.freeze({ accountNumber: '6922', name: 'Skyldig pension', type: 'balance' }),
  Object.freeze({ accountNumber: '6923', name: 'Skyldige nettoferiepenge – FerieKonto', type: 'balance' }),
  Object.freeze({ accountNumber: '6924', name: 'Feriepengeforpligtelse', type: 'balance' }),
  Object.freeze({ accountNumber: '6930', name: 'Skyldig AM-bidrag', type: 'balance' }),
] as const satisfies readonly V2Account[]);

if (V2_ACCOUNTS.some((account, index) => account.accountNumber !== V2_ACCOUNT_NUMBERS[index])) {
  throw new Error('V2.1 account order does not match account identifiers');
}
