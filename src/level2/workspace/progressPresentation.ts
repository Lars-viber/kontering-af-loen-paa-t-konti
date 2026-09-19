import type { Level2StudentState } from '../state';

export type Level2ProgressStatus = 'completed' | 'active' | 'upcoming';

export interface Level2ProgressStep {
  readonly label: string;
  readonly status: Level2ProgressStatus;
}

export interface Level2ProgressPresentation {
  readonly completedDocuments: number;
  readonly remainingDocuments: number;
  readonly summary: string;
  readonly steps: readonly Level2ProgressStep[];
}

const documentLabel = (from: number, to = from) => from === to ? `B${from}` : `B${from}–B${to}`;
const step = (label: string, status: Level2ProgressStatus): Level2ProgressStep => ({ label, status });

function completedDocumentSteps(from: number, to: number): Level2ProgressStep[] {
  if (to < from) return [];
  if (to - from < 2) return Array.from({ length: to - from + 1 }, (_, index) =>
    step(documentLabel(from + index), 'completed'));
  return [step(documentLabel(from, to), 'completed')];
}

export function presentLevel2Progress(state: Level2StudentState): Level2ProgressPresentation {
  const completedDocuments = state.documents.filter(document => document.status === 'completed').length;
  const remainingDocuments = 13 - completedDocuments;
  const summary = `${completedDocuments} af 13 bilag gennemført${remainingDocuments > 0 ? ` · ${remainingDocuments} tilbage` : ''}`;
  const steps: Level2ProgressStep[] = [];

  if (state.phase.kind === 'document') {
    const activeNumber = Number(state.phase.activeDocumentId.slice(1));
    if (activeNumber <= 9) {
      steps.push(...completedDocumentSteps(1, activeNumber - 1));
      steps.push(step(documentLabel(activeNumber), 'active'));
      if (activeNumber < 9) steps.push(step(documentLabel(activeNumber + 1, 9), 'upcoming'));
      steps.push(step('Checkpoint', 'upcoming'), step('B10–B13', 'upcoming'), step('Slutkontrol', 'upcoming'));
    } else {
      steps.push(step('B1–B9', 'completed'), step('Checkpoint', 'completed'));
      steps.push(...completedDocumentSteps(10, activeNumber - 1));
      steps.push(step(documentLabel(activeNumber), 'active'));
      if (activeNumber < 13) steps.push(step(documentLabel(activeNumber + 1, 13), 'upcoming'));
      steps.push(step('Slutkontrol', 'upcoming'));
    }
  } else if (state.phase.kind === 'checkpoint') {
    steps.push(step('B1–B9', 'completed'), step('Checkpoint', 'active'), step('B10–B13', 'upcoming'), step('Slutkontrol', 'upcoming'));
  } else if (state.phase.kind === 'finalControl') {
    steps.push(step('B1–B13', 'completed'), step('Checkpoint', 'completed'), step('Slutkontrol', 'active'));
  } else {
    steps.push(step('B1–B13', 'completed'), step('Checkpoint', 'completed'), step('Slutkontrol', 'completed'));
  }

  return { completedDocuments, remainingDocuments, summary, steps };
}
