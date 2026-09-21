import { requireWholeKrone } from '../ruleset';
import { V2_DOCUMENT_TITLES, V2_GENERATOR_VERSION, V2_RULESET_VERSION, V2_RULESET_YEAR } from './constants';
import { V2_ACCOUNT_NUMBERS, V2_DOCUMENT_IDS } from './types';
import type {
  V2AnswerKey,
  V2DocumentId,
  V2LiabilityControlId,
  V2SourceCase,
  V2TallyId,
} from './types';

const REQUIRED_TALLY_IDS = [
  'hourly-gross-pay-ytd',
  'hourly-employee-pension-ytd',
  'hourly-employee-atp-ytd',
  'hourly-employer-pension-ytd',
  'hourly-employer-atp-ytd',
  'hourly-gross-holiday-pay-ytd',
  'salaried-gross-pay-ytd',
  'salaried-employee-pension-ytd',
  'salaried-employee-atp-ytd',
  'salaried-employer-pension-ytd',
  'salaried-employer-atp-ytd',
  'holiday-liability-system-assessed',
] as const satisfies readonly V2TallyId[];

const REQUIRED_LIABILITY_CONTROL_IDS = [
  'june-a-tax',
  'june-am-contribution',
  'june-pension',
  'atp-as-of-june-30',
  'june-net-holiday-pay',
  'holiday-liability-as-of-june-30',
] as const satisfies readonly V2LiabilityControlId[];

function assertExactOrder(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(label + ' must match the frozen V2.1 order');
  }
}

function assertPositiveWholeKrone(amount: number, label: string): void {
  requireWholeKrone(amount, label);
  if (amount <= 0) throw new RangeError(label + ' must be positive');
}

export function isV2DocumentId(value: string): value is V2DocumentId {
  return (V2_DOCUMENT_IDS as readonly string[]).includes(value);
}

export function assertV2SourceCase(source: V2SourceCase): void {
  if (
    source.identity.rulesetYear !== V2_RULESET_YEAR ||
    source.identity.rulesetVersion !== V2_RULESET_VERSION ||
    source.identity.generatorVersion !== V2_GENERATOR_VERSION
  ) {
    throw new Error('Invalid V2.1 version identity');
  }

  assertExactOrder(source.accounts.map(account => account.accountNumber), V2_ACCOUNT_NUMBERS, 'accounts');
  assertExactOrder(source.startBalances.map(balance => balance.accountNumber), V2_ACCOUNT_NUMBERS, 'start balances');
  assertExactOrder(source.documentSources.map(document => document.id), V2_DOCUMENT_IDS, 'document sources');
  assertExactOrder(source.tallies.map(tally => tally.id), REQUIRED_TALLY_IDS, 'tælleværker');
  assertExactOrder(
    source.liabilityControls.map(control => control.id),
    REQUIRED_LIABILITY_CONTROL_IDS,
    'liability controls',
  );

  for (const balance of source.startBalances) {
    requireWholeKrone(balance.amount, 'start balance ' + balance.accountNumber);
    if (balance.amount > 0 && balance.side === 'zero') throw new Error('Non-zero start balance uses zero side');
  }
  for (const document of source.documentSources) {
    if (document.title !== V2_DOCUMENT_TITLES[document.id]) {
      throw new Error('Wrong title for ' + document.id);
    }
    for (const item of document.fields) assertPositiveWholeKrone(item.amount, document.id + ' source field');
    for (const tallyId of document.visibleTallyIds) {
      if (!source.tallies.some(tally => tally.id === tallyId)) {
        throw new Error(document.id + ' references missing tælleværk ' + tallyId);
      }
    }
  }
  for (const tally of source.tallies) assertPositiveWholeKrone(tally.amount, 'tælleværk ' + tally.id);
  for (const control of source.liabilityControls) {
    assertPositiveWholeKrone(control.amount, 'liability control ' + control.id);
    if (!V2_ACCOUNT_NUMBERS.includes(control.accountNumber)) {
      throw new Error('Unknown liability-control account: ' + control.accountNumber);
    }
  }
}

export function assertV2AnswerKey(source: V2SourceCase, answerKey: V2AnswerKey): void {
  assertExactOrder(answerKey.documents.map(document => document.id), V2_DOCUMENT_IDS, 'answer documents');
  assertExactOrder(answerKey.finalBalances.map(balance => balance.accountNumber), V2_ACCOUNT_NUMBERS, 'final balances');

  for (const document of answerKey.documents) {
    if (document.title !== V2_DOCUMENT_TITLES[document.id]) throw new Error('Wrong answer title for ' + document.id);
    if (!document.balanced || document.debitTotal !== document.creditTotal) {
      throw new Error(document.id + ' is not balanced');
    }
    for (const posting of document.expectedPostings) {
      if (posting.documentId !== document.id) throw new Error('Posting has wrong document ID');
      if (!V2_ACCOUNT_NUMBERS.includes(posting.accountNumber)) throw new Error('Posting uses unknown account');
      if (posting.side !== 'debit' && posting.side !== 'credit') throw new Error('Posting has invalid side');
      assertPositiveWholeKrone(posting.amount, document.id + ' posting');
    }
  }

  for (const balance of answerKey.finalBalances) {
    requireWholeKrone(balance.amount, 'final balance ' + balance.accountNumber);
    if (balance.amount > 0 && balance.side === 'zero') throw new Error('Non-zero final balance uses zero side');
  }

  const comparisons = [
    answerKey.reconciliation.A,
    answerKey.reconciliation.B,
    answerKey.reconciliation.C.pension,
    answerKey.reconciliation.C.atp,
    answerKey.reconciliation.C.holidayPay,
    ...answerKey.reconciliation.E,
  ];
  for (const comparison of comparisons) {
    requireWholeKrone(comparison.bookedAmount, 'reconciliation booked amount');
    requireWholeKrone(comparison.controlAmount, 'reconciliation control amount');
    if (comparison.difference !== comparison.bookedAmount - comparison.controlAmount) {
      throw new Error('Invalid reconciliation difference');
    }
    if (comparison.difference !== 0) throw new Error('Expected reconciliation difference must be zero');
  }

  const finalAmount = (accountNumber: typeof V2_ACCOUNT_NUMBERS[number]): number => {
    const balance = answerKey.finalBalances.find(item => item.accountNumber === accountNumber);
    if (!balance) throw new Error('Missing final balance ' + accountNumber);
    return balance.amount;
  };
  const tallyAmount = (id: V2TallyId): number => {
    const tally = source.tallies.find(item => item.id === id);
    if (!tally) throw new Error('Missing tælleværk ' + id);
    return tally.amount;
  };

  for (const [section, accountNumber, employeePensionId, employeeAtpId] of [
    ['A', '2210', 'hourly-employee-pension-ytd', 'hourly-employee-atp-ytd'],
    ['B', '2211', 'salaried-employee-pension-ytd', 'salaried-employee-atp-ytd'],
  ] as const) {
    const item = answerKey.reconciliation[section];
    const expectedBook = finalAmount(accountNumber);
    const expectedPension = tallyAmount(employeePensionId);
    const expectedAtp = tallyAmount(employeeAtpId);
    if (
      item.wageAccountYtd !== expectedBook ||
      item.employeePensionYtd !== expectedPension ||
      item.employeeAtpYtd !== expectedAtp ||
      item.calculatedGrossPayYtd !== expectedBook + expectedPension + expectedAtp ||
      item.bookedAmount !== item.calculatedGrossPayYtd ||
      item.controlAmount !== tallyAmount(item.externalTallyId)
    ) throw new Error('Invalid reconciliation ' + section);
  }

  const pension = answerKey.reconciliation.C.pension;
  const expectedPensionTallies = [
    tallyAmount('hourly-employee-pension-ytd'),
    tallyAmount('hourly-employer-pension-ytd'),
    tallyAmount('salaried-employee-pension-ytd'),
    tallyAmount('salaried-employer-pension-ytd'),
  ] as const;
  if (
    pension.accountNumber !== '2215' ||
    pension.bookedAmount !== finalAmount('2215') ||
    pension.hourlyEmployeePensionYtd !== expectedPensionTallies[0] ||
    pension.hourlyEmployerPensionYtd !== expectedPensionTallies[1] ||
    pension.salariedEmployeePensionYtd !== expectedPensionTallies[2] ||
    pension.salariedEmployerPensionYtd !== expectedPensionTallies[3] ||
    pension.controlAmount !== expectedPensionTallies.reduce((sum, amount) => sum + amount, 0)
  ) throw new Error('Invalid pension reconciliation');

  const atp = answerKey.reconciliation.C.atp;
  const expectedAtpTallies = [
    tallyAmount('hourly-employee-atp-ytd'),
    tallyAmount('hourly-employer-atp-ytd'),
    tallyAmount('salaried-employee-atp-ytd'),
    tallyAmount('salaried-employer-atp-ytd'),
  ] as const;
  if (
    atp.accountNumber !== '2223' ||
    atp.bookedAmount !== finalAmount('2223') ||
    atp.hourlyEmployeeAtpYtd !== expectedAtpTallies[0] ||
    atp.hourlyEmployerAtpYtd !== expectedAtpTallies[1] ||
    atp.salariedEmployeeAtpYtd !== expectedAtpTallies[2] ||
    atp.salariedEmployerAtpYtd !== expectedAtpTallies[3] ||
    atp.controlAmount !== expectedAtpTallies.reduce((sum, amount) => sum + amount, 0)
  ) throw new Error('Invalid ATP reconciliation');

  const holidayPay = answerKey.reconciliation.C.holidayPay;
  const expectedHolidayPay = tallyAmount('hourly-gross-holiday-pay-ytd');
  if (
    holidayPay.accountNumber !== '2230' ||
    holidayPay.bookedAmount !== finalAmount('2230') ||
    holidayPay.grossHolidayPayYtd !== expectedHolidayPay ||
    holidayPay.controlAmount !== expectedHolidayPay
  ) throw new Error('Invalid holiday-pay reconciliation');
  requireWholeKrone(answerKey.reconciliation.D.operatingTotal, 'internal operating total');
  if (answerKey.reconciliation.D.operatingTotal !== answerKey.operatingTotal) {
    throw new Error('Invalid internal operating total');
  }

  assertExactOrder(
    answerKey.reconciliation.E.map(item => item.controlId),
    REQUIRED_LIABILITY_CONTROL_IDS,
    'reconciliation E controls',
  );
  for (const item of answerKey.reconciliation.E) {
    const balance = answerKey.finalBalances.find(candidate => candidate.accountNumber === item.accountNumber);
    const control = source.liabilityControls.find(candidate => candidate.id === item.controlId);
    if (
      !balance ||
      balance.side !== item.bookedSide ||
      item.bookedAmount !== balance.amount ||
      !control ||
      control.accountNumber !== item.accountNumber ||
      item.controlAmount !== control.amount
    ) {
      throw new Error('Invalid liability reconciliation for ' + item.accountNumber);
    }
  }
}

export function assertV2Contract(source: V2SourceCase, answerKey: V2AnswerKey): void {
  assertV2SourceCase(source);
  assertV2AnswerKey(source, answerKey);
}
