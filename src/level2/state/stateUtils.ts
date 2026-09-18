import { deepFreezeLevel2 } from '../../domain/level2';
import type { Level2StudentState } from './types';

export function freezeStudentState(state: Level2StudentState): Level2StudentState {
  return deepFreezeLevel2(state) as Level2StudentState;
}
