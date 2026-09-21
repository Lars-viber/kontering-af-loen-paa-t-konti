import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { generateV2Case } from '../../src/domain/level2/v2';
import {
  browserV2ControllerUint32,
  randomV2ControllerVariant,
  startRandomV2ControllerSession,
} from '../../src/level2/v2/controller';
import { V2ControllerStorage, sequenceClock, startedCurrent } from './v2-controller-test-helpers';

describe('V2.1 secure random controller start', () => {
  it('maps both endpoints without modulo bias', () => {
    expect(randomV2ControllerVariant(() => 0)).toBe(1);
    expect(randomV2ControllerVariant(() => 999998)).toBe(999999);
  });

  it('rejects the incomplete uint32 tail before applying modulo', () => {
    const limit = Math.floor(0x100000000 / 999999) * 999999;
    const draws = [limit, 0xffffffff, 999998];
    let index = 0;
    expect(randomV2ControllerVariant(() => draws[index++])).toBe(999999);
    expect(index).toBe(3);
  });

  it.each([-1, 1.5, 0x100000000, Number.NaN])('rejects invalid uint32 %s', value => {
    expect(() => randomV2ControllerVariant(() => value)).toThrow(RangeError);
  });

  it('draws until accepted and calls the generator exactly once afterwards', () => {
    const storage = new V2ControllerStorage();
    const limit = Math.floor(0x100000000 / 999999) * 999999;
    const random = vi.fn()
      .mockReturnValueOnce(limit)
      .mockReturnValueOnce(41);
    const factory = vi.fn(generateV2Case);
    const current = startedCurrent(
      startRandomV2ControllerSession(storage, sequenceClock(), random, factory),
    );
    expect(random).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith(42);
    expect(current.variant).toBe(42);
    expect(storage.writes).toHaveLength(1);
  });

  it('returns typed failure with no generation or write when the secure source throws', () => {
    const storage = new V2ControllerStorage();
    const factory = vi.fn(generateV2Case);
    expect(startRandomV2ControllerSession(
      storage,
      sequenceClock(),
      () => { throw new Error('crypto unavailable'); },
      factory,
    )).toEqual({ ok: false, reason: 'randomFailure' });
    expect(factory).not.toHaveBeenCalled();
    expect(storage.writes).toEqual([]);
  });

  it('uses crypto.getRandomValues in the production uint32 source', () => {
    const original = globalThis.crypto;
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 41;
      return values;
    });
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } });
    expect(browserV2ControllerUint32()).toBe(41);
    expect(getRandomValues).toHaveBeenCalledOnce();
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original });
  });

  it('keeps generation in newSession, excludes Math.random and leaves active runtime disconnected', () => {
    const folder = 'src/level2/v2/controller';
    const sources = readdirSync(folder)
      .filter(file => file.endsWith('.ts'))
      .map(file => ({ file, source: readFileSync(folder + '/' + file, 'utf8') }));
    expect(sources.filter(item => item.source.includes('generateV2Case')).map(item => item.file))
      .toEqual(['newSession.ts']);
    expect(sources.some(item => item.source.includes('Math.random'))).toBe(false);
    const appSource = readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain("from './level2/v2/controller'");
    expect(appSource).not.toContain("from './level2/controller'");
  });});
