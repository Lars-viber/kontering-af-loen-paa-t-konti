import { SESSION_STORAGE_KEY } from './constants';
import { decodeSession } from './codec';
import type { PayrollSession, SessionLoadResult, StorageLike, StorageWriteResult } from './types';

export function loadSession(storage: StorageLike): SessionLoadResult {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    return raw === null ? { kind: 'empty' } : decodeSession(raw);
  } catch {
    return { kind: 'invalid', reason: 'storage-unavailable', message: 'Browserens lager er ikke tilgængeligt. Du kan stadig starte en opgave, men den kan muligvis ikke gemmes.' };
  }
}

export function saveSession(storage: StorageLike, session: PayrollSession): StorageWriteResult {
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return { ok: true };
  } catch {
    return { ok: false, message: 'Opgaven kunne ikke gemmes i browseren.' };
  }
}

export function clearSession(storage: StorageLike): StorageWriteResult {
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Den gemte opgave kunne ikke fjernes.' };
  }
}