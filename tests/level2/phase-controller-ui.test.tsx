// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { generateLevel2Case } from '../../src/domain/level2';
import {
  FINAL_CONTROL_EXPECTED_REASONS,
  checkCheckpointSection,
  checkFinalControlItem,
  editCheckpointAmount,
  selectFinalControlReason,
  type Level2StudentState,
} from '../../src/level2/state';
import {
  LEVEL2_SESSION_STORAGE_KEY,
  createLevel2PersistedSession,
  decodeLevel2Session,
  encodeLevel2Session,
  type Level2Storage,
} from '../../src/level2/session';
import {
  advanceToCheckpoint,
  advanceToFinalControl,
  completeCheckpoint,
  completeFinalControl,
} from './state-helpers';

afterEach(cleanup);
const snapshot = generateLevel2Case(42);
const clock = () => '2026-09-19T08:00:00.000Z';

class PhaseStorage implements Level2Storage {
  readonly data = new Map<string, string>();
  failSet = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('quota');
    this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

function preload(state: Level2StudentState): PhaseStorage {
  const storage = new PhaseStorage();
  const session = createLevel2PersistedSession(snapshot, state, clock());
  storage.data.set(LEVEL2_SESSION_STORAGE_KEY, encodeLevel2Session(session));
  return storage;
}

function renderPhase(state: Level2StudentState) {
  const storage = preload(state);
  const generator = vi.fn(generateLevel2Case);
  render(<App
    storage={storage}
    level2Storage={storage}
    clock={clock}
    level2Clock={clock}
    level2Generator={generator}
  />);
  return { storage, generator };
}

function partialCheckpoint(): Level2StudentState {
  let state = advanceToCheckpoint(snapshot);
  for (const [field, amount] of Object.entries(snapshot.derived.checkpoint.hourlyGrossPayroll)) {
    state = editCheckpointAmount(state, 'A', field as never, String(amount));
  }
  state = checkCheckpointSection(snapshot, state, 'A');
  state = editCheckpointAmount(state, 'B', 'wageAccount', '1');
  return checkCheckpointSection(snapshot, state, 'B');
}

function partialFinal(): Level2StudentState {
  let state = advanceToFinalControl(snapshot);
  state = selectFinalControlReason(state, 'aTax', FINAL_CONTROL_EXPECTED_REASONS.aTax);
  state = checkFinalControlItem(state, 'aTax');
  state = selectFinalControlReason(state, 'amContribution', 'aTaxJunePaid');
  return checkFinalControlItem(state, 'amContribution');
}

async function openAndRoundtrip(expectedHeading: string, storage: PhaseStorage, generator: ReturnType<typeof vi.fn>) {
  const before = storage.data.get(LEVEL2_SESSION_STORAGE_KEY);
  await userEvent.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
  expect(screen.getByRole('heading', { name: expectedHeading })).toBeTruthy();
  await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Til forsiden' }));
  await userEvent.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
  expect(screen.getByRole('heading', { name: expectedHeading })).toBeTruthy();
  expect(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)).toBe(before);
  expect(generator).toHaveBeenCalledTimes(0);
}

describe('J3C controller, autosave og reload', () => {
  it('roundtripper partial checkpoint med locked A og editable B', async () => {
    const { storage, generator } = renderPhase(partialCheckpoint());
    await openAndRoundtrip('Afstemning pr. 30/6', storage, generator);
    const a = screen.getByRole('heading', { name: 'Bruttoløn ÅTD – timelønnede' }).closest('section')!;
    const b = screen.getByRole('heading', { name: 'Bruttoløn ÅTD – månedslønnede' }).closest('section')!;
    expect(within(a).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(a).queryByRole('textbox')).toBeNull();
    expect(within(b).getByText('Kontrollér dine beregninger og prøv igen.')).toBeTruthy();
    expect(within(b).getByRole('textbox', { name: 'Lønninger – månedslønnede, saldo ÅTD' })).toBeTruthy();
  });

  it('roundtripper B10 efter completed checkpoint', async () => {
    const state = completeCheckpoint(snapshot, advanceToCheckpoint(snapshot));
    const { storage, generator } = renderPhase(state);
    await openAndRoundtrip('Betaling via Samlet Betaling – ATP', storage, generator);
  });

  it('roundtripper partial slutkontrol', async () => {
    const { storage, generator } = renderPhase(partialFinal());
    await openAndRoundtrip('Slutkontrol', storage, generator);
    const correct = screen.getByRole('heading', { name: 'Skyldig A-skat' }).closest('section')!;
    const wrong = screen.getByRole('heading', { name: 'Skyldig AM-bidrag' }).closest('section')!;
    expect(within(correct).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(wrong).getByText('Vælg en anden forklaring.')).toBeTruthy();
  });

  it('roundtripper completed write-protected', async () => {
    const completed = completeFinalControl(advanceToFinalControl(snapshot));
    const { storage, generator } = renderPhase(completed);
    await openAndRoundtrip('Niveau 2 gennemført', storage, generator);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('beholder checkpoint-edit ved savefejl og retry gemmer samme state', async () => {
    const { storage } = renderPhase(advanceToCheckpoint(snapshot));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    storage.failSet = true;
    const input = screen.getByLabelText('Lønninger – timelønnede, saldo ÅTD');
    await user.type(input, '123');
    expect((input as HTMLInputElement).value).toBe('123');
    expect(screen.getByRole('alert').textContent).toContain('seneste ændring kunne ikke gemmes');
    storage.failSet = false;
    await user.click(screen.getByRole('button', { name: 'Prøv at gemme igen' }));
    const decoded = decodeLevel2Session(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid checkpoint session');
    expect(decoded.value.studentState.checkpoint.A.values.wageAccount).toBe('123');
  });

  it('beholder final-reason ved savefejl og retry gemmer samme state', async () => {
    const { storage } = renderPhase(advanceToFinalControl(snapshot));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    storage.failSet = true;
    const select = screen.getAllByLabelText('Vælg forklaring')[0];
    await user.selectOptions(select, FINAL_CONTROL_EXPECTED_REASONS.aTax);
    expect((select as HTMLSelectElement).value).toBe(FINAL_CONTROL_EXPECTED_REASONS.aTax);
    expect(screen.getByRole('alert').textContent).toContain('seneste ændring kunne ikke gemmes');
    storage.failSet = false;
    await user.click(screen.getByRole('button', { name: 'Prøv at gemme igen' }));
    const decoded = decodeLevel2Session(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid final session');
    expect(decoded.value.studentState.finalControl.items[0].selectedReasonId).toBe(FINAL_CONTROL_EXPECTED_REASONS.aTax);
  });
});
