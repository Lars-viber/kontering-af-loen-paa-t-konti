// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { generateExercise } from '../src/domain/payroll';
import { SESSION_STORAGE_KEY, updateAndSaveStudentField, type StorageLike } from '../src/session';
import { ExerciseView } from '../src/ui/exercise';
import { createCompletedSession } from './helpers/completedSession';

afterEach(cleanup);

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  writes = 0;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes += 1; this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
const clock = () => '2026-09-17T14:00:00.000Z';

function renderCompleted({ dotted = false, randomUint32 = () => 0 } = {}) {
  const storage = new MemoryStorage();
  const session = createCompletedSession(42, dotted ? '2210' : undefined);
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  storage.writes = 0;
  const generator = vi.fn(generateExercise);
  render(<App storage={storage} clock={clock} generator={generator} randomUint32={randomUint32} />);
  return { storage, session, generator };
}

describe('J4 completed menu og overview', () => {
  it('viser completed card efter restore uden Continue eller generatorcall', () => {
    const { generator } = renderCompleted();
    expect(screen.getByText('AFSLUTTET OPGAVE')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Variant 42' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Se afsluttet opgave' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fortsæt opgaven' })).toBeNull();
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('åbner samlet read-only view uden exercise-kontroller', async () => {
    renderCompleted({ dotted: true });
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    expect(screen.getByRole('heading', { name: 'Lønkonteringen er korrekt' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Lønbilag' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Kontoplan' })).toBeTruthy();
    expect(document.querySelectorAll('[data-completed-account-id]')).toHaveLength(8);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Kontrollér' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nulstil svar' })).toBeNull();
    expect(screen.getAllByText('–')).toHaveLength(8);
    const first = document.querySelector<HTMLElement>('[data-completed-account-id="2210"]')!;
    expect(within(first).getByText('405.908')).toBeTruthy();
  });

  it('viser completed totaler fra studentState og balancestatus', async () => {
    renderCompleted();
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    const totals = screen.getByRole('heading', { name: 'Elevens posteringer' }).closest('section')!;
    expect(within(totals).getAllByText('433.375')).toHaveLength(2);
    expect(within(totals).getByText('Balancerer', { exact: true })).toBeTruthy();
  });

  it('navigerer menu-overview-menu uden sessionændring eller generatorcall', async () => {
    const { storage, generator } = renderCompleted();
    const before = storage.getItem(SESSION_STORAGE_KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Til hovedmenu' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(before);
    expect(generator).toHaveBeenCalledTimes(0);
  });
});

describe('J4 ny opgave efter completion', () => {
  it('starter tilfældig ny blank opgave uden unfinished-dialog', async () => {
    const { storage, generator } = renderCompleted();
    await userEvent.click(screen.getByRole('button', { name: 'Generér ny opgave' }));
    expect(screen.queryByRole('dialog', { name: 'Du har en igangværende opgave' })).toBeNull();
    expect(screen.getByText('Variant 1 · Generator v1')).toBeTruthy();
    expect(screen.getAllByRole('textbox').every(input => (input as HTMLInputElement).value === '')).toBe(true);
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved.completed).toBe(false);
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('starter bestemt anden variant blank uden confirmation', async () => {
    const { storage } = renderCompleted();
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.queryByRole('dialog', { name: 'Du har en igangværende opgave' })).toBeNull();
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved).toMatchObject({ variant: 1, completed: false });
    expect(Object.values(saved.studentState).every((account: any) => account.debit.rawInput === '' && account.credit.rawInput === '')).toBe(true);
  });

  it('genstarter samme variant med identisk snapshot og ny blank state', async () => {
    const { storage, session } = renderCompleted();
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved.exerciseSnapshot).toEqual(session.exerciseSnapshot);
    expect(saved.completed).toBe(false);
    expect(saved.studentState['2210'].debit.rawInput).toBe('');
  });
});

describe('J4 completed exercise state', () => {
  it('skjuler reset og check og viser de tre completion-actions', () => {
    render(<ExerciseView
      session={createCompletedSession()}
      onEdit={vi.fn()}
      onCheck={vi.fn()}
      onRequestReset={vi.fn()}
      onOpenCompleted={vi.fn()}
      onGoMenu={vi.fn()}
      onGenerate={vi.fn()}
    />);
    expect(screen.queryByRole('button', { name: 'Nulstil svar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Kontrollér' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Se afsluttet opgave' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Til hovedmenu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generér ny opgave' })).toBeTruthy();
  });
});
describe('J4 completed immutability', () => {
  it('låst felt giver samme session og ingen storage-write', () => {
    const session = createCompletedSession();
    const storage = new MemoryStorage();
    const result = updateAndSaveStudentField(storage, session, '2210', 'debit', '1', clock);
    expect(result.session).toBe(session);
    expect(result.save).toEqual({ ok: true });
    expect(storage.writes).toBe(0);
  });
});

