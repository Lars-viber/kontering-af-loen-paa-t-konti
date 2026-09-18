import { LEVEL2_SESSION_STORAGE_KEY } from './constants';
import { decodeLevel2Session, encodeLevel2Session } from './codec';
import type {
  Level2PersistedSession,
  Level2SessionLoadResult,
  Level2SessionRemoveResult,
  Level2SessionSaveResult,
  Level2Storage,
} from './types';

export function saveLevel2Session(
  storage: Level2Storage,
  session: Level2PersistedSession,
): Level2SessionSaveResult {
  let encoded: string;
  try {
    encoded = encodeLevel2Session(session);
  } catch {
    return { ok: false, reason: 'invalidSession' };
  }
  try {
    storage.setItem(LEVEL2_SESSION_STORAGE_KEY, encoded);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storageFailure' };
  }
}

export function loadLevel2Session(storage: Level2Storage): Level2SessionLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(LEVEL2_SESSION_STORAGE_KEY);
  } catch {
    return { status: 'storageFailure' };
  }
  if (raw === null) return { status: 'none' };
  const decoded = decodeLevel2Session(raw);
  if (!decoded.ok) return { status: 'invalid', reason: decoded.reason };
  return { status: 'loaded', session: decoded.value };
}

export function removeLevel2Session(storage: Level2Storage): Level2SessionRemoveResult {
  try {
    storage.removeItem(LEVEL2_SESSION_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storageFailure' };
  }
}

