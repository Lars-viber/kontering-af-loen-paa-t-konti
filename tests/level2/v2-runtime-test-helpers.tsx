import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App } from '../../src/App';
import { generateV2Case } from '../../src/domain/level2/v2';
import type { V2ControllerCaseFactory } from '../../src/level2/v2/controller';
import type { V2Storage } from '../../src/level2/v2/session';
import type { StorageLike } from '../../src/session';

export class V2RuntimeStorage implements V2Storage, StorageLike {
  readonly data = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];
  readonly failGetKeys = new Set<string>();
  readonly failSetKeys = new Set<string>();

  getItem(key: string): string | null {
    this.reads.push(key);
    if (this.failGetKeys.has(key)) throw new Error('SecurityError');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    if (this.failSetKeys.has(key)) throw new Error('QuotaExceededError');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.data.delete(key);
  }
}

export const v2RuntimeClock = () => '2026-09-20T18:00:00.000Z';

export function renderV2Runtime(
  storage = new V2RuntimeStorage(),
  caseFactory = vi.fn(generateV2Case) as unknown as V2ControllerCaseFactory,
  randomUint32: () => number = () => 999998,
) {
  const view = render(<App
    storage={storage}
    level2Storage={storage}
    clock={v2RuntimeClock}
    level2Clock={v2RuntimeClock}
    level2RandomUint32={randomUint32}
    level2Generator={caseFactory}
  />);
  return { storage, caseFactory, view };
}

export async function openV2Setup(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /Niveau 2-opgave/ }));
}

export async function startSpecificV2(variant: number): Promise<void> {
  await openV2Setup();
  await userEvent.type(screen.getByLabelText('Variant'), String(variant));
  await userEvent.click(screen.getByRole('button', { name: 'Start opgave' }));
}

export async function continueV2(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Fortsæt Niveau 2' }));
}

export async function goV2Home(): Promise<void> {
  await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Til forsiden' }));
}
