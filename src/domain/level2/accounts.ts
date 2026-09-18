import { LEVEL2_ACCOUNT_NUMBERS, type Level2Account } from './types';

export const LEVEL2_ACCOUNTS = Object.freeze([
  Object.freeze({ accountNumber: '2210', name: 'Lønninger – timelønnede', type: 'operating', teachingAccount: false }),
  Object.freeze({ accountNumber: '2211', name: 'Lønninger – månedslønnede', type: 'operating', teachingAccount: true }),
  Object.freeze({ accountNumber: '2215', name: 'Pensioner', type: 'operating', teachingAccount: false }),
  Object.freeze({ accountNumber: '2223', name: 'ATP', type: 'operating', teachingAccount: false }),
  Object.freeze({ accountNumber: '2230', name: 'Feriepenge – timelønnede', type: 'operating', teachingAccount: true }),
  Object.freeze({ accountNumber: '2235', name: 'Regulering af feriepengeforpligtelse', type: 'operating', teachingAccount: true }),
  Object.freeze({ accountNumber: '5820', name: 'Bankkonto', type: 'balance', teachingAccount: false }),
  Object.freeze({ accountNumber: '6920', name: 'Skyldig A-skat', type: 'balance', teachingAccount: false }),
  Object.freeze({ accountNumber: '6921', name: 'Skyldig ATP', type: 'balance', teachingAccount: false }),
  Object.freeze({ accountNumber: '6922', name: 'Skyldig pension', type: 'balance', teachingAccount: false }),
  Object.freeze({ accountNumber: '6923', name: 'Skyldige nettoferiepenge – FerieKonto', type: 'balance', teachingAccount: true }),
  Object.freeze({ accountNumber: '6924', name: 'Feriepengeforpligtelse', type: 'balance', teachingAccount: true }),
  Object.freeze({ accountNumber: '6930', name: 'Skyldig AM-bidrag', type: 'balance', teachingAccount: false }),
] as const satisfies readonly Level2Account[]);

if (LEVEL2_ACCOUNTS.some((account, index) => account.accountNumber !== LEVEL2_ACCOUNT_NUMBERS[index])) {
  throw new Error('Level 2 account order does not match account identifiers');
}
