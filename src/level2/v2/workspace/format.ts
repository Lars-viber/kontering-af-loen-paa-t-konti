import type { V2AccountBalance } from '../../../domain/level2/v2';

const formatter = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });

export function formatV2WorkspaceAmount(amount: number): string {
  return formatter.format(amount) + ' kr.';
}

export function formatV2WorkspaceBalance(balance: V2AccountBalance): string {
  if (balance.side === 'zero') return '0 kr.';
  return formatV2WorkspaceAmount(balance.amount) + ' ' + (balance.side === 'debit' ? 'D' : 'K');
}

export function parseV2WorkspaceAmount(rawAmount: string): number | null {
  const normalized = rawAmount.trim().replace(/[. \u00a0\u202f]/g, '');
  if (!/^(?:0|[1-9][0-9]*)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}
