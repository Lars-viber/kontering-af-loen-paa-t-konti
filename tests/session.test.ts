import { describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/generator-v1.json';
import {
  ACCOUNT_IDS, calculateStudentTotals, generateExercise, type AccountId, type EntrySide,
} from '../src/domain/payroll';
import {
  SCHEMA_VERSION, SESSION_STORAGE_KEY, clearSession, createInitialStudentState,
  createSessionFromVariant, decodeSession, loadSession, saveSession, studentAnswerFromState,
  updateAndSaveStudentField, updateStudentField, type PayrollSession, type StorageLike,
} from '../src/session';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

const clock = () => '2026-09-17T12:00:00.000Z';
const mutable = (session: PayrollSession): Record<string, unknown> => JSON.parse(JSON.stringify(session)) as Record<string, unknown>;

describe('Initial student state og session', () => {
  it('opretter præcis 16 blanke, ukontrollerede og ulåste felter', () => {
    const state = createInitialStudentState();
    expect(Object.keys(state)).toEqual([...ACCOUNT_IDS].sort((a, b) => Number(a) - Number(b)));
    const fields = ACCOUNT_IDS.flatMap(id => [state[id].debit, state[id].credit]);
    expect(fields).toHaveLength(16);
    expect(fields.every(field => field.rawInput === '' && field.status === 'unchecked' && !field.locked)).toBe(true);
  });

  it('opretter schema v1 og fixtureidentisk snapshot for variant 42', () => {
    const session = createSessionFromVariant(42, clock);
    expect(session).toMatchObject({ schemaVersion: SCHEMA_VERSION, generatorVersion: 1, variant: 42, completed: false, savedAt: clock() });
    expect(session.exerciseSnapshot).toEqual(fixture['42']);
  });

  it('giver tomme elevtotaler', () => {
    const parsed = studentAnswerFromState(createInitialStudentState());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(calculateStudentTotals(parsed.answer)).toEqual({ debit: 0, credit: 0, status: 'empty' });
  });

  it('kalder generatoren præcis én gang ved ny session', () => {
    const generator = vi.fn(generateExercise);
    createSessionFromVariant(42, clock, generator);
    expect(generator).toHaveBeenCalledTimes(1);
    expect(generator).toHaveBeenCalledWith(42);
  });
});

describe('Immutable student updates og autosave', () => {
  it('bevarer rå formatering og opdaterer savedAt immutably', () => {
    const session = createSessionFromVariant(42, clock);
    const storage = new MemoryStorage();
    const nextClock = () => '2026-09-17T12:01:00.000Z';
    const result = updateAndSaveStudentField(storage, session, '2210', 'debit', '145.812', nextClock);
    expect(result.session).not.toBe(session);
    expect(result.session.studentState).not.toBe(session.studentState);
    expect(result.session.studentState['2210'].debit).toEqual({ rawInput: '145.812', status: 'unchecked', locked: false });
    expect(session.studentState['2210'].debit.rawInput).toBe('');
    expect(result.session.savedAt).toBe(nextClock());
    expect(result.save.ok).toBe(true);
    expect(loadSession(storage)).toMatchObject({ kind: 'valid', session: { studentState: { '2210': { debit: { rawInput: '145.812' } } } } });
  });

  it('beskytter locked felt ved at returnere samme session', () => {
    const base = mutable(createSessionFromVariant(42, clock));
    const student = base.studentState as Record<string, Record<string, Record<string, unknown>>>;
    student['2210'].debit = { rawInput: '100', status: 'correct', locked: true };
    const decoded = decodeSession(JSON.stringify(base));
    expect(decoded.kind).toBe('valid');
    if (decoded.kind !== 'valid') return;
    expect(updateStudentField(decoded.session, '2210', 'debit', '200')).toBe(decoded.session);
  });

  it('nulstiller incorrect til unchecked ved redigering', () => {
    const base = mutable(createSessionFromVariant(42, clock));
    const student = base.studentState as Record<string, Record<string, Record<string, unknown>>>;
    student['2210'].debit = { rawInput: '100', status: 'incorrect', locked: false };
    const decoded = decodeSession(JSON.stringify(base));
    expect(decoded.kind).toBe('valid');
    if (decoded.kind !== 'valid') return;
    const updated = updateStudentField(decoded.session, '2210', 'debit', '200', clock);
    expect(updated.studentState['2210'].debit).toEqual({ rawInput: '200', status: 'unchecked', locked: false });
  });

  it('afviser ukendt konto og side i runtime helper', () => {
    const session = createSessionFromVariant(42, clock);
    expect(() => updateStudentField(session, '9999' as AccountId, 'debit', '1')).toThrow(/Unknown payroll account/);
    expect(() => updateStudentField(session, '2210', 'other' as EntrySide, '1')).toThrow(/Unknown posting side/);
  });
});

describe('Codec, restore og snapshotautoritet', () => {
  it('bevarer session og rå input gennem JSON roundtrip uden regenerering', () => {
    const generator = vi.fn(generateExercise);
    let session = createSessionFromVariant(42, clock, generator);
    session = updateStudentField(session, '2210', 'debit', '145.812', clock);
    const storage = new MemoryStorage();
    expect(saveSession(storage, session).ok).toBe(true);
    generator.mockClear();

    const loaded = loadSession(storage);
    expect(generator).toHaveBeenCalledTimes(0);
    expect(loaded.kind).toBe('valid');
    if (loaded.kind !== 'valid') return;
    expect(loaded.session.exerciseSnapshot).toEqual(session.exerciseSnapshot);
    expect(loaded.session.studentState).toEqual(session.studentState);
    expect(loaded.session.studentState['2210'].debit.rawInput).toBe('145.812');
    expect(Object.isFrozen(loaded.session.exerciseSnapshot)).toBe(true);
    expect(Object.isFrozen(loaded.session.exerciseSnapshot.employees[0])).toBe(true);
  });

  it('accepterer kun completed når alle 16 felter er correct og locked', () => {
    const base = mutable(createSessionFromVariant(42, clock));
    base.completed = true;
    expect(decodeSession(JSON.stringify(base))).toMatchObject({ kind: 'invalid' });

    const student = base.studentState as Record<string, Record<string, Record<string, unknown>>>;
    for (const id of ACCOUNT_IDS) for (const side of ['debit', 'credit']) student[id][side] = { rawInput: '', status: 'correct', locked: true };
    expect(decodeSession(JSON.stringify(base))).toMatchObject({ kind: 'valid', session: { completed: true } });
  });

  it.each([
    ['incorrect + locked', (data: Record<string, unknown>) => ((data.studentState as any)['2210'].debit = { rawInput: '1', status: 'incorrect', locked: true })],
    ['unchecked + locked', (data: Record<string, unknown>) => ((data.studentState as any)['2210'].debit = { rawInput: '', status: 'unchecked', locked: true })],
    ['ukendt account', (data: Record<string, unknown>) => ((data.studentState as any)['9999'] = (data.studentState as any)['2210'])],
    ['ukendt side', (data: Record<string, unknown>) => ((data.studentState as any)['2210'].other = (data.studentState as any)['2210'].debit)],
  ])('afviser %s', (_name, mutate) => {
    const data = mutable(createSessionFromVariant(42, clock));
    mutate(data);
    expect(decodeSession(JSON.stringify(data))).toMatchObject({ kind: 'invalid' });
  });

  it('afviser korrupt JSON og future schema', () => {
    expect(decodeSession('{broken json')).toMatchObject({ kind: 'invalid', reason: 'corrupt-json' });
    const future = mutable(createSessionFromVariant(42, clock));
    future.schemaVersion = 99;
    expect(decodeSession(JSON.stringify(future))).toMatchObject({ kind: 'invalid', reason: 'unsupported-schema' });
  });

  it('afviser manipuleret snapshot uden reparation', () => {
    const data = mutable(createSessionFromVariant(42, clock));
    ((data.exerciseSnapshot as any).payslipTotals).atp += 1;
    expect(decodeSession(JSON.stringify(data))).toMatchObject({ kind: 'invalid', reason: 'invalid-session' });
  });

  it('afviser generatorVersion- og variantmismatch', () => {
    const version = mutable(createSessionFromVariant(42, clock));
    version.generatorVersion = 2;
    expect(decodeSession(JSON.stringify(version))).toMatchObject({ kind: 'invalid' });

    const variant = mutable(createSessionFromVariant(42, clock));
    variant.variant = 1;
    expect(decodeSession(JSON.stringify(variant))).toMatchObject({ kind: 'invalid' });
  });
});

describe('Storage API og fejl', () => {
  it('gemmer, loader og rydder namespaced session', () => {
    const storage = new MemoryStorage();
    const session = createSessionFromVariant(42, clock);
    expect(saveSession(storage, session)).toEqual({ ok: true });
    expect(storage.data.has(SESSION_STORAGE_KEY)).toBe(true);
    expect(loadSession(storage)).toMatchObject({ kind: 'valid', session: { variant: 42 } });
    expect(clearSession(storage)).toEqual({ ok: true });
    expect(loadSession(storage)).toEqual({ kind: 'empty' });
  });

  it('håndterer read, write og clear failures uden throw', () => {
    const failing: StorageLike = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(loadSession(failing)).toMatchObject({ kind: 'invalid', reason: 'storage-unavailable' });
    expect(saveSession(failing, createSessionFromVariant(42, clock))).toMatchObject({ ok: false });
    expect(clearSession(failing)).toMatchObject({ ok: false });
  });
});