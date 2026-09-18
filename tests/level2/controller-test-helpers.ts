import type { Level2Storage } from '../../src/level2/session';

export const LEVEL1_STORAGE_KEY = 'kontering-af-loen-paa-t-konti.session.v1';

export class ControllerStorage implements Level2Storage {
  readonly data = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];
  failGet = false;
  failSet = false;
  failRemove = false;

  getItem(key: string): string | null {
    this.reads.push(key);
    if (this.failGet) throw new Error('read failure');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    if (this.failSet) throw new Error('write failure');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    if (this.failRemove) throw new Error('remove failure');
    this.data.delete(key);
  }
}
