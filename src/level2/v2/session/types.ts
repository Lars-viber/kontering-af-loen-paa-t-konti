import type {
  V2AnswerKey,
  V2HourlyEmployee,
  V2MonthId,
  V2SalariedEmployee,
  V2SourceCase,
} from '../../../domain/level2/v2';
import type { V2StudentState } from '../state';

export interface V2SessionHolidayLiabilitySnapshot {
  readonly factorPercent: number;
  readonly yearStartLiability: number;
  readonly monthlyAdjustments: Readonly<Record<V2MonthId, number>>;
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly systemAssessedHolidayLiability: number;
}

export interface V2SessionBankSnapshot {
  readonly requiredCash: number;
  readonly buffer: number;
  readonly bankStart: number;
}

export interface V2SessionCaseSnapshot {
  readonly variant: number;
  readonly seed: string;
  readonly drawCount: number;
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 2;
  readonly generatorVersion: 2;
  readonly inputs: {
    readonly employeeCounts: { readonly hourly: number; readonly salaried: number };
    readonly hourlyEmployees: readonly V2HourlyEmployee[];
    readonly salariedEmployees: readonly V2SalariedEmployee[];
    readonly holidayLiability: V2SessionHolidayLiabilitySnapshot;
    readonly bank: V2SessionBankSnapshot;
  };
  readonly source: V2SourceCase;
  readonly answers: V2AnswerKey;
}

export interface V2PersistedSession {
  readonly schemaVersion: 2;
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 2;
  readonly generatorVersion: 2;
  readonly variant: number;
  readonly caseSnapshot: V2SessionCaseSnapshot;
  readonly studentState: V2StudentState;
  readonly savedAt: string;
}

export type V2SessionInvalidReason =
  | 'emptyInput'
  | 'malformedJson'
  | 'invalidTopLevelShape'
  | 'unsupportedSchemaVersion'
  | 'unsupportedRulesetYear'
  | 'unsupportedRulesetVersion'
  | 'unsupportedGeneratorVersion'
  | 'invalidVariant'
  | 'invalidSavedAt'
  | 'invalidCaseSnapshot'
  | 'invalidStudentState'
  | 'sessionSnapshotMismatch';

export type V2SessionDecodeResult =
  | { readonly ok: true; readonly value: V2PersistedSession }
  | { readonly ok: false; readonly reason: V2SessionInvalidReason };

export interface V2Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type V2SessionSaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalidSession' | 'storageFailure' };

export type V2SessionLoadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'loaded'; readonly session: V2PersistedSession }
  | { readonly status: 'invalid'; readonly reason: V2SessionInvalidReason }
  | { readonly status: 'storageFailure' };

export type V2SessionRemoveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'storageFailure' };

export type V2LegacyPresenceResult =
  | { readonly status: 'available'; readonly legacyV1Present: boolean }
  | { readonly status: 'storageFailure' };

export type V2RuntimeValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false };
