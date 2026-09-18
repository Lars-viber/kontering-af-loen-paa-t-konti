import type {
  AccountBalance,
  HourlyEmployeeReference,
  Level2AtpTimeline,
  Level2Checkpoint,
  Level2Document,
  Level2YtdSpecification,
  MonthId,
  ReferenceMonth,
  SalariedEmployeeReference,
} from '../../domain/level2';
import type { Level2StudentState } from '../state';

export interface Level2HolidayLiabilitySnapshot {
  readonly factorPercent: number;
  readonly yearStartLiability: number;
  readonly monthlyAdjustments: Readonly<Record<MonthId, number>>;
  readonly holidayLiabilityBeforeAdjustment: number;
  readonly systemAssessedHolidayLiability: number;
}

export interface Level2BankSnapshot {
  readonly requiredCash: number;
  readonly buffer: number;
  readonly bankStart: number;
}

export interface Level2CaseSnapshot {
  readonly variant: number;
  readonly seed: string;
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 1;
  readonly generatorVersion: 1;
  readonly inputs: {
    readonly employeeCounts: { readonly hourly: number; readonly salaried: number };
    readonly hourlyEmployees: readonly HourlyEmployeeReference[];
    readonly salariedEmployees: readonly SalariedEmployeeReference[];
    readonly holidayLiability: Level2HolidayLiabilitySnapshot;
    readonly bank: Level2BankSnapshot;
  };
  readonly derived: {
    readonly history: readonly ReferenceMonth[];
    readonly atp: Level2AtpTimeline;
    readonly startBalances: readonly AccountBalance[];
    readonly documents: readonly Level2Document[];
    readonly checkpointBalances: readonly AccountBalance[];
    readonly ytdSpecification: Level2YtdSpecification;
    readonly checkpoint: Level2Checkpoint;
    readonly finalBalances: readonly AccountBalance[];
  };
}

export interface Level2PersistedSession {
  readonly schemaVersion: 1;
  readonly rulesetYear: 2026;
  readonly rulesetVersion: 1;
  readonly generatorVersion: 1;
  readonly variant: number;
  readonly caseSnapshot: Level2CaseSnapshot;
  readonly studentState: Level2StudentState;
  readonly savedAt: string;
}

export type Level2SessionInvalidReason =
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

export type Level2SessionDecodeResult =
  | { readonly ok: true; readonly value: Level2PersistedSession }
  | { readonly ok: false; readonly reason: Level2SessionInvalidReason };

export interface Level2Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Level2SessionSaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalidSession' | 'storageFailure' };

export type Level2SessionLoadResult =
  | { readonly status: 'none' }
  | { readonly status: 'loaded'; readonly session: Level2PersistedSession }
  | { readonly status: 'invalid'; readonly reason: Level2SessionInvalidReason }
  | { readonly status: 'storageFailure' };

export type Level2SessionRemoveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'storageFailure' };

export type RuntimeValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false };

