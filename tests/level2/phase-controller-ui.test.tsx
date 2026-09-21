// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateV2Case } from '../../src/domain/level2/v2';
import {
  advanceV2ControllerDocumentReview,
  completeV2ControllerLevel,
  startNewV2ControllerSession,
  type V2ControllerCaseFactory,
  type V2ControllerCurrentSession,
} from '../../src/level2/v2/controller';
import { V2_SESSION_STORAGE_KEY } from '../../src/level2/v2/session';
import {
  V2ControllerStorage,
  advanceToCheckpointThroughV2Controller,
  completeCheckpointThroughV2Controller,
  completeCurrentDocumentThroughV2Controller,
  sequenceClock,
  startedCurrent,
} from './v2-controller-test-helpers';
import {
  V2RuntimeStorage,
  continueV2,
  renderV2Runtime,
} from './v2-runtime-test-helpers';

afterEach(cleanup);

function started(): {
  storage: V2ControllerStorage;
  current: V2ControllerCurrentSession;
  clock: ReturnType<typeof sequenceClock>;
} {
  const storage = new V2ControllerStorage();
  const clock = sequenceClock();
  const current = startedCurrent(startNewV2ControllerSession(storage, 42, clock));
  return { storage, current, clock };
}

function reviewAt(documentNumber: number) {
  const setup = started();
  let current = setup.current;
  for (let index = 1; index <= documentNumber; index += 1) {
    current = completeCurrentDocumentThroughV2Controller(setup.storage, current, setup.clock);
    if (index < documentNumber) {
      current = advanceV2ControllerDocumentReview(setup.storage, current, setup.clock);
    }
  }
  return { ...setup, current };
}

function runtimeStorage(controllerStorage: V2ControllerStorage): V2RuntimeStorage {
  const storage = new V2RuntimeStorage();
  const raw = controllerStorage.values.get(V2_SESSION_STORAGE_KEY);
  if (!raw) throw new Error('Missing persisted V2.1 session');
  storage.data.set(V2_SESSION_STORAGE_KEY, raw);
  return storage;
}

function mockGenerator() {
  return vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory;
}

describe('J3C active V2.1 phase and restore integration', () => {
  it('restores documentReview B4 without advancing and advances only after click', async () => {
    const setup = reviewAt(4);
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    const first = renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('B4 · Juni 2026')).toBeTruthy();
    expect(screen.getByText('✓ Bilaget er korrekt bogført')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gå videre til næste bilag' })).toBeTruthy();
    expect(screen.queryByText('B5 · Juni 2026')).toBeNull();

    first.view.unmount();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('B4 · Juni 2026')).toBeTruthy();
    expect(screen.getByText('✓ Bilaget er korrekt bogført')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Gå videre til næste bilag' }));
    expect(screen.getByText('B5 · Juni 2026')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('restores B9 review and opens checkpoint only after explicit click', async () => {
    const setup = reviewAt(9);
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    const first = renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('B9 · Juni 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gå videre til afstemning' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeNull();

    first.view.unmount();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('B9 · Juni 2026')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Gå videre til afstemning' }));
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('restores checkpoint with source tallies, six controls, 13 accounts and editable A-E', async () => {
    const setup = started();
    setup.current = advanceToCheckpointThroughV2Controller(setup.storage, setup.current, setup.clock);
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    const reference = screen.getByRole('complementary', { name: 'Reference pr. 30/6' });
    expect(within(reference).getByRole('heading', { name: 'A. Lønsystemets tælleværker pr. 30/6' })).toBeTruthy();
    expect(within(reference).getByRole('heading', { name: 'B. Eksterne kontroloplysninger pr. 30/6' })).toBeTruthy();
    expect(reference.querySelectorAll('[data-reference-account]')).toHaveLength(13);
    expect(screen.getAllByPlaceholderText('Beløb')).toHaveLength(27);
    expect(document.body.textContent).not.toContain('Slutkontrol');
    expect(document.body.textContent).not.toMatch(/B1[0-3]/);
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('restores checkpointReview and completes only after explicit action', async () => {
    const setup = started();
    setup.current = advanceToCheckpointThroughV2Controller(setup.storage, setup.current, setup.clock);
    setup.current = completeCheckpointThroughV2Controller(
      setup.storage,
      setup.current,
      setup.clock,
    );
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    const first = renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByText('✓ Afstemningen pr. 30/6 stemmer')).toBeTruthy();
    expect(screen.getAllByText('5 af 5 afstemninger korrekte').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Afslut Niveau 2' })).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Niveau 2 gennemført' })).toBeNull();

    first.view.unmount();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getAllByRole('button', { name: 'Afslut Niveau 2' })).toHaveLength(2);
    await userEvent.click(screen.getAllByRole('button', { name: 'Afslut Niveau 2' })[1]);
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
    expect(screen.getByText('9 af 9 bilag gennemført · Afstemning ✓')).toBeTruthy();
    expect(generator).toHaveBeenCalledTimes(0);
  }, 15_000);

  it('restores completed V2.1 as the June summary', async () => {
    const setup = started();
    setup.current = advanceToCheckpointThroughV2Controller(setup.storage, setup.current, setup.clock);
    setup.current = completeCheckpointThroughV2Controller(
      setup.storage,
      setup.current,
      setup.clock,
    );
    setup.current = completeV2ControllerLevel(
      setup.storage,
      setup.current,
      setup.clock,
    );
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
    expect(screen.getByText(/bogført juni og afstemt bogføringen pr. 30\/6/)).toBeTruthy();
    expect(document.querySelectorAll('.l2v2-completed-balances > div')).toHaveLength(13);
    expect(document.body.textContent).not.toContain('Slutkontrol');
    expect(document.body.textContent).not.toMatch(/B1[0-3]/);
    expect(document.body.textContent).not.toContain('juli');
    expect(generator).toHaveBeenCalledTimes(0);
  });

  it('continues the same partial input after Home and a fresh App mount', async () => {
    const setup = started();
    const storage = runtimeStorage(setup.storage);
    const generator = mockGenerator();
    const first = renderV2Runtime(storage, generator);
    await continueV2();
    await userEvent.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    await userEvent.type(screen.getByLabelText('Beløb på 2210 Debet'), '123');
    await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Til forsiden' }));
    await continueV2();
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('123');

    first.view.unmount();
    renderV2Runtime(storage, generator);
    await continueV2();
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('123');
    expect(generator).toHaveBeenCalledTimes(0);
  });
});
