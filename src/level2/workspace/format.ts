import type { AccountBalance } from '../../domain/level2';

const amountFormatter = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });

export function formatLevel2Amount(amount: number): string {
  return amountFormatter.format(amount);
}

export function formatLevel2Balance(balance: Pick<AccountBalance, 'amount' | 'side'>): string {
  if (balance.amount === 0 || balance.side === 'zero') return '0';
  return formatLevel2Amount(balance.amount) + ' ' + (balance.side === 'debit' ? 'D' : 'K');
}

