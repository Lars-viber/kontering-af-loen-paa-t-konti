// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEVEL2_ACCOUNTS, generateLevel2Case } from '../../src/domain/level2';
import { createLevel2PersistedSession } from '../../src/level2/session';
import {
  CHECKPOINT_BALANCE_ACCOUNTS,
  addStudentPostingRow,
  checkActiveDocument,
  checkCheckpointSection,
  createInitialStudentState,
  editCheckpointAmount,
  editCheckpointBalance,
  type CheckpointSectionId,
  type Level2StudentState,
} from '../../src/level2/state';
import { Level2Workspace, formatLevel2Amount, formatLevel2Balance, selectCurrentAccountBalance } from '../../src/level2/workspace';
import { advanceToCheckpoint, completeActiveDocument } from './state-helpers';

afterEach(cleanup);
const snapshot = generateLevel2Case(42);
const savedAt = '2026-09-19T08:00:00.000Z';

function Harness({ initial = advanceToCheckpoint(snapshot) }: { readonly initial?: Level2StudentState }) {
  const [state, setState] = useState(initial);
  const session = createLevel2PersistedSession(snapshot, state, savedAt);
  return <Level2Workspace
    session={session}
    saveStatus="idle"
    onStudentStateChange={setState}
    onRetrySave={() => undefined}
    onGoHome={() => undefined}
  />;
}

function section(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const element = heading.closest('section');
  if (!element) throw new Error('Missing section ' + name);
  return element;
}

function completeAmountSection(state: Level2StudentState, id: Exclude<CheckpointSectionId, 'E'>): Level2StudentState {
  const expected = id === 'A' ? snapshot.derived.checkpoint.hourlyGrossPayroll
    : id === 'B' ? snapshot.derived.checkpoint.salariedGrossPayroll
      : id === 'C' ? snapshot.derived.checkpoint.otherPayrollCosts
        : { operatingTotal: snapshot.derived.checkpoint.operatingTotal };
  let next = state;
  for (const [field, amount] of Object.entries(expected)) {
    next = editCheckpointAmount(next, id, field as never, String(amount));
  }
  return checkCheckpointSection(snapshot, next, id);
}

describe('J3C checkpoint UI', () => {
  it('renderer A–E, labels, blanke inputs og progression uden facit i DOM', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Afstemning pr. 30/6' })).toBeTruthy();
    for (const title of [
      'Bruttoløn ÅTD – timelønnede',
      'Bruttoløn ÅTD – månedslønnede',
      'Øvrige lønomkostninger ÅTD',
      'Samlede lønrelaterede omkostninger ÅTD',
      'Skyldige poster pr. 30/6',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText('0 af 5 korrekte')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Beløb')).toHaveLength(19);
    const forbidden = [
      ...Object.values(snapshot.derived.checkpoint.hourlyGrossPayroll),
      ...Object.values(snapshot.derived.checkpoint.salariedGrossPayroll),
      ...Object.values(snapshot.derived.checkpoint.otherPayrollCosts),
      snapshot.derived.checkpoint.operatingTotal,
    ].filter(value => value > 1000);
    const checkpointInputs = screen.getAllByPlaceholderText('Beløb');
    for (const input of checkpointInputs) {
      const attributes = [...input.attributes].map(attribute => attribute.value).join(' ');
      for (const value of forbidden) expect(attributes).not.toContain(String(value));
    }
  });

  it('bevarer rå input, viser neutral fejl og edit nulstiller incorrect til unchecked', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const a = section('Bruttoløn ÅTD – timelønnede');
    const wage = within(a).getByLabelText('Lønninger – timelønnede, saldo ÅTD');
    await user.type(wage, '145.812');
    expect((wage as HTMLInputElement).value).toBe('145.812');
    await user.click(within(a).getByRole('button', { name: 'Kontrollér sektion A' }));
    expect(within(a).getByText('Kontrollér dine beregninger og prøv igen.')).toBeTruthy();
    await user.type(wage, '0');
    expect(within(a).queryByText('Kontrollér dine beregninger og prøv igen.')).toBeNull();
  });

  it('låser korrekt A og erstatter inputs med readonly elevbeløb', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const a = section('Bruttoløn ÅTD – timelønnede');
    const expected = snapshot.derived.checkpoint.hourlyGrossPayroll;
    const labels = [
      ['Lønninger – timelønnede, saldo ÅTD', expected.wageAccount],
      ['Medarbejderpension ÅTD', expected.employeePension],
      ['Medarbejder-ATP ÅTD', expected.employeeAtp],
      ['Bruttoløn ÅTD', expected.grossPayroll],
    ] as const;
    for (const [label, value] of labels) await user.type(within(a).getByLabelText(label), String(value));
    await user.click(within(a).getByRole('button', { name: 'Kontrollér sektion A' }));
    expect(within(a).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(a).queryByRole('textbox')).toBeNull();
    expect(within(a).getByText(formatLevel2Amount(expected.grossPayroll))).toBeTruthy();
  });

  it('kræver korrekt D/K i E og nulstiller feedback ved sideændring', async () => {
    let state = advanceToCheckpoint(snapshot);
    for (const accountNumber of CHECKPOINT_BALANCE_ACCOUNTS) {
      const expected = snapshot.derived.checkpointBalances.find(item => item.accountNumber === accountNumber)!;
      const side = accountNumber === CHECKPOINT_BALANCE_ACCOUNTS[0]
        ? (expected.side === 'credit' ? 'debit' : 'credit')
        : expected.side;
      state = editCheckpointBalance(state, accountNumber, { rawAmount: String(expected.amount), side });
    }
    render(<Harness initial={state} />);
    const user = userEvent.setup();
    const e = section('Skyldige poster pr. 30/6');
    await user.click(within(e).getByRole('button', { name: 'Kontrollér sektion E' }));
    expect(within(e).getByText('Kontrollér beløb og D/K, og prøv igen.')).toBeTruthy();

    const firstInput = within(e).getByLabelText(/^6920 /);
    const row = firstInput.closest('.l2-balance-input') as HTMLElement;
    const expectedFirst = snapshot.derived.checkpointBalances.find(item => item.accountNumber === '6920')!;
    await user.click(within(row).getByRole('radio', { name: expectedFirst.side === 'credit' ? 'K' : 'D' }));
    expect(within(e).queryByText('Kontrollér beløb og D/K, og prøv igen.')).toBeNull();
    await user.click(within(e).getByRole('button', { name: 'Kontrollér sektion E' }));
    expect(within(e).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(e).queryByRole('textbox')).toBeNull();
  });

  it('løser sektioner i vilkårlig rækkefølge', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const d = section('Samlede lønrelaterede omkostninger ÅTD');
    await user.type(within(d).getByLabelText('Samlede lønrelaterede omkostninger'), String(snapshot.derived.checkpoint.operatingTotal));
    await user.click(within(d).getByRole('button', { name: 'Kontrollér sektion D' }));
    expect(within(d).getByText('✓ Korrekt')).toBeTruthy();
    expect(screen.getByText('1 af 5 korrekte')).toBeTruthy();
  });

  it('går direkte til B10 når den sidste sektion bliver korrekt', async () => {
    let state = advanceToCheckpoint(snapshot);
    for (const id of ['A', 'B', 'C', 'D'] as const) state = completeAmountSection(state, id);
    for (const accountNumber of CHECKPOINT_BALANCE_ACCOUNTS) {
      const expected = snapshot.derived.checkpointBalances.find(item => item.accountNumber === accountNumber)!;
      state = editCheckpointBalance(state, accountNumber, { rawAmount: String(expected.amount), side: expected.side });
    }
    render(<Harness initial={state} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér sektion E' }));
    expect(screen.getByText('B10 · 1. kvartal · januar–marts 2026')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Betaling via Samlet Betaling – ATP' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Fortsæt/ })).toBeNull();
  });

  it('viser inline ÅTD og 13 readonly T-konti samtidig med editable checkpointfelter', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const reference = screen.getByRole('complementary', { name: 'Reference' });
    const ytd = reference.querySelector<HTMLElement>('.l2-ytd-grid')!;
    expect(within(reference).getByRole('heading', { name: 'ÅTD-specifikation' })).toBeTruthy();
    expect(within(ytd).getByRole('heading', { name: 'Pensioner' })).toBeTruthy();
    expect(within(ytd).getByRole('heading', { name: 'ATP' })).toBeTruthy();
    expect(within(ytd).getAllByText('Total')).toHaveLength(2);
    expect(reference.querySelectorAll('[data-reference-account]')).toHaveLength(13);
    expect(within(reference).queryByPlaceholderText('Beløb')).toBeNull();
    expect(within(reference).queryByRole('button', { name: /Tilføj postering/ })).toBeNull();
    expect(screen.getAllByPlaceholderText('Beløb')).toHaveLength(19);

    const toggle = screen.getByRole('button', { name: 'Skjul reference' });
    await user.click(toggle);
    expect(screen.queryByRole('complementary', { name: 'Reference' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Vis reference' }));
    expect(screen.getByRole('complementary', { name: 'Reference' })).toBeTruthy();
    expect(screen.getByText('0 af 5 korrekte')).toBeTruthy();
  });

  it('viser student-derived rows og saldo pr. 30/6 uden at kollapse splitposteringer', async () => {
    let state = createSplitCheckpointState();
    render(<Harness initial={state} />);
    const expectedPosting = snapshot.derived.documents[0].expectedPostings[0];
    const reference = document.querySelector<HTMLElement>('[data-reference-account="' + expectedPosting.accountNumber + '"]')!;
    const first = Math.max(1, Math.floor(expectedPosting.amount / 3));
    await userEvent.click(within(reference).getByRole('button', { name: /tidligere/ }));
    const history = screen.getByRole('dialog', { name: new RegExp(expectedPosting.accountNumber) });
    expect(within(history).getByText(formatLevel2Amount(first))).toBeTruthy();
    expect(within(history).getByText(formatLevel2Amount(expectedPosting.amount - first))).toBeTruthy();

    for (const accountNumber of ['2210', '5820', '6920'] as const) {
      const account = document.querySelector<HTMLElement>('[data-reference-account="' + accountNumber + '"]')!;
      const balance = selectCurrentAccountBalance(snapshot, state, accountNumber);
      expect(balance).not.toBeNull();
      expect(within(account).getByText(formatLevel2Balance(balance!))).toBeTruthy();
      expect(within(account).getByText('Saldo pr. 30/6')).toBeTruthy();
    }
    expect(document.querySelectorAll('[data-reference-account]').length).toBe(LEVEL2_ACCOUNTS.length);
  });
});

function createSplitCheckpointState(): Level2StudentState {
  let state = createInitialStudentState(snapshot);
  const expected = snapshot.derived.documents[0].expectedPostings;
  const split = expected[0];
  const first = Math.max(1, Math.floor(split.amount / 3));
  state = addStudentPostingRow(state, split.accountNumber, split.side, String(first), 'Første del');
  state = addStudentPostingRow(state, split.accountNumber, split.side, String(split.amount - first), 'Anden del');
  for (const posting of expected.slice(1)) {
    state = addStudentPostingRow(state, posting.accountNumber, posting.side, String(posting.amount), posting.text);
  }
  state = checkActiveDocument(snapshot, state);
  for (let index = 1; index < 9; index += 1) state = completeActiveDocument(snapshot, state);
  return state;
}
