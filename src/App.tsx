import { useState } from 'react';
import { isValidVariant, type AccountId, type EntrySide } from './domain/payroll';
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

type View = 'menu' | 'exercise' | 'completed';
type Pending = { variant: number } | null;

export interface AppProps {
  storage?: StorageLike;
  clock?: () => string;
  randomUint32?: () => number;
  generator?: ExerciseGenerator;
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
}: AppProps) {
  const [initial] = useState<SessionLoadResult>(() => loadSession(storage));
  const [session, setSession] = useState<PayrollSession | null>(initial.kind === 'valid' ? initial.session : null);
  const [loadProblem, setLoadProblem] = useState(initial.kind === 'invalid' ? initial.message : '');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<View>('menu');
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantInput, setVariantInput] = useState('');
  const [variantError, setVariantError] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const start = (variant: number) => {
    const next = createSessionFromVariant(variant, clock, generator);
    const saved = saveSession(storage, next);
    setSession(next);
    setLoadProblem('');
    setNotice(saved.ok ? '' : saved.message);
    setPending(null);
    setVariantOpen(false);
    setResetOpen(false);
    setView('exercise');
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

  const goMenu = () => setView('menu');

  return <div className="app-shell">
    <header className="topbar">
      <div><span className="brand-mark" aria-hidden="true">T</span><h1>Kontering af løn på T-konti</h1></div>
      {view !== 'menu' && session
        ? <div className="header-context">
          <span>Variant {session.variant} · Generator v{session.generatorVersion}</span>
          {view === 'completed' && <span className="header-status">Afsluttet opgave</span>}
          <button onClick={goMenu}>Til hovedmenu</button>
        </div>
        : <span className="header-context">Lønbogføringstræner</span>}
    </header>

    {notice && <p className="notice" role="status">{notice}</p>}

    {view === 'menu' ? <main className="menu">
      <section className="menu-intro">
        <p className="eyebrow">LØNBOGFØRING · DOBBELT BOGFØRING</p>
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

      {session && (session.completed ? <section className="session-card completed-session-card">
        <div><p className="eyebrow">AFSLUTTET OPGAVE</p><h3>Variant {session.variant}</h3><p>{session.exerciseSnapshot.employeeCount} medarbejdere · Gennemført</p></div>
        <button className="primary" onClick={() => setView('completed')}>Se afsluttet opgave</button>
      </section> : <section className="session-card">
        <div><p className="eyebrow">AKTIV OPGAVE</p><h3>Variant {session.variant}</h3><p>{session.exerciseSnapshot.employeeCount} medarbejdere · Senest gemt {new Date(session.savedAt).toLocaleString('da-DK')}</p></div>
        <button className="primary" onClick={() => setView('exercise')}>Fortsæt opgaven</button>
      </section>)}
    </main> : view === 'exercise' && session ? <ExerciseView
      session={session}
      onEdit={editField}
      onCheck={check}
      onRequestReset={() => setResetOpen(true)}
      onOpenCompleted={() => setView('completed')}
      onGoMenu={goMenu}
      onGenerate={generate}
    /> : view === 'completed' && session ? <CompletedView session={session} onGoMenu={goMenu} onGenerate={generate} /> : null}

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
  </div>;
}
