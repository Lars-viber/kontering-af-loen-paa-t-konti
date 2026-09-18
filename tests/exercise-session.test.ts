import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_IDS, type EntrySide } from '../src/domain/payroll';
import {
  createSessionFromVariant,
  decodeSession,
  type StorageLike,
} from '../src/session';
import {
  calculateDisplayTotals, checkAndSaveSession, checkSession, hasStudentProgress, resetAndSaveSession, resetSession,
} from '../src/session/exercise';

const SIDES: readonly EntrySide[] = ['debit', 'credit'];
const clock = () => '2026-09-17T13:00:00.000Z';

class CountingStorage implements StorageLike {
  raw: string | null = null;
  writes = 0;
  getItem() { return this.raw; }
  setItem(_key: string, value: string) { this.writes += 1; this.raw = value; }
  removeItem() { this.raw = null; }
}

function withRaw(session: ReturnType<typeof createSessionFromVariant>, accountId: typeof ACCOUNT_IDS[number], side: EntrySide, rawInput: string) {
  return {
    ...session,
    studentState: {
      ...session.studentState,
      [accountId]: {
        ...session.studentState[accountId],
        [side]: { rawInput, status: 'unchecked' as const, locked: false },
      },
    },
  };
}

describe('J3 check transaction', () => {
  it('låser otte blanke zero-felter og holder otte nonzero-felter editable', () => {
    const checked = checkSession(createSessionFromVariant(42, clock), clock);
    const fields = ACCOUNT_IDS.flatMap(id => SIDES.map(side => checked.studentState[id][side]));
    expect(fields.filter(field => field.status === 'correct' && field.locked)).toHaveLength(8);
    expect(fields.filter(field => field.status === 'incorrect' && !field.locked)).toHaveLength(8);
    expect(checked.completed).toBe(false);
  });

  it('lader aldrig invalid input blive korrekt mod et zero-facit', () => {
    const session = withRaw(createSessionFromVariant(42, clock), '2210', 'credit', 'abc');
    const checked = checkSession(session, clock);
    expect(checked.studentState['2210'].credit).toEqual({ rawInput: 'abc', status: 'incorrect', locked: false });
  });

  it('vurderer sider uafhængigt og bevarer locked fields ved recheck', () => {
    const base = createSessionFromVariant(42, clock);
    const debitCorrect = withRaw(base, '2210', 'debit', String(base.exerciseSnapshot.answerKey['2210'].debit));
    const first = checkSession(withRaw(debitCorrect, '2210', 'credit', '1'), clock);
    expect(first.studentState['2210'].debit.locked).toBe(true);
    expect(first.studentState['2210'].credit).toMatchObject({ status: 'incorrect', locked: false });
    const second = checkSession(withRaw(first, '2210', 'credit', ''), clock);
    expect(second.studentState['2210'].debit).toEqual(first.studentState['2210'].debit);
    expect(second.studentState['2210'].credit.locked).toBe(true);
  });

  it('completer atomisk med blanke zero-sider og én storage-write', () => {
    let session = createSessionFromVariant(42, clock);
    for (const accountId of ACCOUNT_IDS) for (const side of SIDES) {
      const expected = session.exerciseSnapshot.answerKey[accountId][side];
      if (expected > 0) session = withRaw(session, accountId, side, String(expected));
    }
    const storage = new CountingStorage();
    const result = checkAndSaveSession(storage, session, clock);
    const fields = ACCOUNT_IDS.flatMap(id => SIDES.map(side => result.session.studentState[id][side]));
    expect(result.session.completed).toBe(true);
    expect(fields.every(field => field.status === 'correct' && field.locked)).toBe(true);
    expect(storage.writes).toBe(1);
    expect(decodeSession(storage.raw!)).toMatchObject({ kind: 'valid', session: { completed: true } });
  });
});

describe('J3 totals og reset', () => {
  it('beregner empty, unbalanced, balanced og invalid pr. side', () => {
    const base = createSessionFromVariant(42, clock);
    expect(calculateDisplayTotals(base.studentState)).toEqual({ debit: 0, credit: 0, status: 'empty' });
    const debit = withRaw(base, '2210', 'debit', '100');
    expect(calculateDisplayTotals(debit.studentState)).toEqual({ debit: 100, credit: 0, status: 'unbalanced' });
    const balanced = withRaw(debit, '5820', 'credit', '100');
    expect(calculateDisplayTotals(balanced.studentState)).toEqual({ debit: 100, credit: 100, status: 'balanced' });
    const invalidDebit = withRaw(balanced, '2215', 'debit', '12kr');
    expect(calculateDisplayTotals(invalidDebit.studentState)).toEqual({ debit: null, credit: 100, status: 'invalid' });
    const invalidCredit = withRaw(balanced, '6920', 'credit', 'x');
    expect(calculateDisplayTotals(invalidCredit.studentState)).toEqual({ debit: 100, credit: null, status: 'invalid' });
  });

  it('resetter elevstate uden at regenerere eller ændre snapshot og gemmer én gang', () => {
    const generator = vi.fn();
    const base = withRaw(createSessionFromVariant(42, clock), '2210', 'debit', '12');
    const checked = checkSession(base, clock);
    const storage = new CountingStorage();
    const result = resetAndSaveSession(storage, checked, clock);
    expect(result.session.variant).toBe(42);
    expect(result.session.exerciseSnapshot).toBe(checked.exerciseSnapshot);
    expect(result.session.completed).toBe(false);
    expect(hasStudentProgress(result.session.studentState)).toBe(false);
    expect(storage.writes).toBe(1);
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('resetSession er immutable', () => {
    const base = withRaw(createSessionFromVariant(42, clock), '2210', 'debit', '12');
    const reset = resetSession(base, clock);
    expect(reset).not.toBe(base);
    expect(reset.studentState).not.toBe(base.studentState);
    expect(base.studentState['2210'].debit.rawInput).toBe('12');
  });
});

