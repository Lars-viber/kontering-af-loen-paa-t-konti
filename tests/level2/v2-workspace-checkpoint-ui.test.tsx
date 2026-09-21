// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  addV2StudentPostingRow,
  advanceFromV2DocumentReview,
  checkV2CheckpointSection,
  checkV2CurrentDocument,
  completeV2Level,
  editV2CheckpointAmount,
  type V2StudentState,
} from '../../src/level2/v2/state';
import {
  Level2V2Workspace,
  formatV2WorkspaceAmount,
} from '../../src/level2/v2/workspace';
import { completeCurrentV2Document, completeV2Checkpoint } from './v2-state-helpers';
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

function fillCState(swapSalariedAtp = false, grade = false): V2StudentState {
  let state = v2CheckpointState();
  const expected = V2_WORKSPACE_CASE.answers.reconciliation.C;
  const salariedEmployeeAtp = swapSalariedAtp
    ? expected.atp.salariedEmployerAtpYtd
    : expected.atp.salariedEmployeeAtpYtd;
  const salariedEmployerAtp = swapSalariedAtp
    ? expected.atp.salariedEmployeeAtpYtd
    : expected.atp.salariedEmployerAtpYtd;
  for (const [field, amount] of [
    ['pensionBookBalance', expected.pension.bookedAmount],
    ['hourlyEmployeePensionYtd', expected.pension.hourlyEmployeePensionYtd],
    ['hourlyEmployerPensionYtd', expected.pension.hourlyEmployerPensionYtd],
    ['salariedEmployeePensionYtd', expected.pension.salariedEmployeePensionYtd],
    ['salariedEmployerPensionYtd', expected.pension.salariedEmployerPensionYtd],
    ['atpBookBalance', expected.atp.bookedAmount],
    ['hourlyEmployeeAtpYtd', expected.atp.hourlyEmployeeAtpYtd],
    ['hourlyEmployerAtpYtd', expected.atp.hourlyEmployerAtpYtd],
    ['salariedEmployeeAtpYtd', salariedEmployeeAtp],
    ['salariedEmployerAtpYtd', salariedEmployerAtp],
    ['holidayPayBookBalance', expected.holidayPay.bookedAmount],
    ['holidayPayGrossYtd', expected.holidayPay.grossHolidayPayYtd],
  ] as const) state = editV2CheckpointAmount(state, 'C', field, String(amount));
  return grade ? checkV2CheckpointSection(V2_WORKSPACE_CASE.answers, state, 'C') : state;
}
describe('V2.1 checkpoint workspace', () => {
  it('shows editable A-E beside source tallies, six controls and 13 readonly accounts', async () => {
    renderStatic(v2CheckpointState());
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Beløb')).toHaveLength(27);
    const reference = screen.getByRole('complementary', { name: 'Reference pr. 30/6' });
    expect(within(reference).getByRole('heading', { name: 'A. Lønsystemets tælleværker pr. 30/6' })).toBeTruthy();
    expect(within(reference).getByRole('heading', { name: 'B. Eksterne kontroloplysninger pr. 30/6' })).toBeTruthy();
    expect(within(reference).getByRole('heading', { name: 'C. Alle 13 T-konti pr. 30/6' })).toBeTruthy();
    expect(reference.querySelectorAll('[data-reference-account]')).toHaveLength(13);
    expect(within(reference).queryByPlaceholderText('Beløb')).toBeNull();
    expect(within(reference).queryByText(/Regulering af feriepengeforpligtelse ÅTD/)).toBeNull();
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

  it('shows readonly A in its visual flow with live zero difference and checked status', () => {
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'A'));
    const section = checkpointSection('Timelønnede');
    expect(within(section).queryByRole('textbox')).toBeNull();
    for (const heading of [
      'Fra bogføringen / T-konto',
      'Beregnet bruttoløn ÅTD',
      'Difference',
    ]) expect(within(section).getByRole('heading', { name: heading })).toBeTruthy();
    expect(within(section).getByRole('heading', { name: 'Beregnet bruttoløn ÅTD' })).toBeTruthy();
    expect(within(section).getByText('Beregnet bruttoløn minus bruttoløn ÅTD')).toBeTruthy();
    expect(within(section).getByText('0 kr.')).toBeTruthy();
    expect(within(section).getByText('✓ Stemmer')).toBeTruthy();
  });
  it('renders A and B as distinct semantic cards with ordered accounting, tally and calculation groups', () => {
    renderStatic(v2CheckpointState());
    const pair = screen.getByRole('group', { name: 'Afstemning A og B' });
    const cards = pair.querySelectorAll<HTMLElement>('[data-checkpoint-card]');
    expect(cards).toHaveLength(2);
    expect([...cards].map(card => card.dataset.checkpointCard)).toEqual(['A', 'B']);
    for (const [title, account, tallyLabel] of [
      ['Timelønnede', '2210', 'Bruttoløn ÅTD – timelønnede – tælleværk'],
      ['Månedslønnede', '2211', 'Bruttoløn ÅTD – månedslønnede – tælleværk'],
    ] as const) {
      const section = checkpointSection(title);
      expect(within(section).getByRole('textbox', { name: new RegExp('^' + account + ' Lønninger') })).toBeTruthy();
      expect(within(section).getByRole('textbox', { name: 'Medarbejderpension ÅTD' })).toBeTruthy();
      expect(within(section).getByRole('textbox', { name: 'Medarbejder-ATP ÅTD' })).toBeTruthy();
      expect(within(section).getByRole('textbox', { name: tallyLabel })).toBeTruthy();
      expect(within(section).queryByText('Din beregnede bruttoløn ÅTD')).toBeNull();
      expect(within(section).getByRole('heading', { name: 'Beregnet bruttoløn ÅTD' })).toBeTruthy();
      expect(within(section).getAllByRole('heading', { name: 'Fra lønsystemets tælleværker' })).toHaveLength(2);
      expect(within(section).getByRole('heading', { name: 'Difference' })).toBeTruthy();
    }
  });
  it('groups C semantically and keeps correct results inside Pension, ATP and Feriepenge', () => {
    renderStatic(v2CheckpointState());
    const inputSection = checkpointSection('Afstem pension, ATP og feriepenge');
    const pension = inputSection.querySelector<HTMLElement>('[data-reconciliation-group="pension"]')!;
    const atp = inputSection.querySelector<HTMLElement>('[data-reconciliation-group="atp"]')!;
    const holiday = inputSection.querySelector<HTMLElement>('[data-reconciliation-group="holiday"]')!;
    expect(within(pension).getByRole('heading', { name: 'Pension' })).toBeTruthy();
    expect(within(atp).getByRole('heading', { name: 'ATP' })).toBeTruthy();
    expect(within(holiday).getByRole('heading', { name: 'Feriepenge – timelønnede' })).toBeTruthy();
    for (const label of [
      '2215 Pensioner – saldo ÅTD',
      'Timelønnede – medarbejderpension ÅTD',
      'Timelønnede – arbejdsgiverpension ÅTD',
      'Månedslønnede – medarbejderpension ÅTD',
      'Månedslønnede – arbejdsgiverpension ÅTD',
    ]) expect(within(pension).getByRole('textbox', { name: label })).toBeTruthy();
    expect(within(pension).queryByText(/ATP/)).toBeNull();
    for (const label of [
      '2223 ATP – saldo ÅTD',
      'Timelønnede – medarbejder-ATP ÅTD',
      'Timelønnede – arbejdsgiver-ATP ÅTD',
      'Månedslønnede – medarbejder-ATP ÅTD',
      'Månedslønnede – arbejdsgiver-ATP ÅTD',
    ]) expect(within(atp).getByRole('textbox', { name: label })).toBeTruthy();
    expect(within(atp).queryByText(/pension/i)).toBeNull();
    expect(within(holiday).getByRole('textbox', { name: '2230 Feriepenge – timelønnede, saldo ÅTD' })).toBeTruthy();
    expect(within(holiday).getByRole('textbox', { name: 'Bruttoferiepenge ÅTD' })).toBeTruthy();
    expect(within(inputSection).getByRole('button', { name: 'Kontrollér sektion C' })).toBeTruthy();

    cleanup();
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'C'));
    const resultSection = checkpointSection('Afstem pension, ATP og feriepenge');
    expect(resultSection.querySelectorAll('[data-reconciliation-group]')).toHaveLength(3);
    expect(within(resultSection).getAllByText('0 kr.')).toHaveLength(3);
    expect(within(resultSection).getAllByText('✓ Stemmer')).toHaveLength(3);
    expect(within(resultSection).getAllByText('Sum af tælleværker')).toHaveLength(2);
    expect(within(resultSection).getAllByText('Bogført saldo')).toHaveLength(3);
    expect(within(resultSection).getByText('Tælleværk')).toBeTruthy();
    const literalNewlineArtifact = String.fromCharCode(96) + 'n';
    expect(resultSection.textContent).not.toContain(literalNewlineArtifact);
    expect(resultSection.textContent).not.toContain(literalNewlineArtifact + literalNewlineArtifact);
  });
  it('updates live A and B sums and differences without writing a derived value', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2CheckpointState())} />);
    for (const [title, sectionId] of [['Timelønnede', 'A'], ['Månedslønnede', 'B']] as const) {
      const expected = V2_WORKSPACE_CASE.answers.reconciliation[sectionId];
      const section = checkpointSection(title);
      const difference = within(section).getByText('Beregnet bruttoløn minus bruttoløn ÅTD')
        .closest<HTMLElement>('.l2v2-live-metric')!;
      expect(within(difference).getByText('—')).toBeTruthy();
      await userEvent.type(within(section).getByRole('textbox', { name: /Lønninger/ }), String(expected.wageAccountYtd));
      await userEvent.type(within(section).getByRole('textbox', { name: 'Medarbejderpension ÅTD' }), String(expected.employeePensionYtd));
      await userEvent.type(within(section).getByRole('textbox', { name: 'Medarbejder-ATP ÅTD' }), String(expected.employeeAtpYtd));
      const live = section.querySelector<HTMLElement>('.l2v2-live-metric')!;
      expect(within(live).getByText(formatV2WorkspaceAmount(expected.calculatedGrossPayYtd))).toBeTruthy();
      const tallyLabel = sectionId === 'A'
        ? 'Bruttoløn ÅTD – timelønnede – tælleværk'
        : 'Bruttoløn ÅTD – månedslønnede – tælleværk';
      const tally = within(section).getByRole('textbox', { name: tallyLabel }) as HTMLInputElement;
      expect(tally.value).toBe('');
      await userEvent.type(tally, String(expected.calculatedGrossPayYtd));
      expect(within(difference).getByText('0 kr.')).toBeTruthy();
      expect(within(section).queryByText('✓ Stemmer')).toBeNull();
    }
  }, 15_000);

  it('shows live zero differences for unchecked pension, ATP and holiday groups', () => {
    const state = fillCState();
    renderStatic(state);
    const section = checkpointSection('Afstem pension, ATP og feriepenge');
    for (const groupId of ['pension', 'atp', 'holiday']) {
      const group = section.querySelector<HTMLElement>('[data-reconciliation-group="' + groupId + '"]')!;
      const difference = within(group).getByText('Difference').closest<HTMLElement>('.l2v2-live-metric')!;
      expect(within(difference).getByText('0 kr.')).toBeTruthy();
      expect(within(group).queryByText('✓ Stemmer')).toBeNull();
    }
    expect(Object.keys(state.checkpoint.C.values).sort())
      .toEqual(Object.keys(v2CheckpointState().checkpoint.C.values).sort());
  });

  it('keeps C grading strict when salaried employee and employer ATP are swapped', () => {
    const state = fillCState(true, true);
    expect(state.checkpoint.C.status).toBe('incorrect');
    renderStatic(state);
    const section = checkpointSection('Afstem pension, ATP og feriepenge');
    const atp = section.querySelector<HTMLElement>('[data-reconciliation-group="atp"]')!;
    const difference = within(atp).getByText('Difference').closest<HTMLElement>('.l2v2-live-metric')!;
    expect(within(difference).getByText('0 kr.')).toBeTruthy();
    expect(within(atp).getByRole('textbox', { name: 'Månedslønnede – medarbejder-ATP ÅTD' })).toBeTruthy();
    expect(within(atp).getByRole('textbox', { name: 'Månedslønnede – arbejdsgiver-ATP ÅTD' })).toBeTruthy();
    expect(within(section).getByText('Kontrollér dine beregninger og prøv igen.')).toBeTruthy();
    expect(within(section).queryByText('✓ Stemmer')).toBeNull();
  });
  it('presents D as an internal control without an external tally result', () => {
    renderStatic(completeV2WorkspaceSection(v2CheckpointState(), 'D'));
    const section = checkpointSection('Intern kontrol af samlede lønrelaterede omkostninger');
    expect(within(section).getByText(/2210, 2211, 2215, 2223, 2230 og 2235/)).toBeTruthy();
    expect(within(section).getByText('Sum af driftskonti')).toBeTruthy();
    expect(within(section).getByText('✓ Intern kontrol stemmer')).toBeTruthy();
    expect(within(section).queryByText('Tælleværk')).toBeNull();
    expect(within(section).queryByText('Ekstern kontrol')).toBeNull();
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
      name: '2211 Lønninger – månedslønnede, saldo ÅTD',
    })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Reference pr. 30/6' })).toBeTruthy();
  });

  it('stays in checkpointReview until explicit Afslut Niveau 2 click', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2CheckpointReviewState())} />);
    expect(screen.getByText('✓ Afstemningen pr. 30/6 stemmer')).toBeTruthy();
    expect(screen.getAllByText('5 af 5 afstemninger korrekte').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Niveau 2 gennemført' })).toBeNull();
    const completeButtons = screen.getAllByRole('button', { name: 'Afslut Niveau 2' });
    expect(completeButtons).toHaveLength(2);
    await userEvent.click(completeButtons[0]);
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
    state = completeV2Level(completeV2Checkpoint(V2_WORKSPACE_CASE.answers, state));
    renderStatic(state);
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    expect(screen.getByText(formatV2WorkspaceAmount(firstAmount))).toBeTruthy();
    expect(screen.getByText(formatV2WorkspaceAmount(split.amount - firstAmount))).toBeTruthy();
    expect(screen.getByText('Første del')).toBeTruthy();
    expect(screen.getByText('Anden del')).toBeTruthy();  });
  it('opens the actual completed answer read-only across B1, B4, B9 and reconciliation', async () => {
    const state = v2CompletedState();
    const before = JSON.stringify(state);
    renderStatic(state);
    await userEvent.click(screen.getByRole('button', { name: 'Se afsluttet opgave' }));
    expect(screen.getByRole('heading', { name: 'Gennemgå din afsluttede opgave' })).toBeTruthy();
    expect(screen.getByText('Elevens godkendte besvarelse vises read-only.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Kontrollér/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Gå videre/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Afslut Niveau 2/ })).toBeNull();

    for (const documentId of ['B4', 'B9'] as const) {
      await userEvent.click(screen.getByRole('button', { name: documentId }));
      expect(screen.getByText(new RegExp('^' + documentId + ' · Juni 2026' + '$'))).toBeTruthy();
      expect(screen.getByText('Elevens godkendte besvarelse vises read-only.')).toBeTruthy();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Afstemning' }));
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Kontrollér sektion/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Afslut Niveau 2' })).toBeNull();

    await userEvent.click(screen.getAllByRole('button', { name: 'Tilbage til afslutning' })[0]);
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('shows every approved B1-B9 posting directly in the checkpoint reference', () => {
    renderStatic(v2CheckpointState());
    const reference = screen.getByRole('complementary', { name: 'Reference pr. 30/6' });
    expect(within(reference).queryByRole('button', { name: /tidligere/i })).toBeNull();
    for (const expectedDocument of V2_WORKSPACE_CASE.answers.documents) {
      for (const posting of expectedDocument.expectedPostings) {
        const account = reference.querySelector<HTMLElement>(
          '[data-reference-account="' + posting.accountNumber + '"] [data-side="' + posting.side + '"]',
        );
        if (!account) throw new Error('Missing reference account side for ' + posting.accountNumber);
        const expectedText = posting.documentId + ' · ' + (posting.text || 'Postering');
        const row = [...account.querySelectorAll('p')].find(item => item.textContent?.includes(expectedText));
        expect(row, expectedText).toBeTruthy();
        expect(row?.textContent).toContain(formatV2WorkspaceAmount(posting.amount));
      }
    }
  });

  it('opens an approved document from checkpoint and returns to unchanged reconciliation input', async () => {
    const state = editV2CheckpointAmount(v2CheckpointState(), 'A', 'wageAccountYtd', '123');
    const before = JSON.stringify(state);
    renderStatic(state);

    await userEvent.click(screen.getByRole('button', { name: /^B4/ }));
    expect(screen.getByRole('heading', { name: 'Du ser et tidligere godkendt bilag: B4' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getAllByRole('button', { name: 'Tilbage til afstemning' })[0]);

    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    expect((screen.getByRole('textbox', {
      name: '2210 Lønninger – timelønnede, saldo ÅTD',
    }) as HTMLInputElement).value).toBe('123');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('exposes both top and bottom completion actions in checkpointReview', async () => {
    render(<V2WorkspaceHarness initial={v2WorkspaceCurrent(v2CheckpointReviewState())} />);
    const buttons = screen.getAllByRole('button', { name: 'Afslut Niveau 2' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]);
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
  });});
