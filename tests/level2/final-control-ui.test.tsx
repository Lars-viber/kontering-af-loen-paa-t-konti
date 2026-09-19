// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateLevel2Case } from '../../src/domain/level2';
import { createLevel2PersistedSession } from '../../src/level2/session';
import {
  FINAL_CONTROL_EXPECTED_REASONS,
  FINAL_CONTROL_ITEM_IDS,
  FINAL_CONTROL_REASON_IDS,
  checkFinalControlItem,
  selectFinalControlReason,
  type Level2StudentState,
} from '../../src/level2/state';
import {
  FINAL_ITEM_LABELS,
  FINAL_REASON_LABELS,
  Level2Workspace,
  formatLevel2Balance,
  presentFinalItems,
} from '../../src/level2/workspace';
import { advanceToFinalControl } from './state-helpers';

afterEach(cleanup);
const snapshot = generateLevel2Case(42);
const savedAt = '2026-09-19T08:00:00.000Z';

function Harness({ initial = advanceToFinalControl(snapshot) }: { readonly initial?: Level2StudentState }) {
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

function item(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const element = heading.closest('section');
  if (!element) throw new Error('Missing final item ' + name);
  return element;
}

describe('J3C slutkontrol og completed UI', () => {
  it('viser præcis seks items og readonly final ledger-saldi', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Slutkontrol' })).toBeTruthy();
    for (const presentation of presentFinalItems(snapshot)) {
      const card = item(presentation.label);
      expect(within(card).getByText(formatLevel2Balance(presentation.balance))).toBeTruthy();
      expect(within(card).getByLabelText('Vælg forklaring')).toBeTruthy();
    }
    expect(screen.getAllByLabelText('Vælg forklaring')).toHaveLength(6);
    expect(item(FINAL_ITEM_LABELS.atp).textContent).toContain('K');
    expect(item(FINAL_ITEM_LABELS.holidayLiability).textContent).toContain('K');
    expect(item(FINAL_ITEM_LABELS.aTax).textContent).toContain('0');
  });

  it('viser neutral fejl, nulstiller ved edit og låser korrekt item', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const card = item(FINAL_ITEM_LABELS.aTax);
    const select = within(card).getByLabelText('Vælg forklaring');
    const correct = FINAL_CONTROL_EXPECTED_REASONS.aTax;
    const wrong = FINAL_CONTROL_REASON_IDS.find(id => id !== correct)!;
    await user.selectOptions(select, wrong);
    await user.click(within(card).getByRole('button', { name: 'Kontrollér Skyldig A-skat' }));
    expect(within(card).getByText('Vælg en anden forklaring.')).toBeTruthy();
    expect(card.textContent).not.toContain('Det rigtige svar');

    await user.selectOptions(select, correct);
    expect(within(card).queryByText('Vælg en anden forklaring.')).toBeNull();
    await user.click(within(card).getByRole('button', { name: 'Kontrollér Skyldig A-skat' }));
    expect(within(card).getByText('✓ Korrekt')).toBeTruthy();
    expect(within(card).queryByRole('combobox')).toBeNull();
    expect(within(card).getByText(FINAL_REASON_LABELS[correct])).toBeTruthy();
  });

  it('markerer ingen option som korrekt før grading', () => {
    render(<Harness />);
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('data-correct')).toBeNull();
      expect(option.className).not.toContain('correct');
    }
  });

  it('går automatisk til completed når det sidste item bliver korrekt', async () => {
    let state = advanceToFinalControl(snapshot);
    for (const itemId of FINAL_CONTROL_ITEM_IDS.slice(0, -1)) {
      state = selectFinalControlReason(state, itemId, FINAL_CONTROL_EXPECTED_REASONS[itemId]);
      state = checkFinalControlItem(state, itemId);
    }
    const last = FINAL_CONTROL_ITEM_IDS.at(-1)!;
    state = selectFinalControlReason(state, last, FINAL_CONTROL_EXPECTED_REASONS[last]);
    render(<Harness initial={state} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kontrollér ' + FINAL_ITEM_LABELS[last] }));
    expect(screen.getByRole('heading', { name: 'Niveau 2 gennemført' })).toBeTruthy();
    expect(screen.getByText('AFSLUTTET OPGAVE · VARIANT 42')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    const summary = document.querySelector('.l2-completed-balances');
    expect(summary?.querySelectorAll('div')).toHaveLength(6);
  });
});
