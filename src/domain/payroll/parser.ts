export type ParseAmountResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly error: 'invalid-format' | 'unsafe-integer' };

const plain = /^[0-9]+$/;
const groupedDots = /^[0-9]{1,3}(?:\.[0-9]{3})+$/;
const groupedSpaces = /^[0-9]{1,3}(?: [0-9]{3})+$/;

export function parseAmount(input: string): ParseAmountResult {
  const normalized = input.replace(/[\u00a0\u202f]/g, ' ').trim();
  if (normalized === '') return { ok: true, value: 0 };
  if (!plain.test(normalized) && !groupedDots.test(normalized) && !groupedSpaces.test(normalized)) {
    return { ok: false, error: 'invalid-format' };
  }
  const value = Number(normalized.replace(/[. ]/g, ''));
  if (!Number.isSafeInteger(value) || value < 0) return { ok: false, error: 'unsafe-integer' };
  return { ok: true, value };
}