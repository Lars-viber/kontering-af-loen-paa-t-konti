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
  readonly documentId?: V2DocumentId;
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
  readonly referenceAmount: number | null;
  readonly difference: number | null;
  readonly matches: boolean;
}

export interface V2WorkspaceDocumentField {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
}

function progressStep(
  label: string,
  status: V2WorkspaceProgressStatus,
  documentId?: V2DocumentId,
): V2WorkspaceProgressStep {
  return { label, status, documentId };
}

export function presentV2WorkspaceProgress(
  state: V2StudentState,
): V2WorkspaceProgressPresentation {
  const progress = selectV2Progress(state);
  const currentIndex = state.currentDocumentId === null
    ? -1
    : V2_DOCUMENT_IDS.indexOf(state.currentDocumentId);
  const inCheckpoint = state.phase === 'checkpoint' || state.phase === 'checkpointReview';
  const completed = state.phase === 'completed';
  const steps = V2_DOCUMENT_IDS.map((documentId, index): V2WorkspaceProgressStep => {
    if (completed || inCheckpoint || index < currentIndex) {
      return progressStep(documentId, 'completed', documentId);
    }
    if (index === currentIndex) return progressStep(documentId, 'active', documentId);
    return progressStep(documentId, 'upcoming', documentId);
  });
  steps.push(progressStep(
    'Afstemning',
    completed ? 'completed' : inCheckpoint ? 'active' : 'upcoming',
  ));
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

function workspaceDocumentField(
  id: string,
  label: string,
  amount: number,
): V2WorkspaceDocumentField {
  return { id, label, amount };
}

export function selectV2WorkspaceDocumentFields(
  source: V2SourceCase,
  documentId: V2DocumentId,
): readonly V2WorkspaceDocumentField[] {
  const document = selectV2WorkspaceDocument(source, documentId);
  if (!['B4', 'B5', 'B6', 'B7', 'B8'].includes(documentId)) return document.fields;

  const june = source.history.find(month => month.month === 'jun');
  if (!june) throw new Error('Missing V2.1 June source history');

  switch (documentId) {
    case 'B4':
      return [
        workspaceDocumentField('june-hourly-gross-pay', 'Bruttoløn – timelønnede – juni', june.hourlyTotals.grossSalary),
        workspaceDocumentField('june-hourly-employee-pension', 'Medarbejderpension – timelønnede – juni', june.hourlyTotals.employeePension),
        workspaceDocumentField('june-hourly-employee-atp', 'Medarbejder-ATP – timelønnede – juni', june.hourlyTotals.employeeAtp),
        workspaceDocumentField('june-hourly-am-base', 'AM-bidragsgrundlag – timelønnede – juni', june.hourlyTotals.amBase),
        workspaceDocumentField('june-hourly-am-contribution', 'AM-bidrag – timelønnede – juni', june.hourlyTotals.amContribution),
        workspaceDocumentField('june-hourly-a-tax', 'A-skat – timelønnede – juni', june.hourlyTotals.aTax),
        workspaceDocumentField('june-hourly-net-pay', 'Nettoløn – timelønnede – juni', june.hourlyTotals.netPay),
      ];
    case 'B5':
      return [
        workspaceDocumentField('june-hourly-employer-pension', 'Arbejdsgiverpension – timelønnede – juni', june.hourlyTotals.employerPension),
        workspaceDocumentField('june-hourly-employer-atp', 'Arbejdsgiver-ATP – timelønnede – juni', june.hourlyTotals.employerAtp),
      ];
    case 'B6':
      return [
        workspaceDocumentField('june-hourly-gross-holiday-pay', 'Bruttoferiepenge – juni', june.hourlyHolidayTotals.grossHolidayPay),
        workspaceDocumentField('june-hourly-holiday-am-contribution', 'AM-bidrag af feriepenge – juni', june.hourlyHolidayTotals.amContribution),
        workspaceDocumentField('june-hourly-holiday-a-tax', 'A-skat af feriepenge – juni', june.hourlyHolidayTotals.aTax),
        workspaceDocumentField('june-hourly-net-holiday-pay', 'Nettoferiepenge – juni', june.hourlyHolidayTotals.netHolidayPay),
      ];
    case 'B7':
      return [
        workspaceDocumentField('june-salaried-gross-pay', 'Bruttoløn – månedslønnede – juni', june.salariedTotals.grossSalary),
        workspaceDocumentField('june-salaried-employee-pension', 'Medarbejderpension – månedslønnede – juni', june.salariedTotals.employeePension),
        workspaceDocumentField('june-salaried-employee-atp', 'Medarbejder-ATP – månedslønnede – juni', june.salariedTotals.employeeAtp),
        workspaceDocumentField('june-salaried-am-base', 'AM-bidragsgrundlag – månedslønnede – juni', june.salariedTotals.amBase),
        workspaceDocumentField('june-salaried-am-contribution', 'AM-bidrag – månedslønnede – juni', june.salariedTotals.amContribution),
        workspaceDocumentField('june-salaried-a-tax', 'A-skat – månedslønnede – juni', june.salariedTotals.aTax),
        workspaceDocumentField('june-salaried-net-pay', 'Nettoløn – månedslønnede – juni', june.salariedTotals.netPay),
      ];
    case 'B8':
      return [
        workspaceDocumentField('june-salaried-employer-pension', 'Arbejdsgiverpension – månedslønnede – juni', june.salariedTotals.employerPension),
        workspaceDocumentField('june-salaried-employer-atp', 'Arbejdsgiver-ATP – månedslønnede – juni', june.salariedTotals.employerAtp),
      ];
    default:
      return document.fields;
  }
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
  referenceAmount: number | null,
): V2WorkspaceComparisonRow {
  const difference = bookedAmount === null || referenceAmount === null ? null : bookedAmount - referenceAmount;
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
    const sum = (fields: readonly string[]): number | null => {
      const amounts = fields.map(field => rawAmount(values[field as keyof typeof values]));
      return amounts.some(amount => amount === null)
        ? null
        : amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
    };
    return [
      comparison(
        'pension',
        'Pension – 2215',
        'Bogført saldo',
        'Sum af lønsystemets tælleværker',
        rawAmount(values.pensionBookBalance),
        sum([
          'hourlyEmployeePensionYtd',
          'hourlyEmployerPensionYtd',
          'salariedEmployeePensionYtd',
          'salariedEmployerPensionYtd',
        ]),
      ),
      comparison(
        'atp',
        'ATP – 2223',
        'Bogført saldo',
        'Sum af lønsystemets tælleværker',
        rawAmount(values.atpBookBalance),
        sum([
          'hourlyEmployeeAtpYtd',
          'hourlyEmployerAtpYtd',
          'salariedEmployeeAtpYtd',
          'salariedEmployerAtpYtd',
        ]),
      ),
      comparison(
        'holiday-pay',
        'Feriepenge – 2230',
        'Bogført saldo',
        'Bruttoferiepenge ÅTD – tælleværk',
        rawAmount(values.holidayPayBookBalance),
        rawAmount(values.holidayPayGrossYtd),
      ),
    ];
  }
  if (sectionId === 'D') return [];
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
