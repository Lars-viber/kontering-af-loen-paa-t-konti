import type { EmployeeInput, PayrollEmployee, PayslipTotals } from './types';

export const ATP_PER_EMPLOYEE = 99 as const;

export function calculateEmployee(input: EmployeeInput): PayrollEmployee {
  const pension = Math.round((input.grossSalary * input.pensionRate / 100) / 25) * 25;
  const amBase = input.grossSalary - ATP_PER_EMPLOYEE - pension;
  const amContribution = Math.round(amBase * 8 / 100);
  const aTax = Math.round((amBase - amContribution - input.deduction) * input.taxRate / 100);
  const netPay = amBase - amContribution - aTax;
  return { ...input, atp: ATP_PER_EMPLOYEE, pension, amBase, amContribution, aTax, netPay };
}

export function sumEmployees(employees: readonly PayrollEmployee[]): PayslipTotals {
  const total = (key: keyof PayrollEmployee): number => employees.reduce((sum, employee) => sum + employee[key], 0);
  const grossSalary = total('grossSalary');
  const atp = total('atp');
  const pension = total('pension');
  const amContribution = total('amContribution');
  const aTax = total('aTax');
  const amBase = grossSalary - atp - pension;
  const netPay = amBase - amContribution - aTax;
  return { grossSalary, atp, pension, amBase, amContribution, aTax, netPay };
}