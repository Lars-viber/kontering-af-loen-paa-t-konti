import { describe, expect, it } from 'vitest';
import { REFERENCE_R1_FIXTURE, generateLevel2Case } from '../../src/domain/level2';
import {
  CHECKPOINT_BALANCE_ACCOUNTS,
  checkCheckpointSection,
  editCheckpointAmount,
  editCheckpointBalance,
  getLevel2CaseData,
} from '../../src/level2/state';
import { advanceToCheckpoint, completeCheckpoint } from './state-helpers';

describe('Niveau 2 checkpoint', () => {
  it('holder forkert A redigerbar og nulstiller status ved edit', () => {
    const source = REFERENCE_R1_FIXTURE;
    let state = advanceToCheckpoint(source);
    state = editCheckpointAmount(state, 'A', 'wageAccount', '1');
    state = checkCheckpointSection(source, state, 'A');
    expect(state.checkpoint.A.status).toBe('incorrect');

    state = editCheckpointAmount(state, 'A', 'wageAccount', '2');
    expect(state.checkpoint.A.status).toBe('unchecked');
  });

  it('låser en korrekt sektion samlet', () => {
    const source = REFERENCE_R1_FIXTURE;
    const expected = getLevel2CaseData(source).checkpoint.hourlyGrossPayroll;
    let state = advanceToCheckpoint(source);
    for (const [field, amount] of Object.entries(expected)) {
      state = editCheckpointAmount(state, 'A', field as never, String(amount));
    }
    state = checkCheckpointSection(source, state, 'A');
    expect(state.checkpoint.A.status).toBe('correct');

    const locked = editCheckpointAmount(state, 'A', 'wageAccount', '1');
    expect(locked).toBe(state);
  });

  it('kræver både korrekt beløb og korrekt D/K i E', () => {
    const source = REFERENCE_R1_FIXTURE;
    const expected = getLevel2CaseData(source);
    let state = advanceToCheckpoint(source);
    for (const accountNumber of CHECKPOINT_BALANCE_ACCOUNTS) {
      const balance = expected.checkpointBalances.find(candidate => candidate.accountNumber === accountNumber);
      if (!balance) throw new Error('Missing balance');
      const wrongSide = accountNumber === CHECKPOINT_BALANCE_ACCOUNTS[0]
        ? (balance.side === 'credit' ? 'debit' : 'credit')
        : balance.side;
      state = editCheckpointBalance(state, accountNumber, { rawAmount: String(balance.amount), side: wrongSide });
    }
    state = checkCheckpointSection(source, state, 'E');
    expect(state.checkpoint.E.status).toBe('incorrect');

    const first = expected.checkpointBalances.find(balance => balance.accountNumber === CHECKPOINT_BALANCE_ACCOUNTS[0]);
    if (!first) throw new Error('Missing first balance');
    state = editCheckpointBalance(state, CHECKPOINT_BALANCE_ACCOUNTS[0], { side: first.side });
    expect(state.checkpoint.E.status).toBe('unchecked');
  });

  it('åbner B10 først når A–E er korrekte for R1', () => {
    const source = REFERENCE_R1_FIXTURE;
    const state = completeCheckpoint(source, advanceToCheckpoint(source));
    expect(state.phase).toEqual({ kind: 'document', activeDocumentId: 'B10' });
    expect(state.documents[9].status).toBe('active');
    expect(Object.values(state.checkpoint).every(section => section.status === 'correct')).toBe(true);
  });

  it('er case-uafhængigt for generatorvariant 42', () => {
    const source = generateLevel2Case(42);
    const state = completeCheckpoint(source, advanceToCheckpoint(source));
    expect(state.phase).toEqual({ kind: 'document', activeDocumentId: 'B10' });
    expect(state.checkpoint.A.values.wageAccount).toBe(String(source.derived.checkpoint.hourlyGrossPayroll.wageAccount));
    expect(state.checkpoint.D.values.operatingTotal).toBe(String(source.derived.checkpoint.operatingTotal));
  });
});
