import { isValidV2Variant } from '../../../domain/level2/v2';

export function parseV2ControllerVariantInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const variant = Number(trimmed);
  return isValidV2Variant(variant) ? variant : null;
}
