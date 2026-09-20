import { deepFreezeLevel2 } from '../../../domain/level2/readonly';
import { validateV2PersistedSession } from './sessionValidation';
import type {
  V2PersistedSession,
  V2SessionDecodeResult,
} from './types';

export function encodeV2Session(session: V2PersistedSession): string {
  const validation = validateV2PersistedSession(session);
  if (!validation.ok) {
    throw new TypeError('Cannot encode invalid V2.1 session: ' + validation.reason);
  }
  return JSON.stringify(session);
}

export function decodeV2Session(raw: string): V2SessionDecodeResult {
  if (raw.trim() === '') return { ok: false, reason: 'emptyInput' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: 'malformedJson' };
  }
  const validation = validateV2PersistedSession(parsed);
  if (!validation.ok) return validation;
  return {
    ok: true,
    value: deepFreezeLevel2(validation.value) as V2PersistedSession,
  };
}
