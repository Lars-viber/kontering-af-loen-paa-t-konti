import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  presentV2WorkspaceProgress,
  presentV2WorkspaceReconciliation,
  selectV2WorkspaceDocument,
  selectV2WorkspaceDocumentFields,
  selectV2WorkspaceDocumentTallies,
} from '../../src/level2/v2/workspace';
import {
  completeV2WorkspaceSection,
  v2CheckpointReviewState,
  v2CheckpointState,
  v2CompletedState,
  v2DocumentEntryAt,
  v2DocumentReviewAt,
  V2_WORKSPACE_CASE,
} from './v2-workspace-test-helpers';

function labels(state: ReturnType<typeof v2DocumentEntryAt>): string[] {
  return presentV2WorkspaceProgress(state).steps.map(step => step.label);
}

describe('V2.1 workspace presentation', () => {
  it('presents only B1-B9 and Afstemning across every phase', () => {
    const cases = [
      v2DocumentEntryAt(1),
      v2DocumentReviewAt(1),
      v2DocumentEntryAt(3),
      v2DocumentReviewAt(3),
      v2DocumentEntryAt(9),
      v2DocumentReviewAt(9),
      v2CheckpointState(),
      completeV2WorkspaceSection(
        completeV2WorkspaceSection(
          completeV2WorkspaceSection(
            completeV2WorkspaceSection(v2CheckpointState(), 'A'),
            'B',
          ),
          'C',
        ),
        'D',
      ),
      v2CheckpointReviewState(),
      v2CompletedState(),
    ];
    for (const state of cases) {
      const presentation = presentV2WorkspaceProgress(state);
      const text = JSON.stringify(presentation);
      expect(text).not.toMatch(/B1[0-3]/);
      expect(text).not.toContain('Slutkontrol');
      expect(presentation.steps.at(-1)?.label).toBe('Afstemning');
    }
    expect(presentV2WorkspaceProgress(v2DocumentEntryAt(3)).summary)
      .toBe('2 af 9 bilag gennemført · 7 tilbage');
    expect(presentV2WorkspaceProgress(v2DocumentReviewAt(3)).summary)
      .toBe('3 af 9 bilag gennemført · 6 tilbage');
    expect(labels(v2DocumentEntryAt(3))).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'Afstemning']);
    expect(labels(v2DocumentReviewAt(9))).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'Afstemning']);
    expect(presentV2WorkspaceProgress(v2DocumentEntryAt(3)).steps[2].status).toBe('active');
    expect(presentV2WorkspaceProgress(v2DocumentReviewAt(3)).steps[2].status).toBe('active');
  });

  it('keeps the original B1-B3 and B9 document fields unchanged', () => {
    for (const documentId of ['B1', 'B2', 'B3', 'B9'] as const) {
      expect(selectV2WorkspaceDocumentFields(V2_WORKSPACE_CASE.source, documentId))
        .toBe(selectV2WorkspaceDocument(V2_WORKSPACE_CASE.source, documentId).fields);
    }
  });

  it('maps the exact visible B4-B8 source tallies and hides a direct B9 adjustment', () => {
    const expectedCounts = { B4: 3, B5: 2, B6: 1, B7: 3, B8: 2 } as const;
    for (const [documentId, count] of Object.entries(expectedCounts)) {
      expect(selectV2WorkspaceDocumentTallies(
        V2_WORKSPACE_CASE.source,
        documentId as keyof typeof expectedCounts,
      )).toHaveLength(count);
    }
    expect(selectV2WorkspaceDocumentTallies(V2_WORKSPACE_CASE.source, 'B9')).toEqual([]);
    const b9 = V2_WORKSPACE_CASE.source.documentSources.find(document => document.id === 'B9');
    expect(b9?.fields.map(field => field.id)).toEqual([
      'holiday-liability-before-adjustment',
      'holiday-liability-system-assessed',
    ]);
  });

  it.each(['A', 'B', 'C', 'D', 'E'] as const)(
    'derives correct section %s reconciliation solely from student state and source',
    sectionId => {
      const state = completeV2WorkspaceSection(v2CheckpointState(), sectionId);
      const rows = presentV2WorkspaceReconciliation(V2_WORKSPACE_CASE.source, state, sectionId);
      expect(rows.length).toBe(sectionId === 'C' ? 3 : sectionId === 'D' ? 0 : sectionId === 'E' ? 6 : 1);
      expect(rows.every(row => row.difference === 0 && row.matches)).toBe(true);
    },
  );

  it('keeps the workspace source free from grading, persistence, generation and retired phases', () => {
    const folder = 'src/level2/v2/workspace';
    const source = readdirSync(folder)
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .map(file => readFileSync(folder + '/' + file, 'utf8'))
      .join('\n');
    for (const forbidden of [
      'answers',
      'expectedPostings',
      'r1Answers',
      'answerKey',
      'expectedCheckpoint',
      'generateV2Case',
      'localStorage',
      'sessionStorage',
      'Math.random',
      'finalControl',
      'B10',
      'B11',
      'B12',
      'B13',
      'Slutkontrol',
    ]) expect(source).not.toContain(forbidden);
    expect(source).not.toMatch(/useEffect\s*\(/);
    const appSource = readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain("from './level2/v2/workspace'");
    expect(appSource).not.toContain("from './level2/workspace'");
  });

  it('keeps independent desktop checkpoint scrolling and natural stacked mobile scrolling', () => {
    const css = readFileSync('src/level2/v2/workspace/workspace.css', 'utf8');
    expect(css).toMatch(/@media \(min-width: 1100px\)[\s\S]*\.l2v2-root-checkpoint[\s\S]*height: 100dvh/);
    expect(css).toMatch(/\.l2v2-checkpoint-grid,[\s\S]*#l2v2-checkpoint-reference[\s\S]*overflow-y: auto/);
    expect(css).toMatch(/\.l2v2-checkpoint-grid,[\s\S]*#l2v2-checkpoint-reference[\s\S]*min-height: 0/);
    expect(css).toMatch(/\.l2v2-checkpoint-grid,[\s\S]*#l2v2-checkpoint-reference[\s\S]*overflow-x: hidden/);
    expect(css).toMatch(/@media \(max-width: 1099px\)[\s\S]*\.l2v2-checkpoint-layout \{ grid-template-columns: minmax\(0, 1fr\); \}/);
    expect(css).toMatch(/@media \(max-width: 1099px\)[\s\S]*\.l2v2-checkpoint-reference \{ position: static; max-height: none; \}/);
    expect(css).toMatch(/\.l2v2-gross-pair,[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.l2v2-c-main-groups[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 899px\)[\s\S]*\.l2v2-gross-pair,[\s\S]*\.l2v2-c-main-groups,[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  });});
