import { useState } from 'react';
import { isValidVariant, type AccountId, type EntrySide } from './domain/payroll';
import {
  addV2ControllerPostingRow,
  advanceV2ControllerDocumentReview,
  browserV2ControllerUint32,
  checkV2ControllerCheckpointSection,
  checkV2ControllerCurrentDocument,
  completeV2ControllerLevel,
  editV2ControllerCheckpointAmount,
  editV2ControllerCheckpointBalance,
  editV2ControllerPostingRow,
  loadCurrentV2ControllerSession,
  parseV2ControllerVariantInput,
  removeV2ControllerPostingRow,
  resetV2ControllerSession,
  retryV2ControllerSave,
  startNewV2ControllerSession,
  startRandomV2ControllerSession,
  type V2ControllerCaseFactory,
  type V2ControllerClock,
  type V2ControllerCurrentSession,
  type V2ControllerLoadResult,
  type V2ControllerUint32Source,
} from './level2/v2/controller';
import { browserV2Storage } from './level2/v2/runtime';
import type { V2Storage } from './level2/v2/session';
import { Level2V2Workspace, type Level2V2WorkspaceActions } from './level2/v2/workspace';
import {
  clearSession,
  createSessionFromVariant,
  loadSession,
  pickRandomVariant,
  saveSession,
  updateAndSaveStudentField,
  type ExerciseGenerator,
  type PayrollSession,
  type SessionLoadResult,
  type StorageLike,
} from './session';
import { checkAndSaveSession, resetAndSaveSession } from './session/exercise';
import { CompletedView } from './ui/completed';
import { Dialog } from './ui/Dialog';
import { ExerciseView } from './ui/exercise';

type AppMode = 'home' | 'level1' | 'level2';
type Level1View = 'menu' | 'exercise' | 'completed';
type Level1Pending = { variant: number } | null;
type Level2PendingStart =
  | { readonly kind: 'variant'; readonly variant: number }
  | { readonly kind: 'random' }
  | null;

export interface AppProps {
  storage?: StorageLike;
  clock?: () => string;
  randomUint32?: () => number;
  generator?: ExerciseGenerator;
  level2Storage?: V2Storage;
  level2Clock?: V2ControllerClock;
  level2RandomUint32?: V2ControllerUint32Source;
  level2Generator?: V2ControllerCaseFactory;
}

const browserStorage: StorageLike = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
};

const saveFailure = 'Ændringen kunne ikke gemmes lokalt.';

function level2PhaseLabel(current: V2ControllerCurrentSession): string {
  const phase = current.studentState.phase;
  if (phase === 'documentEntry' || phase === 'documentReview') {
    return 'Bilag ' + current.studentState.currentDocumentId;
  }
  if (phase === 'checkpoint' || phase === 'checkpointReview') return 'Afstemning';
  return 'Færdig';
}

export function App({
  storage = browserStorage,
  clock = () => new Date().toISOString(),
  randomUint32,
  generator,
  level2Storage = browserV2Storage,
  level2Clock,
  level2RandomUint32 = browserV2ControllerUint32,
  level2Generator,
}: AppProps) {
  const activeLevel2Storage = level2Storage;
  const activeLevel2Clock = level2Clock ?? clock;

  const [initial] = useState<SessionLoadResult>(() => loadSession(storage));
  const [session, setSession] = useState<PayrollSession | null>(initial.kind === 'valid' ? initial.session : null);
  const [loadProblem, setLoadProblem] = useState(initial.kind === 'invalid' ? initial.message : '');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<AppMode>('home');
  const [level1View, setLevel1View] = useState<Level1View>('menu');
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantInput, setVariantInput] = useState('');
  const [variantError, setVariantError] = useState('');
  const [pending, setPending] = useState<Level1Pending>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const [level2, setLevel2] = useState<V2ControllerLoadResult>(() => loadCurrentV2ControllerSession(activeLevel2Storage));
  const [level2SetupOpen, setLevel2SetupOpen] = useState(false);
  const [level2VariantInput, setLevel2VariantInput] = useState('');
  const [level2VariantError, setLevel2VariantError] = useState('');
  const [pendingLevel2Start, setPendingLevel2Start] = useState<Level2PendingStart>(null);
  const [level2ResetOpen, setLevel2ResetOpen] = useState(false);

  const start = (variant: number) => {
    const next = createSessionFromVariant(variant, clock, generator);
    const saved = saveSession(storage, next);
    setSession(next);
    setLoadProblem('');
    setNotice(saved.ok ? '' : saved.message);
    setPending(null);
    setVariantOpen(false);
    setResetOpen(false);
    setLevel1View('exercise');
    setMode('level1');
  };

  const requestStart = (variant: number) => {
    if (session && !session.completed) {
      setVariantOpen(false);
      setPending({ variant });
    } else start(variant);
  };

  const generate = () => requestStart(pickRandomVariant(session?.variant, randomUint32));

  const submitVariant = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(variantInput);
    if (variantInput.trim() === '' || !isValidVariant(parsed)) {
      setVariantError('Indtast et heltal fra 1 til 999999.');
      return;
    }
    setVariantError('');
    requestStart(parsed);
  };

  const removeInvalid = () => {
    const cleared = clearSession(storage);
    if (cleared.ok) {
      setLoadProblem('');
      setNotice('');
    } else setNotice(cleared.message);
  };

  const editField = (accountId: AccountId, side: EntrySide, rawInput: string) => {
    if (!session) return;
    const result = updateAndSaveStudentField(storage, session, accountId, side, rawInput, clock);
    setSession(result.session);
    setNotice(result.save.ok ? '' : saveFailure);
  };

  const check = () => {
    if (!session) return;
    const result = checkAndSaveSession(storage, session, clock);
    setSession(result.session);
    setNotice(result.save.ok ? '' : saveFailure);
  };

  const confirmReset = () => {
    if (!session || session.completed) {
      setResetOpen(false);
      return;
    }
    const result = resetAndSaveSession(storage, session, clock);
    setSession(result.session);
    setNotice(result.save.ok ? '' : saveFailure);
    setResetOpen(false);
  };

  const goHome = () => {
    setMode('home');
    setLevel1View('menu');
  };

  const openLevel1 = () => {
    setMode('level1');
    setLevel1View('menu');
  };

  const reloadLevel2 = () => {
    setLevel2(loadCurrentV2ControllerSession(activeLevel2Storage));
  };

  const openLevel2Setup = () => {
    setLevel2VariantInput('');
    setLevel2VariantError('');
    setLevel2SetupOpen(true);
  };

  const performLevel2Start = (request: Exclude<Level2PendingStart, null>) => {
    const result = request.kind === 'variant'
      ? startNewV2ControllerSession(
        activeLevel2Storage,
        request.variant,
        activeLevel2Clock,
        level2Generator,
      )
      : startRandomV2ControllerSession(
        activeLevel2Storage,
        activeLevel2Clock,
        level2RandomUint32,
        level2Generator,
      );
    if (!result.ok) {
      setLevel2VariantError(request.kind === 'random'
        ? 'En tilfældig variant kunne ikke vælges. Prøv igen.'
        : 'Indtast et heltal fra 1 til 999999.');
      return;
    }
    setLevel2({
      status: 'loaded',
      current: result.current,
      legacyV1Present: level2.legacyV1Present,
    });
    setLevel2SetupOpen(false);
    setPendingLevel2Start(null);
    setLevel2ResetOpen(false);
    setMode('level2');
  };

  const requestLevel2Start = (request: Exclude<Level2PendingStart, null>) => {
    if (level2.status === 'loaded') {
      setLevel2SetupOpen(false);
      setPendingLevel2Start(request);
      return;
    }
    performLevel2Start(request);
  };

  const submitLevel2Variant = (event: React.FormEvent) => {
    event.preventDefault();
    const variant = parseV2ControllerVariantInput(level2VariantInput);
    if (variant === null) {
      setLevel2VariantError('Indtast et heltal fra 1 til 999999.');
      return;
    }
    setLevel2VariantError('');
    requestLevel2Start({ kind: 'variant', variant });
  };

  const startRandomLevel2Variant = () => {
    setLevel2VariantError('');
    requestLevel2Start({ kind: 'random' });
  };

  const confirmLevel2Reset = () => {
    setLevel2(runtime => runtime.status === 'loaded'
      ? {
        ...runtime,
        current: resetV2ControllerSession(
          activeLevel2Storage,
          runtime.current,
          activeLevel2Clock,
        ),
      }
      : runtime);
    setLevel2ResetOpen(false);
  };

  const updateLevel2Current = (
    transition: (current: V2ControllerCurrentSession) => V2ControllerCurrentSession,
  ) => {
    setLevel2(runtime => runtime.status === 'loaded'
      ? { ...runtime, current: transition(runtime.current) }
      : runtime);
  };

  const level2Actions: Level2V2WorkspaceActions = {
    addPosting: (accountNumber, side, rawAmount, text) => updateLevel2Current(current =>
      addV2ControllerPostingRow(
        activeLevel2Storage, current, activeLevel2Clock, accountNumber, side, rawAmount, text,
      )),
    editPosting: (rowId, changes) => updateLevel2Current(current =>
      editV2ControllerPostingRow(activeLevel2Storage, current, activeLevel2Clock, rowId, changes)),
    removePosting: rowId => updateLevel2Current(current =>
      removeV2ControllerPostingRow(activeLevel2Storage, current, activeLevel2Clock, rowId)),
    checkDocument: () => updateLevel2Current(current =>
      checkV2ControllerCurrentDocument(activeLevel2Storage, current, activeLevel2Clock)),
    advanceDocument: () => updateLevel2Current(current =>
      advanceV2ControllerDocumentReview(activeLevel2Storage, current, activeLevel2Clock)),
    editCheckpointAmount: (sectionId, field, rawAmount) => updateLevel2Current(current =>
      editV2ControllerCheckpointAmount(
        activeLevel2Storage, current, activeLevel2Clock, sectionId, field, rawAmount,
      )),
    editCheckpointBalance: (accountNumber, changes) => updateLevel2Current(current =>
      editV2ControllerCheckpointBalance(
        activeLevel2Storage, current, activeLevel2Clock, accountNumber, changes,
      )),
    checkCheckpointSection: sectionId => updateLevel2Current(current =>
      checkV2ControllerCheckpointSection(
        activeLevel2Storage, current, activeLevel2Clock, sectionId,
      )),
    complete: () => updateLevel2Current(current =>
      completeV2ControllerLevel(activeLevel2Storage, current, activeLevel2Clock)),
    retrySave: () => updateLevel2Current(current =>
      retryV2ControllerSave(activeLevel2Storage, current, activeLevel2Clock)),
  };

  const level1SessionCard = session && (session.completed ? <section className="session-card completed-session-card">
    <div><p className="eyebrow">AFSLUTTET OPGAVE</p><h3>Variant {session.variant}</h3><p>{session.exerciseSnapshot.employeeCount} medarbejdere · Gennemført</p></div>
    <button className="primary" onClick={() => { setLevel1View('completed'); setMode('level1'); }}>Se afsluttet opgave</button>
  </section> : <section className="session-card">
    <div><p className="eyebrow">AKTIV OPGAVE</p><h3>Variant {session.variant}</h3><p>{session.exerciseSnapshot.employeeCount} medarbejdere · Senest gemt {new Date(session.savedAt).toLocaleString('da-DK')}</p></div>
    <button className="primary" onClick={() => { setLevel1View('exercise'); setMode('level1'); }}>Fortsæt opgaven</button>
  </section>);

  const level1Menu = <main className="menu">
    <section className="menu-intro">
      <p className="eyebrow">NIVEAU 1 · GRUNDLÆGGENDE LØNKONTERING</p>
      <h2>Træn kontering af et summeret lønbilag på T-konti.</h2>
      <p>Vælg en ny opgave eller åbn en bestemt variant.</p>
    </section>

    {loadProblem && <section className="problem" role="alert">
      <strong>Gemt opgave kunne ikke indlæses</strong>
      <p>{loadProblem}</p>
      <button onClick={removeInvalid}>Fjern gemt opgave</button>
    </section>}

    <div className="menu-grid">
      <section className="menu-card"><span aria-hidden="true">＋</span><h3>Ny opgave</h3><p>Få et nyt deterministisk lønbilag.</p><button className="primary" onClick={generate}>Generér ny opgave</button></section>
      <section className="menu-card"><span aria-hidden="true">#</span><h3>Samme tal hver gang</h3><p>Åbn en opgave med et variantnummer.</p><button onClick={() => { setVariantInput(''); setVariantError(''); setVariantOpen(true); }}>Bestemt variant</button></section>
    </div>
    {level1SessionCard}
    {mode === 'level1' && <div className="menu-footer-actions"><button onClick={goHome}>Til forsiden</button></div>}
  </main>;

  const level2HomeContent = level2.status === 'missing'
    ? level2.legacyV1Present
      ? <>
        <div className="level2-problem" role="status">
          <strong>Du har en gemt Niveau 2-opgave fra en tidligere version.</strong>
          <p>Niveau 2 er siden ændret til den nye juni-afstemningsmodel.</p>
        </div>
        <button className="primary" onClick={openLevel2Setup}>Start ny Niveau 2-opgave</button>
      </>
      : <>
        <p>Start en ny opgave, bogfør juni og afstem pr. 30/6.</p>
        <button className="primary" onClick={openLevel2Setup}>Ny Niveau 2-opgave</button>
      </>
    : level2.status === 'loaded' ? <>
      <p>Variant {level2.current.variant} · {level2PhaseLabel(level2.current)}</p>
      <div className="level-card-actions">
        <button className="primary" onClick={() => setMode('level2')}>Fortsæt Niveau 2</button>
        <button onClick={openLevel2Setup}>Ny Niveau 2-opgave</button>
      </div>
    </> : level2.status === 'invalid' ? <div className="level2-problem" role="alert">
      <strong>Den gemte Niveau 2-opgave kan ikke indlæses.</strong>
      <p>Den bliver ikke migreret, fjernet eller overskrevet automatisk.</p>
      <button onClick={openLevel2Setup}>Start ny Niveau 2-opgave</button>
    </div> : <div className="level2-problem" role="alert">
      <strong>Gemte Niveau 2-opgaver kan ikke tilgås lige nu.</strong>
      <p>Oprettelse og fortsættelse er blokeret, indtil storage kan læses sikkert.</p>
      <button onClick={reloadLevel2}>Prøv igen</button>
    </div>;

  const home = <main className="menu level-home">
    <section className="menu-intro">
      <p className="eyebrow">LØNBOGFØRING · DOBBELT BOGFØRING</p>
      <h2>Vælg niveau</h2>
      <p>Arbejd med grundlæggende lønkontering eller bogfør juni og afstem pr. 30/6.</p>
    </section>

    {loadProblem && <section className="problem" role="alert">
      <strong>Gemt opgave kunne ikke indlæses</strong>
      <p>{loadProblem}</p>
      <button onClick={removeInvalid}>Fjern gemt opgave</button>
    </section>}

    <div className="level-choice-grid">
      <section className="menu-card level-card">
        <span aria-hidden="true">1</span>
        <h3>Niveau 1</h3>
        <p>Grundlæggende lønkontering</p>
        <button className="primary" onClick={openLevel1}>Åbn Niveau 1</button>
        <div className="level-shortcuts" aria-label="Niveau 1 genveje">
          <button onClick={generate}>Generér ny opgave</button>
          <button onClick={() => { setVariantInput(''); setVariantError(''); setVariantOpen(true); }}>Bestemt variant</button>
        </div>
        {level1SessionCard}
      </section>

      <section className="menu-card level-card">
        <span aria-hidden="true">2</span>
        <h3>Niveau 2</h3>
        <p>Bogfør juni og afstem bogføringen pr. 30/6</p>
        {level2HomeContent}
      </section>
    </div>
  </main>;

  const level2Shell = level2.status === 'loaded' ? <Level2V2Workspace
    variant={level2.current.variant}
    source={level2.current.caseSnapshot.source}
    studentState={level2.current.studentState}
    saveStatus={level2.current.saveStatus}
    actions={level2Actions}
    onGoHome={goHome}
  /> : null;

  const headerContext = mode === 'level2' && level2.status === 'loaded'
    ? <div className="header-context">
      <span>Niveau 2 · Variant {level2.current.variant}</span>
      <span>{level2PhaseLabel(level2.current)}</span>
      <button onClick={goHome}>Til forsiden</button>
      <button className="header-reset" onClick={() => setLevel2ResetOpen(true)}>Nulstil opgave</button>
    </div>
    : mode === 'level1' && level1View !== 'menu' && session
      ? <div className="header-context">
        <span>Variant {session.variant}</span>
        {level1View === 'completed' && <span className="header-status">Afsluttet opgave</span>}
        <button onClick={goHome}>Til hovedmenu</button>
      </div>
      : mode === 'level1'
        ? <div className="header-context"><span>Niveau 1</span><button onClick={goHome}>Til forsiden</button></div>
        : <span className="header-context">Lønbogføringstræner</span>;

  return <div className="app-shell">
    <header className="topbar">
      <div><span className="brand-mark" aria-hidden="true">T</span><h1>Kontering af løn på T-konti</h1></div>
      {headerContext}
    </header>

    {notice && <p className="notice" role="status">{notice}</p>}

    {mode === 'home' ? home
      : mode === 'level2' ? level2Shell
        : level1View === 'menu' ? level1Menu
          : level1View === 'exercise' && session ? <ExerciseView
            session={session}
            onEdit={editField}
            onCheck={check}
            onRequestReset={() => setResetOpen(true)}
            onOpenCompleted={() => setLevel1View('completed')}
            onGoMenu={goHome}
            onGenerate={generate}
          /> : level1View === 'completed' && session
            ? <CompletedView session={session} onGoMenu={goHome} onGenerate={generate} />
            : null}

    {variantOpen && <Dialog title="Bestemt variant" onClose={() => setVariantOpen(false)}>
      <form onSubmit={submitVariant}>
        <label htmlFor="variant-number">Variantnummer</label>
        <input id="variant-number" inputMode="numeric" value={variantInput} onChange={event => { setVariantInput(event.target.value); setVariantError(''); }} aria-invalid={Boolean(variantError)} aria-describedby="variant-help variant-error" />
        <p id="variant-help" className="help">Vælg et heltal fra 1 til 999999.</p>
        {variantError && <p id="variant-error" className="field-error" role="alert">{variantError}</p>}
        <div className="dialog-actions"><button type="button" onClick={() => setVariantOpen(false)}>Annuller</button><button className="primary" type="submit">Start opgave</button></div>
      </form>
    </Dialog>}

    {pending && <Dialog title="Du har en igangværende opgave" onClose={() => setPending(null)}>
      <p>Starter du en ny opgave, bliver dine nuværende svar slettet.</p>
      <div className="dialog-actions"><button onClick={() => setPending(null)}>Annuller</button><button className="primary" onClick={() => start(pending.variant)}>Start ny opgave</button></div>
    </Dialog>}

    {resetOpen && <Dialog title="Nulstil svar?" onClose={() => setResetOpen(false)}>
      <p>Alle dine indtastninger og kontrolmarkeringer bliver slettet. Lønbilaget og varianten ændres ikke.</p>
      <div className="dialog-actions"><button onClick={() => setResetOpen(false)}>Annuller</button><button className="danger-action" onClick={confirmReset}>Nulstil svar</button></div>
    </Dialog>}

    {level2SetupOpen && <Dialog title="Ny Niveau 2-opgave" onClose={() => setLevel2SetupOpen(false)}>
      <form onSubmit={submitLevel2Variant}>
        <label htmlFor="level2-variant">Variant</label>
        <input id="level2-variant" inputMode="numeric" value={level2VariantInput} onChange={event => { setLevel2VariantInput(event.target.value); setLevel2VariantError(''); }} aria-invalid={Boolean(level2VariantError)} aria-describedby="level2-variant-help level2-variant-error" />
        <p id="level2-variant-help" className="help">Vælg et heltal fra 1 til 999999.</p>
        {level2VariantError && <p id="level2-variant-error" className="field-error" role="alert">{level2VariantError}</p>}
        <div className="dialog-actions split-actions">
          <button type="button" onClick={startRandomLevel2Variant}>Tilfældig variant</button>
          <button className="primary" type="submit">Start opgave</button>
        </div>
      </form>
    </Dialog>}

    {pendingLevel2Start && <Dialog title="Start ny Niveau 2-opgave?" onClose={() => setPendingLevel2Start(null)}>
      <p>Du har allerede en gemt Niveau 2-opgave. Hvis du starter en ny, bliver den nuværende erstattet.</p>
      <div className="dialog-actions"><button onClick={() => setPendingLevel2Start(null)}>Annuller</button><button className="primary" onClick={() => performLevel2Start(pendingLevel2Start)}>Start ny opgave</button></div>
    </Dialog>}

    {level2ResetOpen && <Dialog title="Nulstil Niveau 2-opgaven?" onClose={() => setLevel2ResetOpen(false)}>
      <p>Alle dine posteringer og svar i denne opgave bliver slettet. Varianten ændres ikke.</p>
      <div className="dialog-actions"><button onClick={() => setLevel2ResetOpen(false)}>Annuller</button><button className="danger-action" onClick={confirmLevel2Reset}>Nulstil opgave</button></div>
    </Dialog>}
  </div>;
}
