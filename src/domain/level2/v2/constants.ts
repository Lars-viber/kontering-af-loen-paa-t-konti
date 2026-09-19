import type { V2DocumentId, V2VersionIdentity } from './types';

export const V2_RULESET_YEAR = 2026 as const;
export const V2_RULESET_VERSION = 2 as const;
export const V2_GENERATOR_VERSION = 2 as const;

export const V2_VERSION_IDENTITY: V2VersionIdentity = Object.freeze({
  rulesetYear: V2_RULESET_YEAR,
  rulesetVersion: V2_RULESET_VERSION,
  generatorVersion: V2_GENERATOR_VERSION,
});

export const V2_RATES = Object.freeze({
  employeePensionPercent: 4,
  employerPensionPercent: 8,
  employeeAtp: 99,
  employerAtp: 198,
  totalAtp: 297,
  amPercent: 8,
  holidayPayPercent: 12.5,
} as const);

export const V2_DOCUMENT_TITLES = Object.freeze({
  B1: 'Betaling af A-skat og AM-bidrag vedr. maj',
  B2: 'Betaling af pension vedr. maj',
  B3: 'Betaling til FerieKonto vedr. maj',
  B4: 'Lønkørsel – timelønnede – juni',
  B5: 'Arbejdsgiverbidrag – timelønnede – juni',
  B6: 'Feriepenge – timelønnede – juni',
  B7: 'Lønkørsel – månedslønnede – juni',
  B8: 'Arbejdsgiverbidrag – månedslønnede – juni',
  B9: 'Regulering af feriepengeforpligtelse pr. 30/6',
} as const satisfies Readonly<Record<V2DocumentId, string>>);

export const V2_MONTHS = Object.freeze(['jan', 'feb', 'mar', 'apr', 'may', 'jun'] as const);
