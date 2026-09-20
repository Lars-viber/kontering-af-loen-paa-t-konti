import {
  V2_LEGACY_SESSION_STORAGE_KEY,
  V2_SESSION_STORAGE_KEY,
} from './constants';
import { decodeV2Session, encodeV2Session } from './codec';
import type {
  V2LegacyPresenceResult,
  V2PersistedSession,
  V2SessionLoadResult,
  V2SessionRemoveResult,
  V2SessionSaveResult,
  V2Storage,
} from './types';

export function saveV2Session(
  storage: V2Storage,
  session: V2PersistedSession,
): V2SessionSaveResult {
  let encoded: string;
  try {
    encoded = encodeV2Session(session);
  } catch {
    return { ok: false, reason: 'invalidSession' };
  }
  try {
    storage.setItem(V2_SESSION_STORAGE_KEY, encoded);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storageFailure' };
  }
}

export function loadV2Session(storage: V2Storage): V2SessionLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(V2_SESSION_STORAGE_KEY);
  } catch {
    return { status: 'storageFailure' };
  }
  if (raw === null) return { status: 'missing' };
  const decoded = decodeV2Session(raw);
  if (!decoded.ok) return { status: 'invalid', reason: decoded.reason };
  return { status: 'loaded', session: decoded.value };
}

export function removeV2Session(storage: V2Storage): V2SessionRemoveResult {
  try {
    storage.removeItem(V2_SESSION_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storageFailure' };
  }
}

export function detectLegacyV1Session(
  storage: V2Storage,
): V2LegacyPresenceResult {
  try {
    return {
      status: 'available',
      legacyV1Present: storage.getItem(V2_LEGACY_SESSION_STORAGE_KEY) !== null,
    };
  } catch {
    return { status: 'storageFailure' };
  }
}
