import { ACCOUNT_IDS, validateSnapshot, type AccountId, type EntrySide, type ExerciseSnapshot, type FieldStatus } from '../domain/payroll';
import { deepFreeze } from '../domain/payroll/readonly';
import { SCHEMA_VERSION } from './constants';
import type { PayrollSession, SessionLoadResult, StudentFieldState, StudentState } from './types';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];
const STATUSES: readonly FieldStatus[] = ['unchecked', 'incorrect', 'correct'];

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function validIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function decodeField(value: unknown): StudentFieldState | null {
  if (!record(value) || !exactKeys(value, ['rawInput', 'status', 'locked'])) return null;
  if (typeof value.rawInput !== 'string' || !STATUSES.includes(value.status as FieldStatus) || typeof value.locked !== 'boolean') return null;
  if ((value.status === 'correct') !== value.locked) return null;
  return { rawInput: value.rawInput, status: value.status as FieldStatus, locked: value.locked };
}

function decodeStudentState(value: unknown): StudentState | null {
  if (!record(value) || !exactKeys(value, ACCOUNT_IDS)) return null;
  const entries: [AccountId, Record<EntrySide, StudentFieldState>][] = [];
  for (const accountId of ACCOUNT_IDS) {
    const account = value[accountId];
    if (!record(account) || !exactKeys(account, SIDES)) return null;
    const debit = decodeField(account.debit);
    const credit = decodeField(account.credit);
    if (!debit || !credit) return null;
    entries.push([accountId, { debit, credit }]);
  }
  return Object.fromEntries(entries) as StudentState;
}

export function decodeSession(raw: string): SessionLoadResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'corrupt-json', message: 'Den gemte opgave indeholder ugyldige data og kan ikke indlæses.' };
  }
  if (!record(value)) return invalid();
  if (value.schemaVersion !== SCHEMA_VERSION) {
    return { kind: 'invalid', reason: 'unsupported-schema', message: 'Den gemte opgave bruger et ukendt format og kan ikke indlæses.' };
  }
  if (!exactKeys(value, ['schemaVersion', 'generatorVersion', 'variant', 'exerciseSnapshot', 'studentState', 'completed', 'savedAt'])) return invalid();
  if (value.generatorVersion !== 1 || !Number.isInteger(value.variant) || typeof value.completed !== 'boolean' || !validIso(value.savedAt)) return invalid();

  const studentState = decodeStudentState(value.studentState);
  if (!studentState || !record(value.exerciseSnapshot)) return invalid();
  const snapshot = value.exerciseSnapshot as unknown as ExerciseSnapshot;
  try {
    validateSnapshot(snapshot);
  } catch {
    return { kind: 'invalid', reason: 'invalid-session', message: 'Den gemte opgaves faglige data er beskadiget og kan ikke indlæses.' };
  }
  if (snapshot.generatorVersion !== value.generatorVersion || snapshot.variant !== value.variant) return invalid();
  const fields = ACCOUNT_IDS.flatMap(id => SIDES.map(side => studentState[id][side]));
  const allCorrect = fields.every(field => field.status === 'correct' && field.locked);
  if (value.completed !== allCorrect) return invalid();

  const session: PayrollSession = {
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: 1,
    variant: value.variant as number,
    exerciseSnapshot: snapshot,
    studentState,
    completed: value.completed,
    savedAt: value.savedAt,
  };
  return { kind: 'valid', session: deepFreeze(session) as PayrollSession };
}

function invalid(): SessionLoadResult {
  return { kind: 'invalid', reason: 'invalid-session', message: 'Den gemte opgave er ugyldig og kan ikke indlæses.' };
}
