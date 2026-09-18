import { deepFreezeLevel2 } from '../../domain/level2/readonly';
import type { Level2PersistedSession, Level2SessionDecodeResult } from './types';
import { validateLevel2PersistedSession } from './sessionValidation';

export function encodeLevel2Session(session: Level2PersistedSession): string {
  const validation = validateLevel2PersistedSession(session);
  if (!validation.ok) throw new TypeError('Cannot encode invalid Level 2 session: ' + validation.reason);
  return JSON.stringify(session);
}

export function decodeLevel2Session(raw: string): Level2SessionDecodeResult {
  if (raw.trim() === '') return { ok: false, reason: 'emptyInput' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: 'malformedJson' };
  }
  const validation = validateLevel2PersistedSession(parsed);
  if (!validation.ok) return validation;
  return { ok: true, value: deepFreezeLevel2(validation.value) as Level2PersistedSession };
}

