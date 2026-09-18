import type { AccountId, EntrySide, ExerciseSnapshot, FieldStatus } from '../domain/payroll';

export interface StudentFieldState {
  readonly rawInput: string;
  readonly status: FieldStatus;
  readonly locked: boolean;
}

export type AccountFieldState = Readonly<Record<EntrySide, StudentFieldState>>;
export type StudentState = Readonly<Record<AccountId, AccountFieldState>>;

export interface PayrollSession {
  readonly schemaVersion: 1;
  readonly generatorVersion: 1;
  readonly variant: number;
  readonly exerciseSnapshot: ExerciseSnapshot;
  readonly studentState: StudentState;
  readonly completed: boolean;
  readonly savedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SessionLoadResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'valid'; readonly session: PayrollSession }
  | { readonly kind: 'invalid'; readonly reason: 'storage-unavailable' | 'corrupt-json' | 'invalid-session' | 'unsupported-schema'; readonly message: string };

export type StorageWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };