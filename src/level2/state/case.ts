import type { Level2StateCase, Level2StateCaseData } from './types';

export function getLevel2CaseData(source: Level2StateCase): Level2StateCaseData {
  return 'derived' in source ? source.derived : source;
}
