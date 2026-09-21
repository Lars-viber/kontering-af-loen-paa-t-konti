// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  V2_LEGACY_SESSION_STORAGE_KEY,
  V2_SESSION_STORAGE_KEY,
  decodeV2Session,
} from '../../src/level2/v2/session';
import {
  V2RuntimeStorage,
  continueV2,
  renderV2Runtime,
  startSpecificV2,
} from './v2-runtime-test-helpers';

afterEach(cleanup);

describe('J3C active V2.1 autosave integration', () => {
  it('autosaves raw row state through the V2.1 controller and v2 key', async () => {
    const storage = new V2RuntimeStorage();
    storage.data.set(V2_LEGACY_SESSION_STORAGE_KEY, 'legacy sentinel');
    renderV2Runtime(storage);
    await startSpecificV2(42);
    await userEvent.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    await userEvent.type(screen.getByLabelText('Beløb på 2210 Debet'), '145.812');

    const decoded = decodeV2Session(storage.data.get(V2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid V2.1 session');
    expect(decoded.value.studentState.documents[0].rows).toEqual([
      expect.objectContaining({ accountNumber: '2210', side: 'debit', rawAmount: '145.812', text: '' }),
    ]);
    expect(storage.data.get(V2_LEGACY_SESSION_STORAGE_KEY)).toBe('legacy sentinel');
  });

  it('keeps latest in-memory state on save failure and retry persists it without regeneration', async () => {
    const storage = new V2RuntimeStorage();
    renderV2Runtime(storage);
    await startSpecificV2(42);
    storage.failSetKeys.add(V2_SESSION_STORAGE_KEY);
    await userEvent.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    await userEvent.type(screen.getByLabelText('Beløb på 2210 Debet'), '900');
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('900');
    expect(screen.getByRole('alert').textContent).toContain('Kunne ikke gemme automatisk.');

    storage.failSetKeys.clear();
    await userEvent.click(screen.getByRole('button', { name: 'Prøv at gemme igen' }));
    expect(screen.queryByRole('alert')).toBeNull();
    const decoded = decodeV2Session(storage.data.get(V2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid retried V2.1 session');
    expect(decoded.value.studentState.documents[0].rows[0].rawAmount).toBe('900');

    cleanup();
    renderV2Runtime(storage);
    await continueV2();
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('900');
  });
});
