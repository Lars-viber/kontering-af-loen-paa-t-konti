// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { generateExercise } from '../../src/domain/payroll';
import { generateLevel2Case } from '../../src/domain/level2';
import { startNewLevel2Session } from '../../src/level2/controller';
import { LEVEL2_SESSION_STORAGE_KEY, type Level2Storage } from '../../src/level2/session';
import { SESSION_STORAGE_KEY, createSessionFromVariant } from '../../src/session';

afterEach(cleanup);

class UiStorage implements Level2Storage {
  readonly data = new Map<string, string>();
  failGet = false;
  failSet = false;
  failRemove = false;
  getItem(key: string) {
    if (this.failGet && key === LEVEL2_SESSION_STORAGE_KEY) throw new Error('blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failSet && key === LEVEL2_SESSION_STORAGE_KEY) throw new Error('quota');
    this.data.set(key, value);
  }
  removeItem(key: string) {
    if (this.failRemove && key === LEVEL2_SESSION_STORAGE_KEY) throw new Error('blocked');
    this.data.delete(key);
  }
}

const clock = () => '2026-09-18T15:00:00.000Z';

function renderApp(storage = new UiStorage(), level2Generator = vi.fn(generateLevel2Case)) {
  render(<App
    storage={storage}
    level2Storage={storage}
    clock={clock}
    level2Clock={clock}
    generator={vi.fn(generateExercise)}
    level2Generator={level2Generator}
    level2RandomUint32={() => 999998}
  />);
  return { storage, level2Generator };
}

async function startSpecificVariant(variant: number): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' }));
  await userEvent.type(screen.getByLabelText('Variant'), String(variant));
  await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
}

async function returnHome(): Promise<void> {
  const main = screen.getByRole('main');
  await userEvent.click(within(main).getByRole('button', { name: 'Til forsiden' }));
}

describe('J3A app shell and Level 2 lifecycle UI', () => {
  it('shows both levels and opens the unchanged Level 1 menu', async () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Niveau 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Niveau 2' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Åbn Niveau 1' }));
    expect(screen.getByText('NIVEAU 1 · GRUNDLÆGGENDE LØNKONTERING')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generér ny opgave' })).toBeTruthy();
    await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Til forsiden' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' }));
    expect(screen.getByRole('dialog', { name: 'Ny Niveau 2-opgave' })).toBeTruthy();
  });

  it('starts variant 42, returns home and resumes without another generator call', async () => {
    const { storage, level2Generator } = renderApp();
    await startSpecificVariant(42);
    expect(screen.getByRole('heading', { name: 'Niveau 2' })).toBeTruthy();
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    expect(screen.getByText('Bilag B1')).toBeTruthy();
    expect(level2Generator).toHaveBeenCalledOnce();
    const savedBeforeHome = storage.data.get(LEVEL2_SESSION_STORAGE_KEY);

    await returnHome();
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    expect(level2Generator).toHaveBeenCalledOnce();
    expect(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)).toBe(savedBeforeHome);
  });

  it('starts the upper endpoint through the injected unbiased random source', async () => {
    const { level2Generator } = renderApp();
    await userEvent.click(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tilfældig variant' }));
    expect(screen.getByText('Niveau 2 · Variant 999999')).toBeTruthy();
    expect(level2Generator).toHaveBeenCalledWith(999999);
  });

  it('validates specific variant input without calling the generator', async () => {
    const { level2Generator } = renderApp();
    await userEvent.click(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' }));
    await userEvent.type(screen.getByLabelText('Variant'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.getByRole('alert').textContent).toContain('heltal fra 1 til 999999');
    expect(level2Generator).toHaveBeenCalledTimes(0);
  });

  it('requires replacement confirmation and cancel leaves storage unchanged', async () => {
    const { storage, level2Generator } = renderApp();
    await startSpecificVariant(42);
    await returnHome();
    const before = storage.data.get(LEVEL2_SESSION_STORAGE_KEY);

    await startSpecificVariant(43);
    const dialog = screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuller' }));
    expect(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)).toBe(before);
    expect(level2Generator).toHaveBeenCalledOnce();

    await startSpecificVariant(43);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' }))
      .getByRole('button', { name: 'Start ny opgave' }));
    expect(screen.getByText('Niveau 2 · Variant 43')).toBeTruthy();
    expect(level2Generator).toHaveBeenCalledTimes(2);
  });

  it('cancels reset, then resets the same variant and snapshot', async () => {
    const { storage, level2Generator } = renderApp();
    await startSpecificVariant(42);
    const before = JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    await userEvent.click(screen.getByRole('button', { name: 'Nulstil opgave' }));
    let dialog = screen.getByRole('dialog', { name: 'Nulstil Niveau 2-opgaven?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuller' }));
    expect(JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!)).toEqual(before);

    await userEvent.click(screen.getByRole('button', { name: 'Nulstil opgave' }));
    dialog = screen.getByRole('dialog', { name: 'Nulstil Niveau 2-opgaven?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Nulstil opgave' }));
    const reset = JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    expect(reset.variant).toBe(42);
    expect(reset.caseSnapshot).toEqual(before.caseSnapshot);
    expect(reset.studentState.documents[0].rows).toEqual([]);
    expect(level2Generator).toHaveBeenCalledOnce();
  });

  it('shows invalid data without overwrite and removes only on request', async () => {
    const storage = new UiStorage();
    storage.data.set(LEVEL2_SESSION_STORAGE_KEY, '{broken');
    const { level2Generator } = renderApp(storage);
    expect(screen.getByRole('alert').textContent).toContain('kan ikke indlæses');
    expect(screen.queryByRole('button', { name: 'Ny Niveau 2-opgave' })).toBeNull();
    expect(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)).toBe('{broken');
    await userEvent.click(screen.getByRole('button', { name: 'Fjern ugyldig gemt opgave' }));
    expect(storage.data.has(LEVEL2_SESSION_STORAGE_KEY)).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' }));
    expect(screen.getByRole('dialog', { name: 'Ny Niveau 2-opgave' })).toBeTruthy();
    expect(level2Generator).toHaveBeenCalledTimes(0);
  });

  it('blocks Level 2 creation safely when storage cannot be read', () => {
    const storage = new UiStorage();
    storage.failGet = true;
    renderApp(storage);
    expect(screen.getByRole('alert').textContent).toContain('kan ikke tilgås lige nu');
    expect(screen.queryByRole('button', { name: 'Ny Niveau 2-opgave' })).toBeNull();
  });

  it('shows save failure, keeps the session open and retries current data', async () => {
    const storage = new UiStorage();
    storage.failSet = true;
    renderApp(storage);
    await startSpecificVariant(42);
    expect(screen.getByRole('alert').textContent).toContain('seneste ændring kunne ikke gemmes');
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    storage.failSet = false;
    await userEvent.click(screen.getByRole('button', { name: 'Prøv at gemme igen' }));
    expect(screen.getByText('Gemt')).toBeTruthy();
    expect(JSON.parse(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!).variant).toBe(42);
  });

  it('keeps Level 1 and Level 2 sessions side by side', async () => {
    const storage = new UiStorage();
    storage.data.set(SESSION_STORAGE_KEY, JSON.stringify(createSessionFromVariant(7, clock)));
    const level1Before = storage.data.get(SESSION_STORAGE_KEY);
    renderApp(storage);
    await startSpecificVariant(42);
    expect(storage.data.get(SESSION_STORAGE_KEY)).toBe(level1Before);
    await returnHome();
    expect(screen.getByRole('button', { name: 'Fortsæt opgaven' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fortsæt Niveau 2' })).toBeTruthy();
  });

  it('Escape closes Level 2 setup without destructive action and restores focus', async () => {
    const { storage } = renderApp();
    const opener = screen.getByRole('button', { name: 'Ny Niveau 2-opgave' });
    opener.focus();
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Ny Niveau 2-opgave' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Ny Niveau 2-opgave' })).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(storage.data.has(LEVEL2_SESSION_STORAGE_KEY)).toBe(false);
  });
});

describe('preloaded Level 2 session', () => {
  it('renders a resumable session created outside the App controller', async () => {
    const storage = new UiStorage();
    startNewLevel2Session(storage, 42, clock);
    const generator = vi.fn(generateLevel2Case);
    renderApp(storage, generator);
    await userEvent.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  });
});
