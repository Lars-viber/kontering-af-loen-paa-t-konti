import { LEVEL2_ACCOUNTS } from './accounts';
import { balancesOf, buildLevel2Case, LEVEL2_MONTHS } from './caseBuilder';
import { deepFreezeLevel2 } from './readonly';
import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from './ruleset';
import type {
  HourlyEmployeeReference,
  SalariedEmployeeReference,
} from './types';

export const R1_MONTHS = LEVEL2_MONTHS;

export const R1_HOURLY_EMPLOYEES = Object.freeze([
  Object.freeze({ id: 'T1', hourlyRate: 240, taxRate: 36, monthlyDeduction: 4500, hours: Object.freeze({ jan: 145, feb: 148, mar: 152, apr: 154, may: 156, jun: 155 }) }),
  Object.freeze({ id: 'T2', hourlyRate: 240, taxRate: 37, monthlyDeduction: 4750, hours: Object.freeze({ jan: 155, feb: 160, mar: 163, apr: 162, may: 164, jun: 165 }) }),
  Object.freeze({ id: 'T3', hourlyRate: 230, taxRate: 38, monthlyDeduction: 5000, hours: Object.freeze({ jan: 172, feb: 174, mar: 176, apr: 178, may: 177, jun: 180 }) }),
  Object.freeze({ id: 'T4', hourlyRate: 250, taxRate: 39, monthlyDeduction: 5250, hours: Object.freeze({ jan: 172, feb: 170, mar: 176, apr: 174, may: 178, jun: 180 }) }),
] as const satisfies readonly HourlyEmployeeReference[]);

export const R1_SALARIED_EMPLOYEES = Object.freeze([
  Object.freeze({ id: 'M1', monthlySalary: 42000, taxRate: 37, monthlyDeduction: 5000 }),
  Object.freeze({ id: 'M2', monthlySalary: 47500, taxRate: 38, monthlyDeduction: 5250 }),
  Object.freeze({ id: 'M3', monthlySalary: 52500, taxRate: 39, monthlyDeduction: 5500 }),
  Object.freeze({ id: 'M4', monthlySalary: 60500, taxRate: 40, monthlyDeduction: 5750 }),
] as const satisfies readonly SalariedEmployeeReference[]);

export const R1_HOLIDAY_LIABILITY = Object.freeze({
  holidayLiabilityBeforeAdjustment: 174000,
  systemAssessedHolidayLiability: 182500,
  adjustment: 8500,
});

const R1_CASE = buildLevel2Case({
  hourlyEmployees: R1_HOURLY_EMPLOYEES,
  salariedEmployees: R1_SALARIED_EMPLOYEES,
  holidayLiabilityBeforeAdjustment: R1_HOLIDAY_LIABILITY.holidayLiabilityBeforeAdjustment,
  holidayLiabilityAdjustmentYtdMay: 24000,
  juneHolidayLiabilityAdjustment: R1_HOLIDAY_LIABILITY.adjustment,
  bankStartBalance: 1500000,
});

export const R1_HISTORY = R1_CASE.history;
export const R1_ATP = R1_CASE.atp;
export const R1_START_BALANCES = R1_CASE.startBalances;
export const R1_JUNE_DOCUMENTS = R1_CASE.juneDocuments;
export const R1_CHECKPOINT_LEDGER = R1_CASE.checkpointLedger;
export const R1_YTD_SPECIFICATION = R1_CASE.ytdSpecification;
export const R1_CHECKPOINT = R1_CASE.checkpoint;
export const R1_JULY_DOCUMENTS = R1_CASE.julyDocuments;
export const R1_DOCUMENTS = R1_CASE.documents;
export const R1_FINAL_LEDGER = R1_CASE.finalLedger;

export const REFERENCE_R1_FIXTURE = deepFreezeLevel2({
  rulesetYear: LEVEL2_RULESET_YEAR,
  rulesetVersion: LEVEL2_RULESET_VERSION,
  generatorVersion: LEVEL2_GENERATOR_VERSION,
  accounts: LEVEL2_ACCOUNTS,
  hourlyEmployees: R1_HOURLY_EMPLOYEES,
  salariedEmployees: R1_SALARIED_EMPLOYEES,
  history: R1_MONTHS.map(month => R1_HISTORY[month]),
  holidayLiability: R1_HOLIDAY_LIABILITY,
  atp: R1_ATP,
  startBalances: R1_START_BALANCES,
  documents: R1_DOCUMENTS,
  checkpointBalances: balancesOf(R1_CHECKPOINT_LEDGER),
  ytdSpecification: R1_YTD_SPECIFICATION,
  checkpoint: R1_CHECKPOINT,
  finalBalances: balancesOf(R1_FINAL_LEDGER),
});
