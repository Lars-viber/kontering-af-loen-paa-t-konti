export type AmountParseResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly value: number }
  | { readonly kind: 'invalid' };

function normalizeGroupingSpaces(raw: string): string {
  return raw.replace(/[  ]/g, ' ');
}

function parseWholeAmount(raw: string, allowZero: boolean): AmountParseResult {
  const normalized = normalizeGroupingSpaces(raw).trim();
  if (normalized === '') return { kind: 'empty' };

  const ungrouped = allowZero ? /^(?:0|[1-9][0-9]*)$/ : /^[1-9][0-9]*$/;
  const groupedDots = /^[1-9][0-9]{0,2}(?:[.][0-9]{3})+$/;
  const groupedSpaces = /^[1-9][0-9]{0,2}(?: [0-9]{3})+$/;

  if (!ungrouped.test(normalized) && !groupedDots.test(normalized) && !groupedSpaces.test(normalized)) {
    return { kind: 'invalid' };
  }

  const digits = normalized.replace(/[. ]/g, '');
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    return { kind: 'invalid' };
  }
  return { kind: 'valid', value };
}

export function parsePostingAmount(raw: string): AmountParseResult {
  return parseWholeAmount(raw, false);
}

export function parseCheckpointAmount(raw: string): AmountParseResult {
  return parseWholeAmount(raw, true);
}
