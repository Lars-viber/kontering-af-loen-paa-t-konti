// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateV2Case } from '../../src/domain/level2/v2';
import {
  startNewV2ControllerSession,
  type V2ControllerCaseFactory,
} from '../../src/level2/v2/controller';
import {
  V2_LEGACY_SESSION_STORAGE_KEY,
  V2_SESSION_STORAGE_KEY,
} from '../../src/level2/v2/session';
import { SESSION_STORAGE_KEY, createSessionFromVariant } from '../../src/session';
import {
  V2RuntimeStorage,
  continueV2,
  goV2Home,
  openV2Setup,
  renderV2Runtime,
  startSpecificV2,
  v2RuntimeClock,
} from './v2-runtime-test-helpers';

afterEach(cleanup);

describe('J3C active V2.1 Home and lifecycle integration', () => {
  it('shows both levels without generating or saving on mount', () => {
    const storage = new V2RuntimeStorage();
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    expect(screen.getByRole('heading', { name: 'Niveau 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Niveau 2' })).toBeTruthy();
    expect(screen.getByText('Bogfør juni og afstem bogføringen pr. 30/6')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
    expect(storage.writes).toEqual([]);
  });

  it('starts explicit variant 42 in the V2.1 B1 workspace and writes only the v2 key', async () => {
    const storage = new V2RuntimeStorage();
    const legacy = '{"legacy":"unchanged"}';
    storage.data.set(V2_LEGACY_SESSION_STORAGE_KEY, legacy);
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    await startSpecificV2(42);
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    expect(screen.getByText('B1 · Juni 2026')).toBeTruthy();
    expect(screen.getByText(/0 af 9 bilag gennemført/)).toBeTruthy();
    expect(generator).toHaveBeenCalledOnce();
    expect(storage.data.has(V2_SESSION_STORAGE_KEY)).toBe(true);
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe(legacy);
    expect(storage.writes).toEqual([V2_SESSION_STORAGE_KEY]);
  });

  it('uses the secure injected random source and generates exactly once', async () => {
    const storage = new V2RuntimeStorage();
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator, () => 999998);
    await openV2Setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tilfældig variant' }));
    expect(screen.getByText('Niveau 2 · Variant 999999')).toBeTruthy();
    expect(generator).toHaveBeenCalledOnce();
  });

  it('rejects invalid variant input without generation', async () => {
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(new V2RuntimeStorage(), generator);
    await openV2Setup();
    await userEvent.type(screen.getByLabelText('Variant'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
    expect(screen.getByRole('alert').textContent).toContain('heltal fra 1 til 999999');
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('continues a valid v2 session over legacy data without regeneration', async () => {
    const storage = new V2RuntimeStorage();
    storage.data.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy sentinel');
    startNewV2ControllerSession(storage, 42, v2RuntimeClock);
    const beforeV2 = storage.data.get(V2_SESSION_STORAGE_KEY);
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('Niveau 2 · Variant 42')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
    expect(storage.data.get(V2_SESSION_STORAGE_KEY)).toBe(beforeV2);
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy sentinel');
  });

  it('shows legacy-only guidance without opening, migrating or deleting v1', async () => {
    const storage = new V2RuntimeStorage();
    const legacy = '{"old":true}';
    storage.data.set(V2_LEGACY_SESSION_STORAGE_KEY, legacy);
    renderV2Runtime(storage);
    expect(screen.getByText('Du har en gemt Niveau 2-opgave fra en tidligere version.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fortsæt Niveau 2' })).toBeNull();
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe(legacy);
    expect(storage.data.has(V2_SESSION_STORAGE_KEY)).toBe(false);
    await startSpecificV2(42);
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe(legacy);
    expect(storage.data.has(V2_SESSION_STORAGE_KEY)).toBe(true);
  });

  it('keeps invalid v2 bytes untouched until explicit new-session submission and never falls back to v1', async () => {
    const storage = new V2RuntimeStorage();
    storage.data.set(V2_SESSION_STORAGE_KEY, '{broken');
    storage.data.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy sentinel');
    renderV2Runtime(storage);
    expect(screen.getByRole('alert').textContent).toContain('kan ikke indlæses');
    expect(screen.queryByRole('button', { name: 'Fortsæt Niveau 2' })).toBeNull();
    expect(storage.data.get(V2_SESSION_STORAGE_KEY)).toBe('{broken');
    expect(storage.removals).toEqual([]);
    await startSpecificV2(42);
    expect(storage.data.get(V2_SESSION_STORAGE_KEY)).not.toBe('{broken');
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy sentinel');
    expect(storage.removals).toEqual([]);
  });

  it('shows storage failure safely and retries the typed load without generation', async () => {
    const storage = new V2RuntimeStorage();
    storage.failGetKeys.add(V2_SESSION_STORAGE_KEY);
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    expect(screen.getByRole('alert').textContent).toContain('kan ikke tilgås lige nu');
    expect(screen.queryByRole('button', { name: /Niveau 2-opgave/ })).toBeNull();
    storage.failGetKeys.clear();
    await userEvent.click(screen.getByRole('button', { name: 'Prøv igen' }));
    expect(screen.getByRole('button', { name: 'Ny Niveau 2-opgave' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('requires replacement confirmation and cancel changes neither storage nor generator count', async () => {
    const storage = new V2RuntimeStorage();
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    await startSpecificV2(42);
    await goV2Home();
    const before = storage.data.get(V2_SESSION_STORAGE_KEY);
    await startSpecificV2(43);
    const dialog = screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuller' }));
    expect(storage.data.get(V2_SESSION_STORAGE_KEY)).toBe(before);
    expect(generator).toHaveBeenCalledTimes(1);
    await startSpecificV2(43);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' }))
      .getByRole('button', { name: 'Start ny opgave' }));
    expect(screen.getByText('Niveau 2 · Variant 43')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it('defers random replacement generation until explicit confirmation', async () => {
    const storage = new V2RuntimeStorage();
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator, () => 999998);
    await startSpecificV2(42);
    await goV2Home();
    await openV2Setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tilfældig variant' }));
    expect(screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(1);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start ny Niveau 2-opgave?' }))
      .getByRole('button', { name: 'Start ny opgave' }));
    expect(screen.getByText('Niveau 2 · Variant 999999')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(2);
  });
  it('resets the same V2.1 snapshot without regeneration', async () => {
    const storage = new V2RuntimeStorage();
    const generator = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
    renderV2Runtime(storage, generator);
    await startSpecificV2(42);
    const before = JSON.parse(storage.data.get(V2_SESSION_STORAGE_KEY)!);
    await userEvent.click(screen.getByRole('button', { name: 'Nulstil opgave' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Nulstil Niveau 2-opgaven?' }))
      .getByRole('button', { name: 'Nulstil opgave' }));
    const reset = JSON.parse(storage.data.get(V2_SESSION_STORAGE_KEY)!);
    expect(reset.variant).toBe(42);
    expect(reset.caseSnapshot).toEqual(before.caseSnapshot);
    expect(reset.studentState.phase).toBe('documentEntry');
    expect(reset.studentState.currentDocumentId).toBe('B1');
    expect(generator).toHaveBeenCalledOnce();
  });

  it('keeps the unchanged Level 1 session beside V2.1', async () => {
    const storage = new V2RuntimeStorage();
    storage.data.set(SESSION_STORAGE_KEY, JSON.stringify(createSessionFromVariant(7, v2RuntimeClock)));
    const level1Before = storage.data.get(SESSION_STORAGE_KEY);
    renderV2Runtime(storage);
    await startSpecificV2(42);
    expect(storage.data.get(SESSION_STORAGE_KEY)).toBe(level1Before);
    await goV2Home();
    expect(screen.getByRole('button', { name: 'Fortsæt opgaven' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fortsæt Niveau 2' })).toBeTruthy();
  });
});
