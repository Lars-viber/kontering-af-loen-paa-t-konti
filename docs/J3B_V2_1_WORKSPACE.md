# J3B – V2.1 isoleret workspace/UI

## Status og afgrænsning

J3B implementerer det komplette V2.1-workspace som et isoleret presentation-lag under `src/level2/v2/workspace/`. Den aktive app, Home-flowet og V2.0.1-runtime er uændrede. J3B er ikke staged, committed, pushet, integreret i `App.tsx` eller deployet.

De frosne forudgående trin er:

- J0: `048944a`
- J1A: `bf4867b`
- J1B: `2e3bb6b`
- J2A: `f6bca0c`
- J2B: `1c971b1`
- J3A: `9f4a053` (`Implement v2.1 controller and autosave`)

J3A er committed og pushet separat på `feature/v2.1-june-reconciliation`. Lokal `HEAD` og `origin/feature/v2.1-june-reconciliation` peger begge på J3A-committen før J3B-diffen.

## Presentation- og controllergrænse

`Level2V2Workspace` modtager kun variant, `caseSnapshot.source`, `studentState`, save-status og controllercallbacks. Presentationlaget:

- genererer ikke cases
- vælger ikke varianter
- læser eller skriver ikke browser-storage
- parser ikke session-JSON
- udfører ikke grading
- starter ikke autosave via render eller `useEffect`
- avancerer og afslutter kun via eksplicitte brugerhandlinger

Alle elevændringer og gradinghandlinger går gennem de indsendte controllercallbacks. Savefejl beholder den aktuelle in-memory state og viser `Kunne ikke gemme automatisk.` med knappen `Prøv at gemme igen`.

En source audit af `src/level2/v2/workspace/` gav 0 forekomster af `answers`, `expectedPostings`, `r1Answers`, `answerKey`, `expectedCheckpoint`, `generateV2Case`, `localStorage`, `sessionStorage`, `Math.random` og `useEffect(`. UI'et kan derfor ikke importere eller læse facitdata direkte.

## Bilagsflow og progression

Progressionen indeholder præcis B1-B9 og `Afstemning`. Checkpoint tælles ikke som et bilag. Den semantiske liste viser afsluttede, aktive og kommende trin med tekst og symboler, så status ikke kun formidles med farve.

I `documentEntry` kan eleven arbejde i alle 13 T-konti og kontrollere det aktive bilag. Et korrekt bilag går til `documentReview` og bliver på skærmen sammen med alle færdige T-konti. De aktuelle posteringer er read-only, og låste grupper har ingen add-row-kontroller. Eleven skal selv vælge:

- `Gå videre til næste bilag` for B1-B8
- `Gå videre til afstemning` for B9

B9-review viser fortsat B9 og kontiene; checkpoint renderes først efter det eksplicitte klik. Der findes ingen render-effect, som automatisk kalder advance eller complete.

B4-B8 viser kun de relevante, synlige source-tælleværker. B9 viser åbningskontekst og lønsystemets opgjorte slutsaldo, men ingen direkte juni-regulering eller andet skjult facit. DOM-testen kontrollerer specifikt dette no-leak-krav.

Splitposteringer bevares som separate elevrækker i historik og reference. De kollapses ikke til et forventet facittotalbeløb.

## Checkpoint og afstemning

Checkpoint har en arbejdsdel med sektion A-E og et samtidigt read-only referenceområde. Referenceområdet viser:

- alle relevante source-tælleværker
- seks eksterne balancekontroloplysninger
- alle 13 T-konti og elevafledte saldi pr. 30/6

På desktop er referenceområdet sticky og selvstændigt scrollbart. På smallere layouts placeres det inline og kan foldes sammen med en rigtig button. Der bruges ingen modal eller backdrop, så eleven kan taste og slå op samtidig.

Hver korrekt sektion låses uafhængigt og viser en reel reconciliation-tabel med bogført/beregnet værdi, tælleværk eller kontroloplysning, difference og status. Resultaterne afledes af elevdata og synlige source-data:

- A og B sammenholder elevens beregning med de relevante source-tælleværker.
- C viser fire rækker og summerer arbejdsgiverpension og ATP på tværs af timelønnede og funktionærer.
- D beregner summen af source-tælleværkerne.
- E viser seks rækker med elevafledte bogførte saldi mod source-kontroloplysninger.

Difference følger konsekvent `student value - external source value`. Status bliver kun `Stemmer`, når differencen faktisk er 0. Det er en fail-safe visning, også hvis en invariant mod forventning brydes.

Partial locking er bevaret: en korrekt sektion er read-only med resultat, mens øvrige sektioner følger deres egen status. Referenceområdet forbliver synligt.

Når A-E er korrekte, bliver workspacet i `checkpointReview`. Alle sektioner og reconciliation-resultater vises read-only sammen med `Afstemningen pr. 30/6 stemmer` og `5 af 5 afstemninger korrekte`. Eleven skal derefter selv vælge `Afslut Niveau 2`; kun dette klik kalder controllerens complete-action.

## Completed view

Efter eksplicit afslutning viser completed-viewet, at Niveau 2 er gennemført, at 9 af 9 bilag er afsluttet, og at afstemningen stemmer. Slutoversigten viser de 13 elevafledte kontosaldi pr. 30/6.

Der findes ingen B10-B13, `finalControl`, slutkontrol, årsagsvalg eller juli-afregninger i V2.1-workspacet.

## Accessibility og responsive design

Nye handlinger bruger native buttons, inputfelter har labels, statusområder har semantiske roller, progressionen er en `ol`, og reconciliation-data bruger rigtig tabelmarkup. Kontoplan- og historikdialogs har dialogsemantik og kan lukkes med keyboard. Beløb er højrestillede og bruger tabular numbers.

Stylingen er fuldt scoped med `.l2v2-*` i `workspace.css` og ændrer ingen global eller aktiv V2.0.1-styling. De testede layoutkontrakter er:

- 375 og 768 px: én T-kontokolonne
- 900 px: to T-kontokolonner
- 1280 og 1366 px: tre T-kontokolonner
- 1920 px: fire T-kontokolonner
- checkpoint desktop: split layout med sticky/scrollbar reference
- checkpoint small: inline/collapsible reference
- ingen horisontal page overflow i de scoped layoutregler

Ved 1366×768 er progressionen og det sticky bilagspanel bevaret, T-kontiene har tre kolonner, og kortdensiteten er fastholdt til mindst to komplette rækker i designkontrakten. Reviewstatus og advance-action er kompakte, så venstrepanelet ikke vokser unødigt.

Den responsive kontrakt er verificeret med DOM- og statiske CSS-tests. En faktisk screenshot-audit blev forsøgt via den integrerede browser, men browserprocessen kunne ikke startes på værten og returnerede `CreateProcessWithLogonW failed: 1385`, også efter reset. Der er derfor ikke registreret eller opfundet browsermålinger eller screenshots.

## Tests og regression

Målrettede J3B-tests:

- 4 testfiler
- 30/30 tests bestod

De dækker blandt andet progressionstilstandene, documentReview B4, eksplicit advance, B9-review, B4-B8-tælleværker, B9 no-leak, 13 T-konti, splitrækker, checkpointreference, reconciliation A/C/E, partial locking, checkpointReview, eksplicit complete, completed-view, save retry, semantik og responsive CSS-kontrakter.

Afsluttende regression:

- `pnpm test`: 66/66 testfiler og 522/522 tests bestod
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 114 moduler transformeret
- generator-/fixture-/hash-regression: 5/5 testfiler og 22/22 tests bestod
- Generator V1 stress: 4.000/4.000
- Generator V2 stress: 4.000/4.000
- V2 duplicate fingerprints: 0

Den fulde parallelle suite bestod uden 5-sekunders UI-timeout. Ingen eksisterende test blev ændret for at omgå timeoutadfærd.

Fixturehashes er fortsat:

- Generator V2: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

## J3B-filer

Workspace og presentation:

- `src/level2/v2/workspace/AccountHistoryDialog.tsx`
- `src/level2/v2/workspace/AccountPlanDialog.tsx`
- `src/level2/v2/workspace/CheckpointBalanceSection.tsx`
- `src/level2/v2/workspace/CheckpointReferencePanel.tsx`
- `src/level2/v2/workspace/CheckpointSection.tsx`
- `src/level2/v2/workspace/CheckpointWorkspace.tsx`
- `src/level2/v2/workspace/CompletedView.tsx`
- `src/level2/v2/workspace/DocumentPanel.tsx`
- `src/level2/v2/workspace/DocumentWorkspace.tsx`
- `src/level2/v2/workspace/Level2V2Workspace.tsx`
- `src/level2/v2/workspace/PostingRow.tsx`
- `src/level2/v2/workspace/Progress.tsx`
- `src/level2/v2/workspace/ReconciliationResult.tsx`
- `src/level2/v2/workspace/SaveStatus.tsx`
- `src/level2/v2/workspace/TAccountCard.tsx`
- `src/level2/v2/workspace/checkpointPresentation.ts`
- `src/level2/v2/workspace/format.ts`
- `src/level2/v2/workspace/index.ts`
- `src/level2/v2/workspace/presentation.ts`
- `src/level2/v2/workspace/types.ts`
- `src/level2/v2/workspace/workspace.css`
- `src/level2/v2/workspace/workspaceSelectors.ts`

Tests:

- `tests/level2/v2-workspace-checkpoint-ui.test.tsx`
- `tests/level2/v2-workspace-document-ui.test.tsx`
- `tests/level2/v2-workspace-presentation.test.ts`
- `tests/level2/v2-workspace-responsive.test.ts`
- `tests/level2/v2-workspace-test-helpers.tsx`

Dokumentation:

- `docs/J3B_V2_1_WORKSPACE.md`

## Klar til J3C

Der er ingen kendte kode-, kontrakt-, test-, build-, generator- eller fixtureblockers før J3C. Runtimeintegration er med vilje ikke udført i J3B og er næste fases opgave. Den manglende screenshot-audit skyldes værtsbrowserens procesfejl og ændrer ikke den grønne DOM-, CSS-, type-, build- eller regressionsstatus.
