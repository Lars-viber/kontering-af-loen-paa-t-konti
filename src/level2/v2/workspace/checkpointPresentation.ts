import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2CheckpointBalanceAccount,
} from '../state';

export interface V2CheckpointFieldPresentation {
  readonly field: V2CheckpointAmountField;
  readonly label: string;
}

export interface V2CheckpointSectionPresentation {
  readonly sectionId: V2AmountCheckpointSectionId;
  readonly title: string;
  readonly relationship?: string;
  readonly fields: readonly V2CheckpointFieldPresentation[];
}

export const V2_CHECKPOINT_AMOUNT_SECTIONS: readonly V2CheckpointSectionPresentation[] = [
  {
    sectionId: 'A',
    title: 'Timelønnede',
    relationship: 'Lønkonto + medarbejderpension + medarbejder-ATP = bruttoløn',
    fields: [
      { field: 'wageAccountYtd', label: 'Lønninger – timelønnede, saldo ÅTD' },
      { field: 'employeePensionYtd', label: 'Medarbejderpension ÅTD' },
      { field: 'employeeAtpYtd', label: 'Medarbejder-ATP ÅTD' },
      { field: 'calculatedGrossPayYtd', label: 'Bruttoløn ÅTD' },
    ],
  },
  {
    sectionId: 'B',
    title: 'Månedslønnede',
    relationship: 'Lønkonto + medarbejderpension + medarbejder-ATP = bruttoløn',
    fields: [
      { field: 'wageAccountYtd', label: 'Lønninger – månedslønnede, saldo ÅTD' },
      { field: 'employeePensionYtd', label: 'Medarbejderpension ÅTD' },
      { field: 'employeeAtpYtd', label: 'Medarbejder-ATP ÅTD' },
      { field: 'calculatedGrossPayYtd', label: 'Bruttoløn ÅTD' },
    ],
  },
  {
    sectionId: 'C',
    title: 'Øvrige lønrelaterede omkostninger',
    fields: [
      { field: 'employerPension', label: 'Arbejdsgiverpension ÅTD' },
      { field: 'employerAtp', label: 'Arbejdsgiver-ATP ÅTD' },
      { field: 'grossHolidayPay', label: 'Feriepenge – timelønnede ÅTD' },
      { field: 'holidayLiabilityAdjustment', label: 'Regulering af feriepengeforpligtelse ÅTD' },
    ],
  },
  {
    sectionId: 'D',
    title: 'Samlede lønrelaterede omkostninger',
    fields: [
      { field: 'operatingTotal', label: 'Samlede lønrelaterede omkostninger ÅTD' },
    ],
  },
];

export const V2_CHECKPOINT_BALANCE_LABELS: Readonly<Record<V2CheckpointBalanceAccount, string>> = {
  '6920': 'Skyldig A-skat',
  '6930': 'Skyldig AM-bidrag',
  '6922': 'Skyldig pension',
  '6921': 'Skyldig ATP',
  '6923': 'Skyldige nettoferiepenge – FerieKonto',
  '6924': 'Feriepengeforpligtelse',
};
