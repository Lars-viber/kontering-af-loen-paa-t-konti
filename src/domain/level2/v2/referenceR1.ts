import { deepFreezeLevel2 } from '../readonly';
import { R1_V2_ANSWER_KEY } from './r1Answers';
import { R1_V2_SOURCE } from './r1Source';
import { assertV2Contract } from './validation';

assertV2Contract(R1_V2_SOURCE, R1_V2_ANSWER_KEY);

export const REFERENCE_R1_V2 = deepFreezeLevel2({
  source: R1_V2_SOURCE,
  answerKey: R1_V2_ANSWER_KEY,
});
