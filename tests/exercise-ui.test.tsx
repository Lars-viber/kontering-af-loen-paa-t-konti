// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { ACCOUNT_IDS, generateExercise, type EntrySide } from '../src/domain/payroll';
import { SESSION_STORAGE_KEY, createSessionFromVariant, type StorageLike } from '../src/session';

afterEach(cleanup);

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
const clock = () => '2026-09-17T13:00:00.000Z';
const SIDES: readonly EntrySide[] = ['debit', 'credit'];

async function openVariant42(storage = new MemoryStorage(), generator = vi.fn(generateExercise)) {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(createSessionFromVariant(42, clock)));
  render(<App storage={storage} clock={clock} generator={generator} />);
  await userEvent.click(screen.getByRole('button', { name: 'Fortsæt opgaven' }));
  return { storage, generator };
}

describe('J3 bilag, kontoplan og video', () => {
  it('viser variant 42-lønbilaget med dansk formatering og fortegn', async () => {
    await openVariant42();
    const card = screen.getByRole('heading', { name: 'Lønbilag' }).closest('section')!;
    for (const value of ['433.375', '−792', '−26.675', '405.908', '−32.472', '−127.943', '245.493']) {
      expect(within(card).getByText(value)).toBeTruthy();
    }
    expect(screen.queryByText('answerKey')).toBeNull();
  });

  it('viser præcis de otte konti i J1-rækkefølge', async () => {
    await openVariant42();
    const cards = [...document.querySelectorAll<HTMLElement>('[data-account-id]')];
    expect(cards.map(card => card.dataset.accountId)).toEqual([...ACCOUNT_IDS]);
    expect(cards.map(card => card.querySelector('strong')?.textContent)).toEqual([
      '2210 Lønninger', '2215 Pensioner', '2223 ATP', '6920 Skyldig A-skat',
      '6921 Skyldig ATP', '6922 Skyldig pension', '6930 Skyldig AM-bidrag', '5820 Bankkonto',
    ]);
  });

  it('lazy-mounter og afmonterer videogennemgangen', async () => {
    await openVariant42();
    const button = screen.getByRole('button', { name: /Videogennemgang/ });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTitle('Videogennemgang af lønbogføring')).toBeNull();
    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTitle('Videogennemgang af lønbogføring')).toBeTruthy();
    expect(screen.getByText(/forældede ATP-satser/)).toBeTruthy();
    await userEvent.click(button);
    expect(screen.queryByTitle('Videogennemgang af lønbogføring')).toBeNull();
  });
});

describe('J3 feltkontrol, totaler og persistence', () => {
  it('all-blank check låser 8 zero-felter og markerer 8 nonzero-felter', async () => {
    await openVariant42();
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.filter(input => (input as HTMLInputElement).disabled)).toHaveLength(8);
    expect(screen.getAllByText('✓ Korrekt')).toHaveLength(8);
    expect(screen.getAllByText('Forkert – ret beløbet')).toHaveLength(8);
    expect(screen.queryByText('Lønkonteringen er korrekt')).toBeNull();
  });

  it('låser korrekt Debet uafhængigt og nulstiller red status ved redigering', async () => {
    const { storage } = await openVariant42();
    const debit = screen.getByLabelText('2210 Lønninger – Debet');
    const credit = screen.getByLabelText('2210 Lønninger – Kredit');
    await userEvent.type(debit, '405908');
    await userEvent.type(credit, '1');
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    expect((debit as HTMLInputElement).disabled).toBe(true);
    expect((credit as HTMLInputElement).disabled).toBe(false);
    expect(credit.getAttribute('aria-invalid')).toBe('true');
    await userEvent.clear(credit);
    expect(credit.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryAllByText('Forkert – ret beløbet').length).toBeLessThan(8);
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved.studentState['2210'].credit).toEqual({ rawInput: '', status: 'unchecked', locked: false });
  });

  it('viser parserfeedback og ingen balance-status ved invalid input', async () => {
    await openVariant42();
    await userEvent.type(screen.getByLabelText('2210 Lønninger – Kredit'), '12kr');
    expect(screen.getByText('Ugyldigt beløb')).toBeTruthy();
    expect(screen.getByText('Ret ugyldige beløb for at beregne totalen.')).toBeTruthy();
    expect(screen.queryByText('Balancerer')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    expect((screen.getByLabelText('2210 Lønninger – Kredit') as HTMLInputElement).disabled).toBe(false);
  });

  it('viser balancerer for lige men fagligt forkert besvarelse', async () => {
    await openVariant42();
    await userEvent.type(screen.getByLabelText('2210 Lønninger – Debet'), '100');
    await userEvent.type(screen.getByLabelText('5820 Bankkonto – Kredit'), '100');
    expect(screen.getByText('Balancerer')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    expect(screen.getByText('Balancerer')).toBeTruthy();
    expect(screen.queryByText('Lønkonteringen er korrekt')).toBeNull();
    expect(screen.getAllByText('Forkert – ret beløbet').length).toBeGreaterThan(0);
  });

  it('completer, autosaver og viser låst succes uden aktiv Kontrollér-knap', async () => {
    const { storage } = await openVariant42();
    const snapshot = createSessionFromVariant(42, clock).exerciseSnapshot;
    for (const account of snapshot.accounts) for (const side of SIDES) {
      const expected = snapshot.answerKey[account.id][side];
      if (expected > 0) await userEvent.type(screen.getByLabelText(`${account.id} ${account.name} – ${side === 'debit' ? 'Debet' : 'Kredit'}`), String(expected));
    }
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    expect(screen.getByText('Lønkonteringen er korrekt')).toBeTruthy();
    expect(screen.getAllByRole('textbox').every(input => (input as HTMLInputElement).disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Kontrollér' })).toBeNull();
    expect(screen.getByText('Balancerer')).toBeTruthy();
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved.completed).toBe(true);
  });
});

describe('J3 reset, Continue og storagefejl', () => {
  it('reset kræver confirmation, cancel bevarer og confirm rydder uden generatorcall', async () => {
    const storage = new MemoryStorage();
    const generator = vi.fn(generateExercise);
    await openVariant42(storage, generator);
    const input = screen.getByLabelText('2210 Lønninger – Debet');
    await userEvent.type(input, '12');
    await userEvent.click(screen.getByRole('button', { name: 'Nulstil svar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Annuller' }));
    expect((input as HTMLInputElement).value).toBe('12');
    await userEvent.click(screen.getByRole('button', { name: 'Nulstil svar' }));
    const resetDialog = screen.getByRole('dialog', { name: 'Nulstil svar?' });
    await userEvent.click(within(resetDialog).getByRole('button', { name: 'Nulstil svar' }));
    expect(screen.getAllByRole('textbox').every(field => (field as HTMLInputElement).value === '')).toBe(true);
    expect(generator).toHaveBeenCalledTimes(0);
    expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!).variant).toBe(42);
  });

  it('bevarer exact elevstate gennem hovedmenu, Continue og remount', async () => {
    const storage = new MemoryStorage();
    const generator = vi.fn(generateExercise);
    await openVariant42(storage, generator);
    await userEvent.type(screen.getByLabelText('2210 Lønninger – Debet'), '145.812');
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér' }));
    await userEvent.clear(screen.getByLabelText('2210 Lønninger – Debet'));
    await userEvent.type(screen.getByLabelText('2210 Lønninger – Debet'), '433375');
    await userEvent.click(screen.getByRole('button', { name: 'Til hovedmenu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt opgaven' }));
    expect((screen.getByLabelText('2210 Lønninger – Debet') as HTMLInputElement).value).toBe('433375');
    cleanup();
    render(<App storage={storage} clock={clock} generator={generator} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt opgaven' }));
    expect((screen.getByLabelText('2210 Lønninger – Debet') as HTMLInputElement).value).toBe('433375');
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('beholder React-state og viser diskret besked ved autosavefejl', async () => {
    const raw = JSON.stringify(createSessionFromVariant(42, clock));
    const storage: StorageLike = { getItem: () => raw, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    render(<App storage={storage} clock={clock} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt opgaven' }));
    const input = screen.getByLabelText('2210 Lønninger – Debet');
    await userEvent.type(input, '12');
    expect((input as HTMLInputElement).value).toBe('12');
    expect(screen.getByText('Ændringen kunne ikke gemmes lokalt.')).toBeTruthy();
  });
});


