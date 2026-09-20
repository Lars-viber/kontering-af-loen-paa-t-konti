import {
  V2_DOCUMENT_IDS,
  type V2DocumentId,
  type V2DocumentSource,
  type V2ExternalTally,
  type V2LiabilityControl,
  type V2SourceCase,
  type V2TallyId,
} from '../../../domain/level2/v2';
import {
  selectV2Progress,
  selectV2StudentDerivedBalance,
  type V2CheckpointSectionId,
  type V2StudentState,
} from '../state';
import { parseV2WorkspaceAmount } from './format';

export type V2WorkspaceProgressStatus = 'completed' | 'active' | 'upcoming';

export interface V2WorkspaceProgressStep {
  readonly label: string;
  readonly status: V2WorkspaceProgressStatus;
}

export interface V2WorkspaceProgressPresentation {
  readonly completedDocuments: number;
  readonly remainingDocuments: number;
  readonly summary: string;
  readonly steps: readonly V2WorkspaceProgressStep[];
}

export interface V2WorkspaceComparisonRow {
  readonly rowId: string;
  readonly label: string;
  readonly bookedLabel: string;
  readonly referenceLabel: string;
  readonly bookedAmount: number | null;
  readonly referenceAmount: number;
  readonly difference: number | null;
  readonly matches: boolean;
}

function progressStep(
  label: string,
  status: V2WorkspaceProgressStatus,
): V2WorkspaceProgressStep {
  return { label, status };
}

function documentRange(from: number, to: number): string {
  return from === to ? 'B' + from : 'B' + from + '–B' + to;
}

export function presentV2WorkspaceProgress(
  state: V2StudentState,
): V2WorkspaceProgressPresentation {
  const progress = selectV2Progress(state);
  const steps: V2WorkspaceProgressStep[] = [];
  if (state.phase === 'documentEntry' && state.currentDocumentId !== null) {
    const active = Number(state.currentDocumentId.slice(1));
    if (active > 1) steps.push(progressStep(documentRange(1, active - 1), 'completed'));
    steps.push(progressStep('B' + active, 'active'));
    if (active < 9) steps.push(progressStep(documentRange(active + 1, 9), 'upcoming'));
    steps.push(progressStep('Afstemning', 'upcoming'));
  } else if (state.phase === 'documentReview' && state.currentDocumentId !== null) {
    const reviewed = Number(state.currentDocumentId.slice(1));
    steps.push(progressStep(documentRange(1, reviewed), 'completed'));
    if (reviewed < 9) steps.push(progressStep(documentRange(reviewed + 1, 9), 'upcoming'));
    steps.push(progressStep('Afstemning', 'upcoming'));
  } else {
    steps.push(progressStep('B1–B9', 'completed'));
    steps.push(progressStep(
      'Afstemning',
      state.phase === 'checkpoint' ? 'active' : 'completed',
    ));
  }
  const remaining = progress.remainingDocumentCount;
  return {
    completedDocuments: progress.completedDocumentCount,
    remainingDocuments: remaining,
    summary: progress.completedDocumentCount + ' af 9 bilag gennemført' +
      (remaining > 0 ? ' · ' + remaining + ' tilbage' : ''),
    steps,
  };
}

export function selectV2WorkspaceDocument(
  source: V2SourceCase,
  documentId: V2DocumentId,
): V2DocumentSource {
  const document = source.documentSources.find(item => item.id === documentId);
  if (!document) throw new Error('Missing V2.1 document source ' + documentId);
  return document;
}

export function selectV2WorkspaceDocumentTallies(
  source: V2SourceCase,
  documentId: V2DocumentId,
): readonly V2ExternalTally[] {
  if (!['B4', 'B5', 'B6', 'B7', 'B8'].includes(documentId)) return [];
  const document = selectV2WorkspaceDocument(source, documentId);
  const ids = new Set(document.visibleTallyIds);
  return source.tallies.filter(tally => ids.has(tally.id));
}

function tally(source: V2SourceCase, tallyId: V2TallyId): V2ExternalTally {
  const item = source.tallies.find(candidate => candidate.id === tallyId);
  if (!item) throw new Error('Missing V2.1 tally ' + tallyId);
  return item;
}

function comparison(
  rowId: string,
  label: string,
  bookedLabel: string,
  referenceLabel: string,
  bookedAmount: number | null,
  referenceAmount: number,
): V2WorkspaceComparisonRow {
  const difference = bookedAmount === null ? null : bookedAmount - referenceAmount;
  return {
    rowId,
    label,
    bookedLabel,
    referenceLabel,
    bookedAmount,
    referenceAmount,
    difference,
    matches: difference === 0,
  };
}

function rawAmount(raw: string): number | null {
  return parseV2WorkspaceAmount(raw);
}

const D_TALLY_IDS: readonly V2TallyId[] = [
  'hourly-gross-pay-ytd',
  'salaried-gross-pay-ytd',
  'hourly-employer-pension-ytd',
  'salaried-employer-pension-ytd',
  'hourly-employer-atp-ytd',
  'salaried-employer-atp-ytd',
  'hourly-gross-holiday-pay-ytd',
  'holiday-liability-adjustment-ytd',
];

export function presentV2WorkspaceReconciliation(
  source: V2SourceCase,
  state: V2StudentState,
  sectionId: V2CheckpointSectionId,
): readonly V2WorkspaceComparisonRow[] {
  if (sectionId === 'A' || sectionId === 'B') {
    const section = state.checkpoint[sectionId];
    const tallyId: V2TallyId = sectionId === 'A'
      ? 'hourly-gross-pay-ytd'
      : 'salaried-gross-pay-ytd';
    const reference = tally(source, tallyId);
    return [comparison(
      sectionId,
      sectionId === 'A' ? 'Timelønnede' : 'Månedslønnede',
      'Bogført/beregnet',
      'Tælleværk',
      rawAmount(section.values.calculatedGrossPayYtd),
      reference.amount,
    )];
  }
  if (sectionId === 'C') {
    const values = state.checkpoint.C.values;
    const rows: readonly [string, string, string, readonly V2TallyId[]][] = [
      [
        'employer-pension',
        'Arbejdsgiverpension',
        values.employerPension,
        ['hourly-employer-pension-ytd', 'salaried-employer-pension-ytd'],
      ],
      [
        'employer-atp',
        'Arbejdsgiver-ATP',
        values.employerAtp,
        ['hourly-employer-atp-ytd', 'salaried-employer-atp-ytd'],
      ],
      [
        'gross-holiday-pay',
        'Feriepenge – timelønnede',
        values.grossHolidayPay,
        ['hourly-gross-holiday-pay-ytd'],
      ],
      [
        'holiday-adjustment',
        'Regulering af feriepengeforpligtelse',
        values.holidayLiabilityAdjustment,
        ['holiday-liability-adjustment-ytd'],
      ],
    ];
    return rows.map(([rowId, label, raw, tallyIds]) => comparison(
      rowId,
      label,
      'Bogført',
      'Tælleværk',
      rawAmount(raw),
      tallyIds.reduce((sum, tallyId) => sum + tally(source, tallyId).amount, 0),
    ));
  }
  if (sectionId === 'D') {
    const referenceAmount = D_TALLY_IDS.reduce((sum, tallyId) => sum + tally(source, tallyId).amount, 0);
    return [comparison(
      'operating-total',
      'Samlede lønrelaterede omkostninger',
      'Bogført/beregnet',
      'Sum af tælleværker',
      rawAmount(state.checkpoint.D.values.operatingTotal),
      referenceAmount,
    )];
  }
  return source.liabilityControls.map(control => {
    const balance = selectV2StudentDerivedBalance(
      source.startBalances,
      state,
      control.accountNumber,
    );
    return comparison(
      control.id,
      control.presentationLabel,
      'Bogført saldo',
      'Kontroloplysning',
      balance.amount,
      control.amount,
    );
  });
}

export function groupV2WorkspaceTallies(source: V2SourceCase): Readonly<{
  hourly: readonly V2ExternalTally[];
  salaried: readonly V2ExternalTally[];
  holiday: readonly V2ExternalTally[];
}> {
  return {
    hourly: source.tallies.filter(item => item.employeeGroup === 'hourly'),
    salaried: source.tallies.filter(item => item.employeeGroup === 'salaried'),
    holiday: source.tallies.filter(item => item.employeeGroup === 'all'),
  };
}

export function selectV2WorkspaceControls(
  source: V2SourceCase,
): readonly V2LiabilityControl[] {
  return source.liabilityControls;
}

export const V2_WORKSPACE_DOCUMENT_IDS = V2_DOCUMENT_IDS;
