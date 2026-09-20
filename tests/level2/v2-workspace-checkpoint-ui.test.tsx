// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  editV2CheckpointAmount,
  type V2StudentState,
} from '../../src/level2/v2/state';
import {
  Level2V2Workspace,
  formatV2WorkspaceAmount,
} from '../../src/level2/v2/workspace';
import { completeCurrentV2Document } from './v2-state-helpers';
import {
  V2WorkspaceHarness,
  V2_WORKSPACE_CASE,
  completeV2WorkspaceSection,
  inertV2WorkspaceActions,
  v2CheckpointReviewState,
  v2CheckpointState,
  v2CompletedState,
  v2WorkspaceCurrent,
} from './v2-workspace-test-helpers';

afterEach(cleanup);

function renderStatic(state: V2StudentState) {
  render(<Level2V2Workspace
    variant={42}
    source={V2_WORKSPACE_CASE.source}
    studentState={state}
    saveStatus="saved"
    actions={inertV2WorkspaceActions()}
  />);
}

function checkpointSection(name: string): HTMLElement {
  const section = screen.getByRole('heading', { name }).closest('section');
  if (!section) throw new Error('Missing checkpoint section ' + name);
  return section;
}

describe('V2.1 checkpoint workspace', () => {
  it('shows editable A-E beside source tallies, six controls and 13 readonly accounts', async () => {
    renderStatic(v2CheckpointState());
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Beløb')).toHaveLength(19);
    const reference = screen.getByRole('complementary', { name: 'Reference pr. 30/6' });
    expect(within(reference).getByRole('heading', { name: 'A. Lønsystemets tælleværker pr. 30/6' })).toBeTruthy();
    expect(within(reference).getByRole('heading', { name: 'B. Eksterne kontroloplysninger pr. 30/6' })).toBeTruthy();
    expect(within(reference).getByRole('heading', { name: 'C. Alle 13 T-konti pr. 30/6' })).toBeTruthy();
    expect(reference.querySelectorAll('[data-reference-account]')).toHaveLength(13);
    expect(within(reference).queryByPlaceholderText('Beløb')).toBeNull();
    for (const label of [
      'A-skat vedr. juni',
      'AM-bidrag vedr. juni',
      'Pension vedr. juni',
      'ATP akkumuleret pr. 30/6',
      'Nettoferiepenge til FerieKonto vedr. juni',
      'Systemopgjort feriepengeforpligtelse',
    ]) expect(within(reference).getByText(label)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Skjul reference' }));
    expect(screen.queryByRole('complementary', { name: 'Reference pr. 30/6' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Vis reference' }));
    expect(screen.getByRole('complementary', { name: 'Reference pr. 30/6' })).toBeTruthy();
  });

  it('shows readonly A result with booked, tally, zero difference and matching status', () => {
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'A'));
    const section = checkpointSection('Timelønnede');
    expect(within(section).queryByRole('textbox')).toBeNull();
    for (const label of ['Bogført/beregnet', 'Tælleværk', 'Difference', 'Status']) {
      expect(within(section).getByText(label)).toBeTruthy();
    }
    expect(within(section).getByText('0 kr.')).toBeTruthy();
    expect(within(section).getByText('✓ Stemmer')).toBeTruthy();
  });

  it('shows four source-derived reconciliation rows for correct C', () => {
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'C'));
    const section = checkpointSection('Øvrige lønrelaterede omkostninger');
    expect(within(section).getAllByRole('row')).toHaveLength(5);
    expect(within(section).getAllByText('0 kr.')).toHaveLength(4);
    expect(within(section).getAllByText('✓ Stemmer')).toHaveLength(4);
    for (const label of [
      'Arbejdsgiverpension',
      'Arbejdsgiver-ATP',
      'Feriepenge – timelønnede',
      'Regulering af feriepengeforpligtelse',
    ]) expect(within(section).getByText(label)).toBeTruthy();
  });

  it('shows six source-derived rows for correct E', () => {
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'E'));
    const section = checkpointSection('Seks balanceposter');
    expect(within(section).getAllByRole('row')).toHaveLength(7);
    expect(within(section).getAllByText('0 kr.')).toHaveLength(6);
    expect(within(section).getAllByText('✓ Stemmer')).toHaveLength(6);
    expect(within(section).queryByRole('textbox')).toBeNull();
  });

  it('keeps correct A and E locked while incorrect B remains editable', () => {
    let state = v2CheckpointState();
    state = completeV2WorkspaceSection(state, 'A');
    state = completeV2WorkspaceSection(state, 'E');
    state = editV2CheckpointAmount(state, 'B', 'wageAccountYtd', '1');
    state = checkV2CheckpointSection(V2_WORKSPACE_CASE.answers, state, 'B');
    renderStatic(state);
    expect(within(checkpointSection('Timelønnede')).queryByRole('textbox')).toBeNull();
    expect(within(checkpointSection('Seks balanceposter')).queryByRole('textbox')).toBeNull();
    expect(within(checkpointSection('Månedslønnede')).getByRole('textbox', {
      name: 'Lønninger – månedslønnede, saldo ÅTD',
    })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Reference pr. 30/6' })).toBeTruthy();
  });

  it('stays in checkpointReview until explicit Afslut Niveau 2 click', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2CheckpointReviewState())} />);
    expect(screen.getByText('✓ Afstemningen pr. 30/6 stemmer')).toBeTruthy();
    expect(screen.getAllByText('5 af 5 afstemninger korrekte').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Niveau 2 gennemført' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Afslut Niveau 2' }));
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
  });

  it('shows completed June summary and 13 student-derived final balances only', () => {
    renderStatic(v2CompletedState());
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
    expect(screen.getByText('9 af 9 bilag gennemført · Afstemning ✓')).toBeTruthy();
    expect(document.querySelectorAll('.l2v2-completed-balances > div')).toHaveLength(13);
    expect(document.body.textContent).not.toMatch(/B1[0-3]/);
    expect(document.body.textContent).not.toContain('Slutkontrol');
    expect(document.body.textContent).not.toContain('juli');
  });

  it('preserves both rows of an approved split posting in readonly history', async () => {
    const firstDocument = V2_WORKSPACE_CASE.answers.documents[0];
    const split = firstDocument.expectedPostings.find(posting => posting.accountNumber === '5820');
    if (!split) throw new Error('Missing B1 bank posting');
    const firstAmount = Math.max(1, Math.floor(split.amount / 3));
    let state = v2WorkspaceCurrent().studentState;
    state = addV2StudentPostingRow(state, split.accountNumber, split.side, String(firstAmount), 'Første del');
    state = addV2StudentPostingRow(state, split.accountNumber, split.side, String(split.amount - firstAmount), 'Anden del');
    for (const posting of firstDocument.expectedPostings.filter(item => item !== split)) {
      state = addV2StudentPostingRow(state, posting.accountNumber, posting.side, String(posting.amount), posting.text);
    }
    state = checkV2CurrentDocument(V2_WORKSPACE_CASE.answers, state);
    state = advanceFromV2DocumentReview(state);
    for (let document = 2; document <= 9; document += 1) {
      state = completeCurrentV2Document(V2_WORKSPACE_CASE.answers, state);
      state = advanceFromV2DocumentReview(state);
    }
    renderStatic(state);
    const bank = document.querySelector<HTMLElement>('[data-reference-account="5820"]')!;
    await userEvent.click(within(bank).getByRole('button', { name: /tidligere/ }));
    const dialog = screen.getByRole('dialog', { name: /5820 Bankkonto/ });
    expect(within(dialog).getByText(formatV2WorkspaceAmount(firstAmount))).toBeTruthy();
    expect(within(dialog).getByText(formatV2WorkspaceAmount(split.amount - firstAmount))).toBeTruthy();
    expect(within(dialog).getByText('Første del')).toBeTruthy();
    expect(within(dialog).getByText('Anden del')).toBeTruthy();
  });
});
