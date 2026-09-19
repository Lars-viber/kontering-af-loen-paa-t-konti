// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEVEL2_ACCOUNTS, generateLevel2Case } from '../../src/domain/level2';
import { createLevel2PersistedSession } from '../../src/level2/session';
import {
  addStudentPostingRow,
  checkActiveDocument,
  createInitialStudentState,
  type Level2StudentState,
} from '../../src/level2/state';
import { Level2Workspace } from '../../src/level2/workspace';
import { advanceToCheckpoint, completeActiveDocument } from './state-helpers';

afterEach(cleanup);
const snapshot = generateLevel2Case(42);
const savedAt = '2026-09-18T15:00:00.000Z';

function Harness({ initial = createInitialStudentState(snapshot), saveStatus = 'idle' as const }: {
  readonly initial?: Level2StudentState;
  readonly saveStatus?: 'idle' | 'saved' | 'error';
}) {
  const [state, setState] = useState(initial);
  const session = createLevel2PersistedSession(snapshot, state, savedAt);
  return <Level2Workspace
    session={session}
    saveStatus={saveStatus}
    onStudentStateChange={setState}
    onRetrySave={() => undefined}
    onGoHome={() => undefined}
  />;
}

function card(accountNumber: string): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-account="' + accountNumber + '"]');
  if (!element) throw new Error('Missing card ' + accountNumber);
  return element;
}

describe('J3B Niveau 2 workspace', () => {
  it('viser præcis alle 13 konti i frossen rækkefølge med startsaldolabels', () => {
    render(<Harness />);
    const cards = [...document.querySelectorAll<HTMLElement>('[data-account]')];
    expect(cards).toHaveLength(13);
    expect(cards.map(element => element.dataset.account)).toEqual(LEVEL2_ACCOUNTS.map(account => account.accountNumber));
    expect(within(card('2210')).getByText(/Saldo ÅTD t.o.m. 31\/5/)).toBeTruthy();
    expect(within(card('5820')).getByText(/Saldo pr. 1\/6/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Niveau 2' })).toBeTruthy();
  });

  it('tilføjer, bevarer råt dansk input og fjerner en unlocked række', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tilføj postering på 2210 Debet' }));
    const input = screen.getByLabelText('Beløb på 2210 Debet');
    await user.type(input, '145.812');
    expect((input as HTMLInputElement).value).toBe('145.812');
    await user.click(screen.getByRole('button', { name: 'Fjern postering på 2210 Debet' }));
    expect(screen.queryByLabelText('Beløb på 2210 Debet')).toBeNull();
  });

  it('låser en korrekt splitgruppe og lader en forkert gruppe være redigerbar', async () => {
    const expected = snapshot.derived.documents[0].expectedPostings;
    const correct = expected[0];
    const wrong = expected[1];
    const first = Math.max(1, Math.floor(correct.amount / 3));
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Tilføj postering på ' + correct.accountNumber + ' ' + (correct.side === 'debit' ? 'Debet' : 'Kredit') }));
    await user.type(screen.getByLabelText('Beløb på ' + correct.accountNumber + ' ' + (correct.side === 'debit' ? 'Debet' : 'Kredit')), String(first));
    await user.click(screen.getByRole('button', { name: 'Tilføj postering på ' + correct.accountNumber + ' ' + (correct.side === 'debit' ? 'Debet' : 'Kredit') }));
    const splitInputs = screen.getAllByLabelText('Beløb på ' + correct.accountNumber + ' ' + (correct.side === 'debit' ? 'Debet' : 'Kredit'));
    await user.type(splitInputs[1], String(correct.amount - first));

    await user.click(screen.getByRole('button', { name: 'Tilføj postering på ' + wrong.accountNumber + ' ' + (wrong.side === 'debit' ? 'Debet' : 'Kredit') }));
    await user.type(screen.getByLabelText('Beløb på ' + wrong.accountNumber + ' ' + (wrong.side === 'debit' ? 'Debet' : 'Kredit')), '1');
    await user.click(screen.getByRole('button', { name: 'Kontrollér bilag' }));

    const correctSide = card(correct.accountNumber).querySelector<HTMLElement>('[data-side="' + correct.side + '"]')!;
    expect(within(correctSide).getAllByLabelText('Låst korrekt postering')).toHaveLength(2);
    expect(within(correctSide).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(correctSide).queryByRole('textbox')).toBeNull();

    const wrongSide = card(wrong.accountNumber).querySelector<HTMLElement>('[data-side="' + wrong.side + '"]')!;
    expect(within(wrongSide).getByText('Ret postering')).toBeTruthy();
    expect(within(wrongSide).getByRole('textbox')).toBeTruthy();
    expect(screen.getByText(/Bilaget er ikke færdigt/)).toBeTruthy();
    expect(screen.queryByText(/Mangler postering/)).toBeNull();
  });

  it('afviser elevens egen forkerte konto uden at udpege untouched facitkonti', async () => {
    const expectedAccounts = new Set(snapshot.derived.documents[0].expectedPostings.map(row => row.accountNumber));
    const wrong = LEVEL2_ACCOUNTS.find(account => !expectedAccounts.has(account.accountNumber));
    if (!wrong) throw new Error('Expected a non-answer account');
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tilføj postering på ' + wrong.accountNumber + ' Debet' }));
    await user.type(screen.getByLabelText('Beløb på ' + wrong.accountNumber + ' Debet'), '100');
    await user.click(screen.getByRole('button', { name: 'Kontrollér bilag' }));
    expect(within(card(wrong.accountNumber)).getByText('Ret postering')).toBeTruthy();
    expect(screen.queryByText(/Mangler postering/)).toBeNull();
  });

  it('lazy-mounter video og viser hele kontoplanen i tilgængelige dialogs', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    const videoOpener = screen.getByRole('button', { name: 'Videogennemgang' });
    await user.click(videoOpener);
    expect(screen.getByRole('dialog', { name: 'Videogennemgang' })).toBeTruthy();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    expect(screen.getByText(/dækker ikke hele Niveau 2/)).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    expect(document.activeElement).toBe(videoOpener);

    await user.click(screen.getByRole('button', { name: 'Kontoplan' }));
    const dialog = screen.getByRole('dialog', { name: 'Kontoplan – Niveau 2' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(13);
  });

  it('komprimerer historik til tre rækker og viser fuld elevhistorik i overlay', async () => {
    let state = createInitialStudentState(snapshot);
    for (let index = 0; index < 4; index += 1) state = completeActiveDocument(snapshot, state);
    render(<Harness initial={state} />);
    const bank = card('5820');
    expect(bank.querySelectorAll('.l2-history-row')).toHaveLength(3);
    const more = within(bank).getByRole('button', { name: /tidligere posteringer/ });
    await userEvent.click(more);
    const dialog = screen.getByRole('dialog', { name: /5820 Bankkonto/ });
    expect(within(dialog).getAllByRole('row')).toHaveLength(5);
  });

  it('viser saldo som utilgængelig ved ugyldigt aktuelt beløb', () => {
    let state = createInitialStudentState(snapshot);
    state = addStudentPostingRow(state, '5820', 'credit', 'ugyldig');
    render(<Harness initial={state} />);
    expect(within(card('5820')).getByText('Kan ikke beregnes')).toBeTruthy();
    expect(screen.getByText('Kontrollér ugyldigt beløb')).toBeTruthy();
  });

  it('renderer checkpoint-placeholder uden at ændre state', () => {
    const state = advanceToCheckpoint(snapshot);
    render(<Harness initial={state} />);
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect(screen.getByText(/tilføjes i J3C/)).toBeTruthy();
    expect(state.phase).toEqual({ kind: 'checkpoint' });
  });

  it('netter ikke en forkert debet og kredit til en godkendt gruppe', () => {
    const expected = snapshot.derived.documents[0].expectedPostings[0];
    let state = createInitialStudentState(snapshot);
    state = addStudentPostingRow(state, expected.accountNumber, expected.side, String(expected.amount + 500));
    state = addStudentPostingRow(state, expected.accountNumber, expected.side === 'debit' ? 'credit' : 'debit', '500');
    state = checkActiveDocument(snapshot, state);
    render(<Harness initial={state} />);
    expect(within(card(expected.accountNumber)).getAllByText('Ret postering')).toHaveLength(2);
  });
});
