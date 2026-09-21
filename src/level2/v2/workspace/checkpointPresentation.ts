import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2CheckpointBalanceAccount,
} from '../state';

export interface V2CheckpointFieldPresentation {
  readonly field: V2CheckpointAmountField;
  readonly label: string;
  readonly sourceLabel: 'Fra bogføringen / T-konto' | 'Fra lønsystemets tælleværker' | 'Beregnet';
  readonly group?: 'Pension' | 'ATP' | 'Feriepenge – timelønnede';
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
    relationship: '2210 Lønninger + medarbejderpension + medarbejder-ATP = bruttoløn ÅTD',
    fields: [
      { field: 'wageAccountYtd', label: '2210 Lønninger – timelønnede, saldo ÅTD', sourceLabel: 'Fra bogføringen / T-konto' },
      { field: 'employeePensionYtd', label: 'Medarbejderpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker' },
      { field: 'employeeAtpYtd', label: 'Medarbejder-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker' },
      { field: 'calculatedGrossPayYtd', label: 'Bruttoløn ÅTD', sourceLabel: 'Beregnet' },
    ],
  },
  {
    sectionId: 'B',
    title: 'Månedslønnede',
    relationship: '2211 Lønninger + medarbejderpension + medarbejder-ATP = bruttoløn ÅTD',
    fields: [
      { field: 'wageAccountYtd', label: '2211 Lønninger – månedslønnede, saldo ÅTD', sourceLabel: 'Fra bogføringen / T-konto' },
      { field: 'employeePensionYtd', label: 'Medarbejderpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker' },
      { field: 'employeeAtpYtd', label: 'Medarbejder-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker' },
      { field: 'calculatedGrossPayYtd', label: 'Bruttoløn ÅTD', sourceLabel: 'Beregnet' },
    ],
  },
  {
    sectionId: 'C',
    title: 'Afstem pension, ATP og feriepenge',
    fields: [
      { field: 'pensionBookBalance', label: '2215 Pensioner – saldo ÅTD', sourceLabel: 'Fra bogføringen / T-konto', group: 'Pension' },
      { field: 'hourlyEmployeePensionYtd', label: 'Timelønnede – medarbejderpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'Pension' },
      { field: 'hourlyEmployerPensionYtd', label: 'Timelønnede – arbejdsgiverpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'Pension' },
      { field: 'salariedEmployeePensionYtd', label: 'Månedslønnede – medarbejderpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'Pension' },
      { field: 'salariedEmployerPensionYtd', label: 'Månedslønnede – arbejdsgiverpension ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'Pension' },
      { field: 'atpBookBalance', label: '2223 ATP – saldo ÅTD', sourceLabel: 'Fra bogføringen / T-konto', group: 'ATP' },
      { field: 'hourlyEmployeeAtpYtd', label: 'Timelønnede – medarbejder-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'ATP' },
      { field: 'hourlyEmployerAtpYtd', label: 'Timelønnede – arbejdsgiver-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'ATP' },
      { field: 'salariedEmployeeAtpYtd', label: 'Månedslønnede – medarbejder-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'ATP' },
      { field: 'salariedEmployerAtpYtd', label: 'Månedslønnede – arbejdsgiver-ATP ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'ATP' },
      { field: 'holidayPayBookBalance', label: '2230 Feriepenge – timelønnede, saldo ÅTD', sourceLabel: 'Fra bogføringen / T-konto', group: 'Feriepenge – timelønnede' },
      { field: 'holidayPayGrossYtd', label: 'Bruttoferiepenge ÅTD', sourceLabel: 'Fra lønsystemets tælleværker', group: 'Feriepenge – timelønnede' },
    ],
  },
  {
    sectionId: 'D',
    title: 'Intern kontrol af samlede lønrelaterede omkostninger',
    relationship: 'Beregnes ud fra driftskontiene: 2210, 2211, 2215, 2223, 2230 og 2235.',
    fields: [
      { field: 'operatingTotal', label: 'Samlede lønrelaterede omkostninger ÅTD', sourceLabel: 'Beregnet' },
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
