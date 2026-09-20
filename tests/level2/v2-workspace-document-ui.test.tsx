// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  addV2StudentPostingRow,
  checkV2CurrentDocument,
  createInitialV2StudentState,
} from '../../src/level2/v2/state';
import {
  Level2V2Workspace,
  formatV2WorkspaceAmount,
} from '../../src/level2/v2/workspace';
import {
  V2WorkspaceHarness,
  V2_WORKSPACE_CASE,
  inertV2WorkspaceActions,
  v2DocumentEntryAt,
  v2DocumentReviewAt,
  v2WorkspaceCurrent,
} from './v2-workspace-test-helpers';

afterEach(cleanup);

function renderStatic(state = createInitialV2StudentState(), overrides = {}) {
  const actions = inertV2WorkspaceActions(overrides);
  render(<Level2V2Workspace
    variant={42}
    source={V2_WORKSPACE_CASE.source}
    studentState={state}
    saveStatus="saved"
    actions={actions}
  />);
  return actions;
}

function accountCard(accountNumber: string): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-account="' + accountNumber + '"]');
  if (!element) throw new Error('Missing account card ' + accountNumber);
  return element;
}

describe('V2.1 document workspace', () => {
  it('shows all 13 accounts in frozen order and 9-document progression', () => {
    renderStatic();
    const cards = [...document.querySelectorAll<HTMLElement>('[data-account]')];
    expect(cards).toHaveLength(13);
    expect(cards.map(card => card.dataset.account)).toEqual(
      V2_WORKSPACE_CASE.source.accounts.map(account => account.accountNumber),
    );
    expect(screen.getByText('0 af 9 bilag gennemført · 9 tilbage')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Niveau 2-progression' })).toBeTruthy();
    expect(screen.queryByText(/B1[0-3]/)).toBeNull();
    expect(screen.queryByText('Slutkontrol')).toBeNull();
  });

  it('keeps correct B4 visible, renders readonly postings and advances only on click', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2DocumentReviewAt(4))} />);
    expect(screen.getByRole('heading', { name: /Lønkørsel – timelønnede – juni/ })).toBeTruthy();
    expect(screen.getByText('✓ Bilaget er korrekt bogført')).toBeTruthy();
    expect(document.querySelectorAll('[data-account]')).toHaveLength(13);
    expect(screen.queryByRole('button', { name: /Tilføj postering/ })).toBeNull();
    expect(screen.getAllByLabelText('Låst korrekt postering').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: /Arbejdsgiverbidrag – timelønnede/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Gå videre til næste bilag' }));
    expect(screen.getByRole('heading', { name: /Arbejdsgiverbidrag – timelønnede – juni/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kontrollér bilag' })).toBeTruthy();
  });

  it('keeps correct B9 visible until explicit transition to reconciliation', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2DocumentReviewAt(9))} />);
    expect(screen.getByRole('heading', { level: 1, name: /Regulering af feriepengeforpligtelse/ })).toBeTruthy();
    expect(screen.getByText('✓ Bilaget er korrekt bogført')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Gå videre til afstemning' }));
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
  });

  it.each([
    [4, ['Bruttoløn ÅTD – timelønnede', 'Medarbejderpension ÅTD – timelønnede', 'Medarbejder-ATP ÅTD – timelønnede']],
    [5, ['Arbejdsgiverpension ÅTD – timelønnede', 'Arbejdsgiver-ATP ÅTD – timelønnede']],
    [6, ['Bruttoferiepenge ÅTD – timelønnede']],
    [7, ['Bruttoløn ÅTD – månedslønnede', 'Medarbejderpension ÅTD – månedslønnede', 'Medarbejder-ATP ÅTD – månedslønnede']],
    [8, ['Arbejdsgiverpension ÅTD – månedslønnede', 'Arbejdsgiver-ATP ÅTD – månedslønnede']],
  ] as const)('shows only the relevant source tallies on B%i', (number, labels) => {
    renderStatic(v2DocumentEntryAt(number));
    const panel = document.querySelector<HTMLElement>('.l2v2-document-panel')!;
    expect(within(panel).getByRole('heading', { name: 'Tælleværker ÅTD' })).toBeTruthy();
    expect(within(panel).getByText('ÅTD t.o.m. juni · pr. 30/6')).toBeTruthy();
    for (const label of labels) expect(within(panel).getByText(label)).toBeTruthy();
    expect(panel.querySelectorAll('.l2v2-document-tallies dd')).toHaveLength(labels.length);
  });

  it('shows only opening context and system balance as B9 source data', () => {
    renderStatic(v2DocumentEntryAt(9));
    const panel = document.querySelector<HTMLElement>('.l2v2-document-panel')!;
    expect(within(panel).getByText('Bogført saldo før regulering')).toBeTruthy();
    expect(within(panel).getByText('Systemopgjort saldo pr. 30/6')).toBeTruthy();
    expect(within(panel).queryByRole('heading', { name: 'Tælleværker ÅTD' })).toBeNull();
    const source = V2_WORKSPACE_CASE.source.documentSources.find(item => item.id === 'B9')!;
    const directAdjustment = source.fields[1].amount - source.fields[0].amount;
    expect(panel.textContent).not.toContain(formatV2WorkspaceAmount(directAdjustment));
  });

  it('locks correct groups, leaves incorrect groups editable and does not reveal a continue action', () => {
    const sourceDocument = V2_WORKSPACE_CASE.answers.documents[0];
    const correct = sourceDocument.expectedPostings[0];
    const wrong = sourceDocument.expectedPostings[1];
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(state, correct.accountNumber, correct.side, String(correct.amount), 'godkendt');
    state = addV2StudentPostingRow(state, wrong.accountNumber, wrong.side, '1', 'forkert');
    state = checkV2CurrentDocument(V2_WORKSPACE_CASE.answers, state);
    renderStatic(state);
    const correctSide = accountCard(correct.accountNumber)
      .querySelector<HTMLElement>('[data-side="' + correct.side + '"]')!;
    const wrongSide = accountCard(wrong.accountNumber)
      .querySelector<HTMLElement>('[data-side="' + wrong.side + '"]')!;
    expect(within(correctSide).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(correctSide).queryByRole('textbox')).toBeNull();
    expect(within(wrongSide).getByRole('textbox')).toBeTruthy();
    expect(within(wrongSide).getByText('Ret postering')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Gå videre/ })).toBeNull();
  });

  it('keeps failed in-memory input visible and exposes keyboard-accessible retry', async () => {
    const retrySave = vi.fn();
    let state = createInitialV2StudentState();
    state = addV2StudentPostingRow(state, '2210', 'debit', '900', 'ikke gemt');
    render(<Level2V2Workspace
      variant={42}
      source={V2_WORKSPACE_CASE.source}
      studentState={state}
      saveStatus="saveFailed"
      actions={inertV2WorkspaceActions({ retrySave })}
    />);
    expect((screen.getByLabelText('Beløb på 2210 Debet') as HTMLInputElement).value).toBe('900');
    const retry = screen.getByRole('button', { name: 'Prøv at gemme igen' });
    retry.focus();
    await userEvent.keyboard('{Enter}');
    expect(retrySave).toHaveBeenCalledOnce();
  });
});
