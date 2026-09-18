import type { Level2CaseSnapshot, Level2PersistedSession, Level2SessionInvalidReason } from '../session';

export type Level2Clock = () => string;
export type Level2CaseFactory = (variant: number) => Level2CaseSnapshot;
export type Level2SaveStatus = 'idle' | 'saved' | 'error';

export interface Level2ValidControllerState {
  readonly lifecycle: 'valid';
  readonly session: Level2PersistedSession;
  readonly saveStatus: Level2SaveStatus;
}

export type Level2ControllerState =
  | { readonly lifecycle: 'none'; readonly session: null; readonly saveStatus: 'idle' }
  | Level2ValidControllerState
  | {
    readonly lifecycle: 'invalid';
    readonly session: null;
    readonly saveStatus: 'idle' | 'error';
    readonly invalidReason: Level2SessionInvalidReason;
    readonly removeError: boolean;
  }
  | { readonly lifecycle: 'storageError'; readonly session: null; readonly saveStatus: 'error' };

export type Level2VariantParseResult =
  | { readonly ok: true; readonly variant: number }
  | { readonly ok: false };
