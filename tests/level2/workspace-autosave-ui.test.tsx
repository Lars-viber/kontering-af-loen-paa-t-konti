// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import { startNewLevel2Session } from '../../src/level2/controller';
import {
  LEVEL2_SESSION_STORAGE_KEY,
  decodeLevel2Session,
  type Level2Storage,
} from '../../src/level2/session';

afterEach(cleanup);

class WorkspaceStorage implements Level2Storage {
  readonly data = new Map<string, string>();
  failSet = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('quota');
    this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

const clock = () => '2026-09-18T15:00:00.000Z';

function renderPreloaded(storage: WorkspaceStorage) {
  startNewLevel2Session(storage, 42, clock);
  render(<App storage={storage} level2Storage={storage} clock={clock} level2Clock={clock} />);
}

describe('J3B workspace controller integration', () => {
  it('autosaver rå row-state gennem J3A-controlleren', async () => {
    const storage = new WorkspaceStorage();
    renderPreloaded(storage);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    await user.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    await user.type(screen.getByLabelText('Beløb på 2210 Debet'), '145.812');

    const decoded = decodeLevel2Session(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid saved session');
    expect(decoded.value.studentState.documents[0].rows).toEqual([
      expect.objectContaining({ accountNumber: '2210', side: 'debit', rawAmount: '145.812', text: '' }),
    ]);
  });

  it('beholder ny in-memory state ved savefejl og retry gemmer samme state', async () => {
    const storage = new WorkspaceStorage();
    renderPreloaded(storage);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
    storage.failSet = true;
    await user.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    await user.type(screen.getByLabelText('Beløb på 2210 Debet'), '900');
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('900');
    expect(screen.getByRole('alert').textContent).toContain('seneste ændring kunne ikke gemmes');

    storage.failSet = false;
    await user.click(screen.getByRole('button', { name: 'Prøv at gemme igen' }));
    const decoded = decodeLevel2Session(storage.data.get(LEVEL2_SESSION_STORAGE_KEY)!);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Expected valid retried session');
    expect(decoded.value.studentState.documents[0].rows[0].rawAmount).toBe('900');
  });
});
