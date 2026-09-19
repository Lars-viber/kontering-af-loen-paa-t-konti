# J4 – V2 release audit

## Status og baseline

J4 er gennemført på branch `v2` fra baseline `62f9f5a Implement Niveau 2 checkpoint and final control`. Arbejdet er ikke committed, pushet, merget, tagget eller deployet.

Releaseklassifikation:

- **BLOCKER:** Ingen åbne.
- **NON-BLOCKER:** Den integrerede browser kunne ikke starte på Windows-værten (`CreateProcessWithLogonW failed: 1385`). Den tilladte lokale Chrome/CDP-fallback gennemførte den faktiske renderaudit. Mobil bruger normal vertikal scroll; alle funktioner er tilgængelige.

## J4-ændringer

- `src/styles.css`: Niveau 1-lønbilagets labels og beløb deler nu en fælles base-font-size på 13 px. Højrejustering, tabular nums og vægt er bevaret. `select:focus-visible` bruger samme tydelige fokusoutline som knapper og inputs.
- `src/App.tsx`: den brugerrettede udviklingstekst `Generator v1` er fjernet fra Niveau 1-headeren; variantnummeret bevares.
- `tests/app.test.tsx` og `tests/completed-ui.test.tsx`: målrettede UI-forventninger følger release-teksten.
- `README.md`: kort brugerrettet beskrivelse af Niveau 1, Niveau 2 og separat lokal browserpersistence.
- `docs/J4_V2_RELEASE_AUDIT.md`: denne rapport.

Ingen packagefil, dependency, workflow, fixture eller frossen Niveau 2-kontrakt er ændret.

## Niveau 1-regression og typografi

Den renderede variant 42 viste otte konti, danske heltalsformater og det uændrede konteringsflow. Computed styles målte:

- lønbilagstekst: `13px`
- lønbilagsbeløb: `13px`

Beløb forblev højrejusterede, tabular og semibold. Partial grading viste `Forkert – ret beløbet`, og råværdien `12` blev gemt og restored. Opgaven blev derefter gennemført gennem UI'et; alle 16 felter blev låst, completed-overview viste otte readonly konti og ingen inputs.

Videoen var ikke mounted ved lukket tilstand, mountede én iframe ved åbning og blev unmounted igen ved lukning. URL var `https://www.youtube.com/embed/A6XmMtNr5mM`, uden autoplay. Advarslen om forældede ATP-satser og anden kontoplan var synlig.

Niveau 1 reset-, ny-opgave-, session-, parser-, grading-, completed- og storageflows er dækket af den fulde regression. Den særskilte Niveau 1-stress bestod 4.000/4.000 cases med 0 generator-, invariant-, debit/kredit-, negativ-skat- eller negativ-nettolønsfejl.

## Niveau 2 full flow og anden variant

Generatorvariant 42 blev gennemført via den rigtige renderede app:

`home → B1–B9 → checkpoint A–E → B10–B13 → final control → completed → refresh/restore`.

Auditen bekræftede:

- 13 konti i document workspace
- separat checkpointgrading, neutral fejlfeedback og correct locking
- 19 blanke checkpointbeløbsfelter og 12 D/K-radioknapper
- ingen checkpoint-facitbeløb i blank DOM
- readonly ÅTD-dialog uden stateændring
- automatisk overgang fra fem korrekte sektioner til B10
- seks slutkontrolitems med saldi `0`, `0`, `0`, `0`, `7.128 K` og `199.500 K`
- ingen correct-metadata i reason-options
- wrong reason forblev redigerbar; correct reason blev låst
- completed view havde seks readonly saldi og ingen formkontroller
- reload restored `phase = completed`, variant 42

Variant 999999-smoken oprettede et selvstændigt caseSnapshot og viste B1 med 13 konti samt dokumentbeløbene `146.454`, `36.267` og `182.721`. Rå elevværdi `123` blev gemt, survived home/continue og bekræftede, at præsentationen ikke er hardcoded til variant 42.

R1-regressionen bestod som del af testsuiten og bekræfter 13/13 bilag, checkpoint, juli og final balances uden fixtureændring.

## Sessioner, autosave og invalid storage

Niveau 1- og Niveau 2-sessioner blev oprettet samtidigt i hver sin storage key. På home stod begge fortsæthandlinger til rådighed. Niveau 1 restored råværdien `12`; Niveau 2 restored completed-state. Efter Niveau 1-completion forblev Niveau 2 uændret, og efter variant 999999-oprettelse forblev Niveau 1 completed.

Eksisterende controller-/storage-tests og renderauditten dækker:

- normal autosave
- no-op uden unødvendigt write
- `setItem`-fejl uden rollback
- global save warning
- retry, som gemmer den aktuelle in-memory state
- home/continue efter successful retry
- reset med samme variant og caseSnapshot, blank state og 0 generatorcalls
- new task med nyt valgt variantnummer, nyt snapshot og blank state
- resume, reset, load og decode med 0 generatorcalls

En faktisk malformed JSON-værdi blev ikke overskrevet eller regenereret. UI viste den defensive fejltilstand og `Fjern ugyldig gemt opgave`. Testpakken dækker også schema mismatch, generator/ruleset mismatch, tampered progression, case-tampering og storage read/remove errors.

## Document workspace og facitlæk

Workspace-regressionerne dækker 13 konti i frossen rækkefølge, add/edit/remove, splitpostering, partial lock, forkert konto, netting fail, invalid input, approved history, maksimalt tre kompakte historikrækker, fuld historikdialog, aktuel saldo, kontoplan, video og save warning.

Den faktiske historikdialog blev åbnet fra Bankkonto efter fire approved rækker. Den viste `+ 1 tidligere posteringer`, fire tabelrækker, modal semantik, fokus i dialogen, viewport-fit og Escape-lukning.

Source- og DOM-audit fandt ingen facit i placeholder, `title`, `aria-label`, data-attribut, CSS-klasse, skjult tekst eller console output. `expectedPostings` og `answerKey` importeres ikke i Niveau 2-presentationlaget. De tilladte source-data, ÅTD-specifikationstal og umarkerede final-reason-labels er de eneste facitnære visninger.

## Accessibility

Keyboardrækkefølgen på hovedmenuen nåede alle seks hovedhandlinger og vendte derefter naturligt til dokumentstarten uden trap. Native inputs, buttons, radio controls og selects bruges i kerneflowet. `select` har nu samme 3 px focus-visible-outline som knapper og inputs.

Følgende dialoger er verificeret gennem browser og tests:

- confirmations
- Kontoplan
- Video
- kontohistorik
- ÅTD-specifikation

De har accessible name, `role="dialog"`, `aria-modal="true"`, close-knap, focus trap, Escape og focus return. Dialogerne lå inden for både desktop- og mobilviewport. Alle form controls har labels; icon-only close/remove-knapper har aria-label; correct/incorrect formidles med tekst og ikke kun farve. Readonly svar vises som tekstfelter/paneler frem for en samling disabled inputs.

Kontrastforhold mod deres faktiske baggrunde:

- normal tekst: 14,55:1
- sekundær tekst: 4,83:1
- primary: 7,83:1
- success: 4,63:1
- error: 6,46:1
- readonly success-tekst: 7,35:1
- error-feedback: 7,75:1

## Responsive og visuel audit

| Viewport | Niveau 2 dokumentkolonner | Bilagspanel | Vandret overflow |
|---|---:|---|---|
| 375×667 | 1 | statisk | Nej |
| 768×1024 | 1 | statisk | Nej |
| 900×768 | 2 | sticky | Nej |
| 1280×720 | 3 | sticky | Nej |
| 1366×768 | 3 | sticky | Nej |
| 1920×1080 | 4 | sticky | Nej |

Home, Niveau 1, checkpoint og final control blev målt i samme seks viewports uden vandret page-overflow eller skjulte primærhandlinger. Mobil viser én T-kontokolonne og bruger forventet vertikal scroll.

Ved 1366×768 var de første seks Niveau 2-kort fordelt i to komplette rækker:

- række 1: top 125 px, bund 339 px
- række 2: top 348 px, bund 562 px
- viewportbund: 768 px
- bilagspanel: `position: sticky`
- horisontal overflow: nej

Kortdensitet, tre seneste historikrækker og overlay for ældre historik er bevaret. J4 har ikke ændret Niveau 2-korthøjder eller gridbreakpoints.

## Browser console, netværk og privacy

Hele variant 42-flowet, variant 999999-smoken, Niveau 1-flowet, dialogerne og production-refresh gav:

- console errors: 0
- console warnings: 0
- uncaught exceptions: 0
- HTTP errors: 0

Normal appbrug kaldte kun lokale app-assets. Ved eksplicit åbning af videoen blev den kendte YouTube-embed hentet og svarede 200. Appen har ingen backend, login, analytics, telemetry, tracking eller ekstern storage. Elevstate lagres kun i browserens localStorage under de to eksisterende Niveau 1-/Niveau 2-keys.

## Security og dependencies

Source-audit fandt:

- 0 `dangerouslySetInnerHTML`
- 0 `eval(...)`
- 0 `new Function`
- 0 analytics-/trackingbiblioteker
- 0 secrets/API keys i tracked produktfiler
- ingen fetch, XHR eller WebSocket i produktkoden
- kun den dokumenterede YouTube-URL som ekstern ressource

Elevinput renderes gennem React og parsers defensivt. Variantinput accepterer kun heltal 1–999999. Sessiondecode validerer exact shape, versioner, snapshot og progression før brug.

Runtime dependencies er fortsat kun `react` og `react-dom`, begge version `19.2.8`. `package.json` og `pnpm-lock.yaml` har tom diff.

## Determinisme, source audit og fixtures

- `Math.random`: 0 i Niveau 2 production path
- `generateLevel2Case`: production-callsite kun i `src/level2/controller/newSession.ts`; resten er generatorens definition
- `localStorage`: kun Niveau 1's eksisterende App-adapter og Niveau 2's godkendte browseradapter
- `expectedPostings`: 0 i `src/level2/workspace`
- Date/time: 0 i Niveau 2 domain/generator/state
- brugerrettet release-UI: ingen TODO/FIXME/placeholders, seed, schemaVersion, generatorVersion, fixture eller answer-key tekst

Frosne arbejdsområder har tom working-tree-diff:

- `src/domain/level2/`
- `src/level2/state/`
- `src/level2/session/`
- `src/level2/controller/`

Fixturehashes er uændrede og verificeret af den grønne regressionspakke:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

`v1.0.0` peger fortsat på `634a0eb94f789b950879443b1fc6817aa501b479`.

## Tests, stress og production build

- `pnpm test`: PASS, 45 testfiler og 329/329 tests
- Niveau 1 og Niveau 2: alle PASS
- Niveau 2 generatorstress: 4.000/4.000, 0 failures, 0 duplicate fingerprints
- separat `pnpm stress:j1`: PASS, 4.000/4.000 og 0 failures
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 111 moduler transformeret
- `git diff --check`: PASS

Production buildens projektsti er `/kontering-af-loen-paa-t-konti/`. Chrome indlæste HTML, hashed JS, hashed CSS og favicon med HTTP 200; alle asset-paths lå under projektstien. En normal refresh på projektstien viste fortsat `Vælg niveau` uden fejl eller vandret overflow.

## Kendte begrænsninger og releasebeslutning

Screenshots er gemt som midlertidige TEMP-auditbeviser og er ikke tilføjet til repositoryet. Videoen kræver adgang til YouTube, men påvirker ikke opgavens lokale funktion eller persistence. Der er ingen fundne release-blockers.
