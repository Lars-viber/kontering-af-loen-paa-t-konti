import type { Answer, PayslipTotals } from './types';

export function buildAnswerKey(totals: PayslipTotals): Answer {
  return {
    '2210': { debit: totals.amBase, credit: 0 },
    '2215': { debit: totals.pension, credit: 0 },
    '2223': { debit: totals.atp, credit: 0 },
    '6920': { debit: 0, credit: totals.aTax },
    '6921': { debit: 0, credit: totals.atp },
    '6922': { debit: 0, credit: totals.pension },
    '6930': { debit: 0, credit: totals.amContribution },
    '5820': { debit: 0, credit: totals.netPay },
  };
}