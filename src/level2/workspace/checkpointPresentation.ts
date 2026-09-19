import { getLevel2CaseData, type Level2StateCase } from '../state';
import type {
  AmountCheckpointSectionId,
  CheckpointAmountField,
  CheckpointBalanceAccount,
  FinalControlReasonId,
} from '../state';

export interface CheckpointFieldPresentation {
  readonly field: CheckpointAmountField;
  readonly label: string;
}

export interface CheckpointSectionPresentation {
  readonly sectionId: AmountCheckpointSectionId;
  readonly title: string;
  readonly fields: readonly CheckpointFieldPresentation[];
  readonly relationship?: string;
}

export const CHECKPOINT_AMOUNT_SECTIONS: readonly CheckpointSectionPresentation[] = Object.freeze([
  {
    sectionId: 'A',
    title: 'Bruttoløn ÅTD – timelønnede',
    relationship: 'Lønkonto + medarbejderpension + medarbejder-ATP = bruttoløn',
    fields: [
      { field: 'wageAccount', label: 'Lønninger – timelønnede, saldo ÅTD' },
      { field: 'employeePension', label: 'Medarbejderpension ÅTD' },
      { field: 'employeeAtp', label: 'Medarbejder-ATP ÅTD' },
      { field: 'grossPayroll', label: 'Bruttoløn ÅTD' },
    ],
  },
  {
    sectionId: 'B',
    title: 'Bruttoløn ÅTD – månedslønnede',
    relationship: 'Lønkonto + medarbejderpension + medarbejder-ATP = bruttoløn',
    fields: [
      { field: 'wageAccount', label: 'Lønninger – månedslønnede, saldo ÅTD' },
      { field: 'employeePension', label: 'Medarbejderpension ÅTD' },
      { field: 'employeeAtp', label: 'Medarbejder-ATP ÅTD' },
      { field: 'grossPayroll', label: 'Bruttoløn ÅTD' },
    ],
  },
  {
    sectionId: 'C',
    title: 'Øvrige lønomkostninger ÅTD',
    fields: [
      { field: 'employerPension', label: 'Arbejdsgiverpension ÅTD' },
      { field: 'employerAtp', label: 'Arbejdsgiver-ATP ÅTD' },
      { field: 'hourlyHolidayPay', label: 'Feriepenge – timelønnede ÅTD' },
      { field: 'holidayLiabilityAdjustment', label: 'Regulering af feriepengeforpligtelse ÅTD' },
    ],
  },
  {
    sectionId: 'D',
    title: 'Samlede lønrelaterede omkostninger ÅTD',
    relationship: 'Bruttoløn timelønnede + bruttoløn månedslønnede + arbejdsgiverpension + arbejdsgiver-ATP + feriepenge + regulering af feriepengeforpligtelse',
    fields: [
      { field: 'operatingTotal', label: 'Samlede lønrelaterede omkostninger' },
    ],
  },
]);

export const CHECKPOINT_BALANCE_LABELS: Readonly<Record<CheckpointBalanceAccount, string>> = Object.freeze({
  '6920': 'Skyldig A-skat',
  '6930': 'Skyldig AM-bidrag',
  '6922': 'Skyldig pension',
  '6921': 'Skyldig ATP',
  '6923': 'Skyldige nettoferiepenge – FerieKonto',
  '6924': 'Feriepengeforpligtelse',
});

export interface YtdSpecificationRow {
  readonly label: string;
  readonly amount: number;
}

export interface YtdSpecificationPresentation {
  readonly pension: readonly YtdSpecificationRow[];
  readonly pensionTotal: number;
  readonly atp: readonly YtdSpecificationRow[];
  readonly atpTotal: number;
}

export function presentYtdSpecification(snapshot: Level2StateCase): YtdSpecificationPresentation {
  const data = getLevel2CaseData(snapshot);
  const source = data.ytdSpecification;
  return {
    pension: [
      { label: 'Timelønnede, medarbejderandel', amount: source.pension.hourlyEmployee },
      { label: 'Timelønnede, arbejdsgiverandel', amount: source.pension.hourlyEmployer },
      { label: 'Månedslønnede, medarbejderandel', amount: source.pension.salariedEmployee },
      { label: 'Månedslønnede, arbejdsgiverandel', amount: source.pension.salariedEmployer },
    ],
    pensionTotal: data.checkpoint.pensionSpecificationTotal,
    atp: [
      { label: 'Timelønnede, medarbejderandel', amount: source.atp.hourlyEmployee },
      { label: 'Timelønnede, arbejdsgiverandel', amount: source.atp.hourlyEmployer },
      { label: 'Månedslønnede, medarbejderandel', amount: source.atp.salariedEmployee },
      { label: 'Månedslønnede, arbejdsgiverandel', amount: source.atp.salariedEmployer },
    ],
    atpTotal: data.checkpoint.atpSpecificationTotal,
  };
}

export const FINAL_REASON_LABELS: Readonly<Record<FinalControlReasonId, string>> = Object.freeze({
  aTaxJunePaid: 'A-skat vedr. juni er betalt.',
  amJunePaid: 'AM-bidrag vedr. juni er betalt.',
  pensionJunePaid: 'Pension vedr. juni er betalt.',
  holidayPayJunePaid: 'Nettoferiepenge vedr. juni er betalt til FerieKonto.',
  atpQ1PaidQ2Outstanding: 'ATP for 1. kvartal er betalt, mens 2. kvartal fortsat står som skyldig.',
  holidayLiabilityRemains: 'Forpligtelsen pr. 30/6 er ikke afregnet i juli-forløbet og står derfor fortsat som gæld.',
});
