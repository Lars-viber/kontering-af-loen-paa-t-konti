import {
  LEVEL2_GENERATOR_VERSION,
  LEVEL2_RULESET_VERSION,
  LEVEL2_RULESET_YEAR,
} from '../../domain/level2/ruleset';
import { LEVEL2_SESSION_SCHEMA_VERSION } from './constants';
import { validateLevel2CaseSnapshot } from './caseValidation';
import { validateLevel2StudentState } from './studentStateValidation';
import type { Level2PersistedSession, Level2SessionDecodeResult } from './types';
import { hasExactKeys, isPlainRecord, isSafeWhole } from './validationUtils';

const TOP_LEVEL_KEYS = [
  'schemaVersion', 'rulesetYear', 'rulesetVersion', 'generatorVersion',
  'variant', 'caseSnapshot', 'studentState', 'savedAt',
] as const;

export function isValidUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return false;
  const milliseconds = (match[7] ?? '').padEnd(3, '0');
  const normalized = value.slice(0, match.index + 19) + '.' + milliseconds + 'Z';
  const time = Date.parse(normalized);
  return Number.isFinite(time) && new Date(time).toISOString() === normalized;
}

export function validateLevel2PersistedSession(value: unknown): Level2SessionDecodeResult {
  if (!isPlainRecord(value)) return { ok: false, reason: 'invalidTopLevelShape' };
  if (!Object.prototype.hasOwnProperty.call(value, 'schemaVersion')) return { ok: false, reason: 'invalidTopLevelShape' };
  if (value.schemaVersion !== LEVEL2_SESSION_SCHEMA_VERSION) return { ok: false, reason: 'unsupportedSchemaVersion' };
  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) return { ok: false, reason: 'invalidTopLevelShape' };
  if (value.rulesetYear !== LEVEL2_RULESET_YEAR) return { ok: false, reason: 'unsupportedRulesetYear' };
  if (value.rulesetVersion !== LEVEL2_RULESET_VERSION) return { ok: false, reason: 'unsupportedRulesetVersion' };
  if (value.generatorVersion !== LEVEL2_GENERATOR_VERSION) return { ok: false, reason: 'unsupportedGeneratorVersion' };
  if (!isSafeWhole(value.variant, 1) || value.variant > 999999) return { ok: false, reason: 'invalidVariant' };
  if (!isValidUtcTimestamp(value.savedAt)) return { ok: false, reason: 'invalidSavedAt' };

  const caseResult = validateLevel2CaseSnapshot(value.caseSnapshot);
  if (!caseResult.ok) return { ok: false, reason: 'invalidCaseSnapshot' };
  if (caseResult.value.variant !== value.variant ||
    caseResult.value.rulesetYear !== value.rulesetYear ||
    caseResult.value.rulesetVersion !== value.rulesetVersion ||
    caseResult.value.generatorVersion !== value.generatorVersion) {
    return { ok: false, reason: 'sessionSnapshotMismatch' };
  }
  const stateResult = validateLevel2StudentState(value.studentState, caseResult.value);
  if (!stateResult.ok) return { ok: false, reason: 'invalidStudentState' };

  return { ok: true, value: value as unknown as Level2PersistedSession };
}

