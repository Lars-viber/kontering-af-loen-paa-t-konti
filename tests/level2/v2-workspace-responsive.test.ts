import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2.1 workspace responsive CSS contract', () => {
  const css = readFileSync('src/level2/v2/workspace/workspace.css', 'utf8');

  it('keeps every selector scoped to the isolated l2v2 namespace', () => {
    const selectors = css.split('{').slice(0, -1).map(block => block.split('}').at(-1)?.trim() ?? '')
      .filter(selector => selector !== '' && !selector.startsWith('@'));
    expect(selectors.every(selector => selector.split(',').every(part => part.trim().startsWith('.l2v2-'))))
      .toBe(true);
  });

  it('locks the 1366 desktop document contract to sticky panel and three account columns', () => {
    expect(css).toContain('grid-template-columns: minmax(15.5rem, 18rem) minmax(0, 1fr)');
    expect(css).toContain('.l2v2-document-panel {\n  position: sticky');
    expect(css).toContain('.l2v2-account-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(css).toContain('min-height: 11.6rem');
    expect(css).toContain('overflow-x: clip');
  });

  it('defines 1/2/3/4 account columns and inline/split checkpoint breakpoints', () => {
    expect(css).toContain('@media (min-width: 1700px)');
    expect(css).toContain('repeat(4, minmax(0, 1fr))');
    expect(css).toContain('@media (min-width: 900px) and (max-width: 1279px)');
    expect(css).toContain('repeat(2, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 899px)');
    expect(css).toContain('@media (max-width: 1099px)');
    expect(css).toContain('.l2v2-checkpoint-reference { position: static; max-height: none; }');
    expect(css).toContain('position: sticky');
    expect(css).toContain('max-height: calc(100vh - 1rem)');
  });
});
