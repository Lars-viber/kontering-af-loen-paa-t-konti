import type {
  V2PersistedSession,
  V2SessionCaseSnapshot,
  V2SessionInvalidReason,
  V2SessionSaveResult,
} from '../session';
import type { V2StudentState } from '../state';

export type V2ControllerClock = () => string;
export type V2ControllerCaseFactory = (variant: number) => V2SessionCaseSnapshot;
export type V2ControllerUint32Source = () => number;
export type V2ControllerSaveStatus = 'saved' | 'saveFailed';
export type V2ControllerSaveFailure = Exclude<V2SessionSaveResult, { readonly ok: true }>['reason'];

export interface V2ControllerCurrentSession {
  readonly variant: number;
  readonly caseSnapshot: V2SessionCaseSnapshot;
  readonly studentState: V2StudentState;
  readonly saveStatus: V2ControllerSaveStatus;
  readonly lastSuccessfulSavedAt: string | null;
  readonly lastSaveFailure: V2ControllerSaveFailure | null;
}

export type V2ControllerStartResult =
  | { readonly ok: true; readonly current: V2ControllerCurrentSession }
  | { readonly ok: false; readonly reason: 'invalidVariant' | 'randomFailure' };

export type V2ControllerLegacyPresence = boolean | null;

export type V2ControllerLoadResult =
  | {
    readonly status: 'loaded';
    readonly current: V2ControllerCurrentSession;
    readonly legacyV1Present: V2ControllerLegacyPresence;
  }
  | {
    readonly status: 'missing';
    readonly legacyV1Present: V2ControllerLegacyPresence;
  }
  | {
    readonly status: 'invalid';
    readonly reason: V2SessionInvalidReason;
    readonly legacyV1Present: V2ControllerLegacyPresence;
  }
  | {
    readonly status: 'storageFailure';
    readonly legacyV1Present: V2ControllerLegacyPresence;
  };

export function currentFromPersistedV2Session(
  session: V2PersistedSession,
): V2ControllerCurrentSession {
  return {
    variant: session.variant,
    caseSnapshot: session.caseSnapshot,
    studentState: session.studentState,
    saveStatus: 'saved',
    lastSuccessfulSavedAt: session.savedAt,
    lastSaveFailure: null,
  };
}
