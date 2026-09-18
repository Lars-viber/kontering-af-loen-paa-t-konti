import { useState } from 'react';
import { isValidVariant, type AccountId, type EntrySide } from './domain/payroll';
import {
  browserLevel2Storage,
  browserLevel2Uint32,
  inspectLevel2Session,
  level2PhaseLabel,
  parseLevel2VariantInput,
  randomLevel2Variant,
  removeInvalidLevel2Session,
  resetLevel2Session,
  retryLevel2Save,
  startNewLevel2Session,
  type Level2CaseFactory,
  type Level2Clock,
  type Level2ControllerState,
  type Level2Uint32Source,
} from './level2/controller';
import type { Level2Storage } from './level2/session';
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

export interface AppProps {
  storage?: StorageLike;
  clock?: () => string;
  randomUint32?: () => number;
  generator?: ExerciseGenerator;
  level2Storage?: Level2Storage;
  level2Clock?: Level2Clock;
  level2RandomUint32?: Level2Uint32Source;
  level2Generator?: Level2CaseFactory;
}

const browserStorage: StorageLike = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
};

const saveFailure = 'Ændringen kunne ikke gemmes lokalt.';

export function App({
  storage = browserStorage,
  clock = () => new Date().toISOString(),
  randomUint32,
  generator,
  level2Storage = browserLevel2Storage,
  level2Clock,
  level2RandomUint32 = browserLevel2Uint32,
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

  const [level2, setLevel2] = useState<Level2ControllerState>(() => inspectLevel2Session(activeLevel2Storage));
  const [level2SetupOpen, setLevel2SetupOpen] = useState(false);
  const [level2VariantInput, setLevel2VariantInput] = useState('');
  const [level2VariantError, setLevel2VariantError] = useState('');
  const [pendingLevel2Variant, setPendingLevel2Variant] = useState<number | null>(null);
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

  const openLevel2Setup = () => {
    setLevel2VariantInput('');
    setLevel2VariantError('');
    setLevel2SetupOpen(true);
  };

  const performLevel2Start = (variant: number) => {
    const next = startNewLevel2Session(activeLevel2Storage, variant, activeLevel2Clock, level2Generator);
    setLevel2(next);
    setLevel2SetupOpen(false);
    setPendingLevel2Variant(null);
    setLevel2ResetOpen(false);
    setMode('level2');
  };

  const requestLevel2Start = (variant: number) => {
    if (level2.lifecycle === 'valid') {
      setLevel2SetupOpen(false);
      setPendingLevel2Variant(variant);
      return;
    }
    if (level2.lifecycle === 'none') performLevel2Start(variant);
  };

  const submitLevel2Variant = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseLevel2VariantInput(level2VariantInput);
    if (!parsed.ok) {
      setLevel2VariantError('Indtast et heltal fra 1 til 999999.');
      return;
    }
    setLevel2VariantError('');
    requestLevel2Start(parsed.variant);
  };

  const startRandomLevel2Variant = () => {
    requestLevel2Start(randomLevel2Variant(level2RandomUint32));
  };

  const removeInvalidLevel2 = () => {
    setLevel2(current => removeInvalidLevel2Session(activeLevel2Storage, current));
  };

  const confirmLevel2Reset = () => {
    if (level2.lifecycle === 'valid') {
      setLevel2(resetLevel2Session(activeLevel2Storage, level2, activeLevel2Clock));
    }
    setLevel2ResetOpen(false);
  };

  const retrySave = () => {
    if (level2.lifecycle === 'valid') setLevel2(retryLevel2Save(activeLevel2Storage, level2));
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

  const level2HomeContent = level2.lifecycle === 'none' ? <>
    <p>Start en ny avanceret opgave med en bestemt eller tilfældig variant.</p>
    <button className="primary" onClick={openLevel2Setup}>Ny Niveau 2-opgave</button>
  </> : level2.lifecycle === 'valid' ? <>
    <p>Variant {level2.session.variant} · {level2PhaseLabel(level2.session)}</p>
    <div className="level-card-actions">
      <button className="primary" onClick={() => setMode('level2')}>Fortsæt Niveau 2</button>
      <button onClick={openLevel2Setup}>Ny Niveau 2-opgave</button>
    </div>
  </> : level2.lifecycle === 'invalid' ? <div className="level2-problem" role="alert">
    <strong>Den gemte Niveau 2-opgave kan ikke indlæses.</strong>
    <p>Den bliver ikke fjernet eller overskrevet automatisk.</p>
    {level2.removeError && <p>Den gemte opgave kunne ikke fjernes. Prøv igen senere.</p>}
    <button onClick={removeInvalidLevel2}>Fjern ugyldig gemt opgave</button>
  </div> : <div className="level2-problem" role="alert">
    <strong>Gemte Niveau 2-opgaver kan ikke tilgås lige nu.</strong>
    <p>Oprettelse og fortsættelse er midlertidigt blokeret for at beskytte dine data.</p>
  </div>;

  const home = <main className="menu level-home">
    <section className="menu-intro">
      <p className="eyebrow">LØNBOGFØRING · DOBBELT BOGFØRING</p>
      <h2>Vælg niveau</h2>
      <p>Arbejd med grundlæggende lønkontering eller den avancerede opgave med periodisering og afstemning.</p>
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
        <p>Avanceret lønkontering, periodisering og afstemning</p>
        {level2HomeContent}
      </section>
    </div>
  </main>;

  const level2Shell = level2.lifecycle === 'valid' ? <main className="level2-shell">
    <section className="level2-shell-card">
      <p className="eyebrow">AVANCERET LØNKONTERING</p>
      <h2>Niveau 2</h2>
      <dl className="level2-summary">
        <div><dt>Variant</dt><dd>{level2.session.variant}</dd></div>
        <div><dt>Aktuel fase</dt><dd>{level2PhaseLabel(level2.session)}</dd></div>
      </dl>
      <p className="level2-next-note">Niveau 2-arbejdsfladen implementeres i næste fase.</p>
      {level2.saveStatus === 'saved' && <p className="save-status success" role="status">Gemt</p>}
      {level2.saveStatus === 'error' && <div className="save-warning" role="alert">
        <p>Din seneste ændring kunne ikke gemmes.</p>
        <button onClick={retrySave}>Prøv at gemme igen</button>
      </div>}
      <div className="level2-shell-actions">
        <button onClick={goHome}>Til forsiden</button>
        <button className="danger-outline" onClick={() => setLevel2ResetOpen(true)}>Nulstil opgave</button>
      </div>
    </section>
  </main> : null;

  const headerContext = mode === 'level2' && level2.lifecycle === 'valid'
    ? <div className="header-context"><span>Niveau 2 · Variant {level2.session.variant}</span><button onClick={goHome}>Til forsiden</button></div>
    : mode === 'level1' && level1View !== 'menu' && session
      ? <div className="header-context">
        <span>Variant {session.variant} · Generator v{session.generatorVersion}</span>
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

    {pendingLevel2Variant !== null && <Dialog title="Start ny Niveau 2-opgave?" onClose={() => setPendingLevel2Variant(null)}>
      <p>Du har allerede en gemt Niveau 2-opgave. Hvis du starter en ny, bliver den nuværende erstattet.</p>
      <div className="dialog-actions"><button onClick={() => setPendingLevel2Variant(null)}>Annuller</button><button className="primary" onClick={() => performLevel2Start(pendingLevel2Variant)}>Start ny opgave</button></div>
    </Dialog>}

    {level2ResetOpen && <Dialog title="Nulstil Niveau 2-opgaven?" onClose={() => setLevel2ResetOpen(false)}>
      <p>Alle dine posteringer og svar i denne opgave bliver slettet. Varianten ændres ikke.</p>
      <div className="dialog-actions"><button onClick={() => setLevel2ResetOpen(false)}>Annuller</button><button className="danger-action" onClick={confirmLevel2Reset}>Nulstil opgave</button></div>
    </Dialog>}
  </div>;
}