import type {
  AccountBalance,
  Level2AtpTimeline,
  Level2DocumentId,
  ReferenceMonth,
} from '../../domain/level2';
import type { Level2CaseSnapshot } from '../session';

export interface DocumentPresentationRow {
  readonly label: string;
  readonly amount: number;
  readonly emphasis?: 'total';
}

export interface DocumentPresentation {
  readonly documentId: Level2DocumentId;
  readonly title: string;
  readonly periodLabel: string;
  readonly rows: readonly DocumentPresentationRow[];
}

export interface ReferencePresentationSource {
  readonly history: readonly ReferenceMonth[];
  readonly startBalances: readonly AccountBalance[];
  readonly checkpointBalances: readonly AccountBalance[];
  readonly atp: Level2AtpTimeline;
  readonly holidayLiability: {
    readonly holidayLiabilityBeforeAdjustment: number;
    readonly systemAssessedHolidayLiability: number;
  };
}

export type DocumentPresentationSource = Level2CaseSnapshot | ReferencePresentationSource;

function caseData(source: DocumentPresentationSource) {
  if ('derived' in source) {
    return {
      history: source.derived.history,
      startBalances: source.derived.startBalances,
      checkpointBalances: source.derived.checkpointBalances,
      atp: source.derived.atp,
      holidayLiability: source.inputs.holidayLiability,
    };
  }
  return source;
}

function balanceAmount(balances: readonly AccountBalance[], accountNumber: AccountBalance['accountNumber']): number {
  const balance = balances.find(candidate => candidate.accountNumber === accountNumber);
  if (!balance) throw new Error('Missing Level 2 balance ' + accountNumber);
  return balance.amount;
}

function row(label: string, amount: number, emphasis?: 'total'): DocumentPresentationRow {
  return emphasis ? { label, amount, emphasis } : { label, amount };
}

export function presentLevel2Document(
  source: DocumentPresentationSource,
  documentId: Level2DocumentId,
): DocumentPresentation {
  const data = caseData(source);
  const june = data.history.find(month => month.month === 'jun');
  if (!june) throw new Error('Missing June history');
  const start = data.startBalances;
  const checkpoint = data.checkpointBalances;
  const periodLabel = 'Juli 2026';

  if (documentId === 'B1') {
    const aTax = balanceAmount(start, '6920');
    const am = balanceAmount(start, '6930');
    return { documentId, title: 'Betaling af A-skat og AM-bidrag vedr. maj', periodLabel: 'Juni 2026', rows: [
      row('A-skat vedr. maj', aTax), row('AM-bidrag vedr. maj', am), row('Samlet betaling', aTax + am, 'total'),
    ] };
  }
  if (documentId === 'B2') {
    const pension = balanceAmount(start, '6922');
    return { documentId, title: 'Betaling af pension vedr. maj', periodLabel: 'Juni 2026', rows: [
      row('Pension i alt', pension), row('Samlet betaling', pension, 'total'),
    ] };
  }
  if (documentId === 'B3') {
    const holiday = balanceAmount(start, '6923');
    return { documentId, title: 'Betaling til FerieKonto vedr. maj', periodLabel: 'Juni 2026', rows: [
      row('Nettoferiepenge', holiday), row('Samlet betaling', holiday, 'total'),
    ] };
  }
  if (documentId === 'B4' || documentId === 'B7') {
    const totals = documentId === 'B4' ? june.hourlyTotals : june.salariedTotals;
    const group = documentId === 'B4' ? 'timelønnede' : 'månedslønnede';
    return { documentId, title: 'Lønkørsel – ' + group + ' – juni 2026', periodLabel: 'Juni 2026', rows: [
      row('Bruttoløn', totals.grossSalary),
      row('Medarbejderpension', totals.employeePension),
      row('Medarbejder-ATP', totals.employeeAtp),
      row('AM-grundlag', totals.amBase),
      row('AM-bidrag', totals.amContribution),
      row('A-skat', totals.aTax),
      row('Nettoløn', totals.netPay, 'total'),
    ] };
  }
  if (documentId === 'B5' || documentId === 'B8') {
    const totals = documentId === 'B5' ? june.hourlyTotals : june.salariedTotals;
    const group = documentId === 'B5' ? 'timelønnede' : 'månedslønnede';
    return { documentId, title: 'Arbejdsgiverbidrag – ' + group, periodLabel: 'Juni 2026', rows: [
      row('Arbejdsgiverpension', totals.employerPension),
      row('Arbejdsgiver-ATP', totals.employerAtp),
      row('I alt', totals.employerPension + totals.employerAtp, 'total'),
    ] };
  }
  if (documentId === 'B6') {
    const totals = june.hourlyHolidayTotals;
    return { documentId, title: 'Feriepenge – timelønnede – juni 2026', periodLabel: 'Juni 2026', rows: [
      row('Bruttoferiepenge', totals.grossHolidayPay),
      row('AM-bidrag', totals.amContribution),
      row('A-skat', totals.aTax),
      row('Nettoferiepenge til FerieKonto', totals.netHolidayPay, 'total'),
    ] };
  }
  if (documentId === 'B9') {
    return { documentId, title: 'Regulering af feriepengeforpligtelse pr. 30/6', periodLabel: 'Juni 2026', rows: [
      row('Bogført saldo før regulering', data.holidayLiability.holidayLiabilityBeforeAdjustment),
      row('Systemopgjort saldo pr. 30/6', data.holidayLiability.systemAssessedHolidayLiability),
    ] };
  }
  if (documentId === 'B10') {
    return { documentId, title: 'Betaling via Samlet Betaling – ATP', periodLabel: '1. kvartal · januar–marts 2026', rows: [
      row('ATP til betaling', data.atp.q1.total, 'total'),
    ] };
  }
  if (documentId === 'B11') {
    const aTax = balanceAmount(checkpoint, '6920');
    const am = balanceAmount(checkpoint, '6930');
    return { documentId, title: 'Betaling af A-skat og AM-bidrag vedr. juni', periodLabel, rows: [
      row('A-skat', aTax), row('AM-bidrag', am), row('Samlet betaling', aTax + am, 'total'),
    ] };
  }
  if (documentId === 'B12') {
    const pension = balanceAmount(checkpoint, '6922');
    return { documentId, title: 'Betaling af pension vedr. juni', periodLabel, rows: [
      row('Pension i alt', pension), row('Samlet betaling', pension, 'total'),
    ] };
  }
  const holiday = balanceAmount(checkpoint, '6923');
  return { documentId, title: 'Betaling til FerieKonto vedr. juni', periodLabel, rows: [
    row('Nettoferiepenge', holiday), row('Samlet betaling', holiday, 'total'),
  ] };
}


