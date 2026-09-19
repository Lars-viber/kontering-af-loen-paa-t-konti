// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { generateExercise } from '../src/domain/payroll';
import { SESSION_STORAGE_KEY, createSessionFromVariant, type StorageLike } from '../src/session';

afterEach(cleanup);

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
const clock = () => '2026-09-17T12:00:00.000Z';

describe('Hovedmenu og exercise shell', () => {
  it('viser menu uden session og ingen Fortsæt', () => {
    render(<App storage={new MemoryStorage()} clock={clock} randomUint32={() => 0} />);
    expect(screen.getByRole('heading', { name: 'Kontering af løn på T-konti' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generér ny opgave' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bestemt variant' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fortsæt opgaven' })).toBeNull();
  });

  it('viser aktiv session og fortsætter uden generatorcall', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(createSessionFromVariant(42, clock)));
    const generator = vi.fn(generateExercise);
    render(<App storage={storage} clock={clock} generator={generator} />);
    expect(screen.getByText('AKTIV OPGAVE')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Variant 42' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt opgaven' }));
    expect(screen.getByRole('heading', { name: 'Samlebilag for 8 medarbejdere' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('starter bestemt variant og vender tabsfrit til hovedmenu', async () => {
    const storage = new MemoryStorage();
    const generator = vi.fn(generateExercise);
    render(<App storage={storage} clock={clock} generator={generator} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.getByText('Variant 42')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Samlebilag for 8 medarbejdere' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Til hovedmenu' }));
    expect(screen.getByRole('button', { name: 'Fortsæt opgaven' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('viser inline fejl og starter ikke ugyldig variant', async () => {
    const generator = vi.fn(generateExercise);
    render(<App storage={new MemoryStorage()} clock={clock} generator={generator} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.getByRole('alert').textContent).toContain('heltal fra 1 til 999999');
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('annullerer replacement uden state- eller generatorændring og bekræfter derefter', async () => {
    const storage = new MemoryStorage();
    const generator = vi.fn(generateExercise);
    render(<App storage={storage} clock={clock} generator={generator} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    await userEvent.click(screen.getByRole('button', { name: 'Til hovedmenu' }));

    const before = storage.getItem(SESSION_STORAGE_KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '43');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.getByRole('dialog', { name: 'Du har en igangværende opgave' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Annuller' }));
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(before);
    expect(generator).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Bestemt variant' }));
    await userEvent.type(screen.getByLabelText('Variantnummer'), '43');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start ny opgave' }));
    expect(screen.getByText('Variant 43')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!);
    expect(saved.variant).toBe(43);
    expect(saved.studentState['2210'].debit.rawInput).toBe('');
  });

  it('genererer via injected variantkilde og undgår aktiv variant', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(createSessionFromVariant(1, clock)));
    render(<App storage={storage} clock={clock} randomUint32={() => 0} />);
    await userEvent.click(screen.getByRole('button', { name: 'Generér ny opgave' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start ny opgave' }));
    expect(screen.getByText('Variant 2')).toBeTruthy();
  });

  it('viser korrupt storage diskret og kan fjerne den', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{broken json');
    render(<App storage={storage} clock={clock} />);
    expect(screen.getByRole('alert').textContent).toContain('Gemt opgave kunne ikke indlæses');
    await userEvent.click(screen.getByRole('button', { name: 'Fjern gemt opgave' }));
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});