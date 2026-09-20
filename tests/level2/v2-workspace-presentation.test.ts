import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  presentV2WorkspaceProgress,
  presentV2WorkspaceReconciliation,
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
    expect(labels(v2DocumentEntryAt(3))).toEqual(['B1–B2', 'B3', 'B4–B9', 'Afstemning']);
    expect(labels(v2DocumentReviewAt(9))).toEqual(['B1–B9', 'Afstemning']);
    expect(presentV2WorkspaceProgress(v2DocumentEntryAt(3)).steps[1].status).toBe('active');
    expect(presentV2WorkspaceProgress(v2DocumentReviewAt(3)).steps.some(step => step.status === 'active')).toBe(false);
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
      expect(rows.length).toBe(sectionId === 'C' ? 4 : sectionId === 'E' ? 6 : 1);
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
    expect(readFileSync('src/App.tsx', 'utf8')).not.toContain('level2/v2/workspace');
  });
});
