import {
  generateV2Case,
  isValidV2Variant,
} from '../../../domain/level2/v2';
import { createInitialV2StudentState } from '../state';
import type {
  V2ControllerCaseFactory,
  V2ControllerCurrentSession,
} from './types';

export type V2NewRuntimeResult =
  | {
    readonly ok: true;
    readonly runtime: Pick<V2ControllerCurrentSession, 'variant' | 'caseSnapshot' | 'studentState'>;
  }
  | { readonly ok: false; readonly reason: 'invalidVariant' };

export function createNewV2ControllerRuntime(
  variant: number,
  caseFactory: V2ControllerCaseFactory = generateV2Case,
): V2NewRuntimeResult {
  if (!isValidV2Variant(variant)) return { ok: false, reason: 'invalidVariant' };
  const caseSnapshot = caseFactory(variant);
  return {
    ok: true,
    runtime: {
      variant,
      caseSnapshot,
      studentState: createInitialV2StudentState(),
    },
  };
}
