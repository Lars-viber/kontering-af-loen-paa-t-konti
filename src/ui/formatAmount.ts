const wholeKroner = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });

export function formatAmount(value: number): string {
  return wholeKroner.format(value);
}
