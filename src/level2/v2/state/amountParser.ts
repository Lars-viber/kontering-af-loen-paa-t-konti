export type V2AmountParseResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly value: number }
  | { readonly kind: 'invalid' };

function normalizeGroupingSpaces(raw: string): string {
  return raw.replace(/[  ]/g, ' ');
}

function parseWholeAmount(raw: string, allowZero: boolean): V2AmountParseResult {
  const normalized = normalizeGroupingSpaces(raw).trim();
  if (normalized === '') return { kind: 'empty' };

  const ungrouped = allowZero ? /^(?:0|[1-9][0-9]*)$/ : /^[1-9][0-9]*$/;
  const groupedDots = /^[1-9][0-9]{0,2}(?:[.][0-9]{3})+$/;
  const groupedSpaces = /^[1-9][0-9]{0,2}(?: [0-9]{3})+$/;
  if (!ungrouped.test(normalized) && !groupedDots.test(normalized) && !groupedSpaces.test(normalized)) {
    return { kind: 'invalid' };
  }

  const value = Number(normalized.replace(/[. ]/g, ''));
  if (!Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    return { kind: 'invalid' };
  }
  return { kind: 'valid', value };
}

export function parseV2PostingAmount(raw: string): V2AmountParseResult {
  return parseWholeAmount(raw, false);
}

export function parseV2CheckpointAmount(raw: string): V2AmountParseResult {
  return parseWholeAmount(raw, true);
}
