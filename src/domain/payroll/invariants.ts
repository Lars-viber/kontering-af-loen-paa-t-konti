import { ACCOUNT_IDS, ACCOUNTS } from './accounts';
import { calculateEmployee, sumEmployees } from './calculations';
import { buildAnswerKey } from './solve';
import type { Answer, ExerciseSnapshot, PayrollEmployee } from './types';

export function isValidVariant(variant: number): boolean {
  return Number.isInteger(variant) && variant >= 1 && variant <= 999999;
}

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error('Payroll invariant failed: ' + message);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validGeneratedGross(gross: number): boolean {
  if (!Number.isInteger(gross) || gross < 28000 || gross > 72475) return false;
  const remainder = gross % 1000;
  return remainder >= 0 && remainder <= 475 && remainder % 25 === 0;
}

function validateEmployee(employee: PayrollEmployee, index: number): void {
  const prefix = 'employee ' + index + ': ';
  invariant(validGeneratedGross(employee.grossSalary), prefix + 'grossSalary');
  invariant(employee.atp === 99, prefix + 'ATP');
  invariant(([4, 5, 6, 8, 10] as number[]).includes(employee.pensionRate), prefix + 'pensionRate');
  invariant(Number.isInteger(employee.pension) && employee.pension >= 0 && employee.pension % 25 === 0, prefix + 'pension');
  invariant(Number.isInteger(employee.taxRate) && employee.taxRate >= 36 && employee.taxRate <= 42, prefix + 'taxRate');
  invariant(Number.isInteger(employee.deduction) && employee.deduction >= 4000 && employee.deduction <= 6000 && (employee.deduction - 4000) % 250 === 0, prefix + 'deduction');
  const expected = calculateEmployee(employee);
  invariant(sameJson(employee, expected), prefix + 'derived payroll values');
  for (const key of ['grossSalary', 'atp', 'pension', 'amBase', 'amContribution', 'aTax', 'netPay'] as const) {
    invariant(Number.isInteger(employee[key]), prefix + key + ' integer');
  }
  invariant(employee.aTax >= 0, prefix + 'negative A-tax');
  invariant(employee.netPay >= 0, prefix + 'negative net pay');
}

function postingTotals(answer: Answer): { debit: number; credit: number } {
  return ACCOUNT_IDS.reduce((sum, id) => ({ debit: sum.debit + answer[id].debit, credit: sum.credit + answer[id].credit }), { debit: 0, credit: 0 });
}

export function validateSnapshot(snapshot: ExerciseSnapshot): void {
  invariant(snapshot.generatorVersion === 1, 'generatorVersion');
  invariant(isValidVariant(snapshot.variant), 'variant');
  invariant(snapshot.employeeCount === snapshot.employees.length, 'employeeCount mismatch');
  invariant(snapshot.employeeCount >= 3 && snapshot.employeeCount <= 10, 'employeeCount range');
  snapshot.employees.forEach(validateEmployee);
  invariant(sameJson(snapshot.payslipTotals, sumEmployees(snapshot.employees)), 'totals mismatch');
  invariant(sameJson(snapshot.accounts, ACCOUNTS), 'accounts mismatch');
  invariant(Object.keys(snapshot.answerKey).length === 8, 'answer account count');
  invariant(ACCOUNT_IDS.every(id => Object.hasOwn(snapshot.answerKey, id)), 'missing answer account');
  invariant(Object.keys(snapshot.answerKey).every(id => (ACCOUNT_IDS as readonly string[]).includes(id)), 'unknown answer account');
  invariant(sameJson(snapshot.answerKey, buildAnswerKey(snapshot.payslipTotals)), 'answer key mismatch');
  for (const id of ACCOUNT_IDS) {
    invariant(Number.isInteger(snapshot.answerKey[id].debit) && snapshot.answerKey[id].debit >= 0, id + ' debit');
    invariant(Number.isInteger(snapshot.answerKey[id].credit) && snapshot.answerKey[id].credit >= 0, id + ' credit');
  }
  const postings = postingTotals(snapshot.answerKey);
  invariant(postings.debit === postings.credit, 'debit/credit mismatch');
  invariant(postings.debit === snapshot.payslipTotals.grossSalary, 'debit not gross salary');
}