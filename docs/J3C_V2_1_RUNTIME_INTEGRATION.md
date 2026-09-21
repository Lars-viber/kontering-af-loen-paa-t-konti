# J3C – V2.1 aktiv runtimeintegration

## Status

Den aktive Niveau 2-oplevelse er skiftet fra V2.0.1 til V2.1 på branch `feature/v2.1-june-reconciliation`. J3C er ikke staged, committed, pushet, merged eller deployet.

Tidligere frosne commits:

- J0: `048944a`
- J1A: `bf4867b`
- J1B: `2e3bb6b`
- J2A: `f6bca0c`
- J2B: `1c971b1`
- J3A: `9f4a053`
- J3B: `2edb25f` – `Implement v2.1 workspace`

J3B er committed og pushet separat. Lokal HEAD og upstream peger begge på `2edb25f66459bc6b084594633a1840bf2e53f353` før J3C-diffen.

## Aktiv integration

`src/App.tsx` bruger nu:

- `src/level2/v2/controller/`
- `src/level2/v2/session/`
- `src/level2/v2/runtime/`
- `src/level2/v2/workspace/`

Det historiske V2.0.x-lag under `src/level2/controller/`, `src/level2/session/`, `src/level2/state/` og `src/level2/workspace/` er bevaret og ikke længere importeret af den aktive App.

Niveau 1-koden og dens sessionflow er uændret.

## Browserruntime og storage

`src/level2/v2/runtime/browserStorage.ts` er den lille browseradapter til `window.localStorage`. Controller- og sessionlagene arbejder fortsat kun mod `V2Storage`.

Den aktive V2.1-runtime bruger:

`kontering-af-loen-paa-t-konti.level2.session.v2`

til load, new, autosave, reset, retry og continue.

Den gamle key:

`kontering-af-loen-paa-t-konti.level2.session.v1`

læses kun af sessionlagets legacy-presence-detektion. Den aktive runtime skriver, fjerner eller migrerer den ikke. Integrationtests bekræfter byte-for-byte bevarelse, når en ny V2.1-opgave startes.

Production clock leveres til controlleren og bruges til `savedAt`. Der findes ingen parallel autosave-effect.

Tilfældige opgaver går gennem `startRandomV2ControllerSession` og `crypto.getRandomValues`-kilden. App bruger ikke `Math.random` og indeholder ikke egen generatorlogik.

## Home-tilstande

Home håndterer følgende typed V2.1-loadresultater:

- ingen V1/V2-session: normal ny-opgavehandling
- legacy V1 uden V2: neutral besked om den ændrede juni-afstemningsmodel og eksplicit start
- valid V2: `Fortsæt Niveau 2` samt mulighed for ny opgave
- valid V1 og valid V2: V2 fortsættes; V1 ignoreres som fallback
- invalid V2: fejlbesked og eksplicit ny-opgavehandling
- invalid V2 med legacy V1: ingen fallback, migration eller sletning
- storage read failure: sikker fejltilstand med `Prøv igen`

Mount og render genererer eller gemmer ingen opgave. React StrictMode kan derfor ikke skabe to varianter, generatorcalls eller saves.

Den elevvendte Niveau 2-beskrivelse er opdateret til juni-bogføring og afstemning pr. 30/6. Der vises ingen tekniske versionslabels.

## Ny opgave, continue og reset

Bestemt variant valideres gennem den additive controllerparser `parseV2ControllerVariantInput` og accepterer kun heltal 1–999999.

Tilfældig start bruger controllerens secure picker. Ved en eksisterende valid session sker hverken variantvalg, generation eller save før den eksplicitte replacement-confirmation.

Continue loader det allerede persistede snapshot og student state. Generatorcall count er 0.

Reset bruger `resetV2ControllerSession` og bevarer variant og case snapshot, returnerer til B1/`documentEntry` og har 0 generatorcalls.

Navigation til Home ændrer, regenererer, avancerer, afslutter eller sletter ingen session.

## Source-only workspacegrænse

`Level2V2Workspace` modtager kun:

- variant
- `caseSnapshot.source`
- `studentState`
- save-status
- controllercallbacks
- Home-navigation

`caseSnapshot.answers` sendes ikke som prop. Grading sker kun inde i controllercallbacks.

En source audit af `src/App.tsx`, `src/level2/v2/runtime/` og `src/level2/v2/workspace/` gav 0 aktive forekomster af `Math.random`, `generateV2Case`, answer-props, `expectedPostings`, B10-B13, `finalControl`, `Slutkontrol` og auto-navigation via `useEffect`.

## Controllercallback-wiring

App wirer direkte til controlleractions for:

- add, edit og remove posting
- check document
- advance document review
- edit checkpoint amount
- edit checkpoint balance
- check checkpoint section
- complete
- retry save

React holder controllerens `current` som den eneste aktive V2.1-sessionstate. Der findes ingen separat student-state-kopi.

## Runtimeflow

Integrationtests verificerer:

- korrekt bilag går til `documentReview`, ikke næste bilag
- B4 bliver synligt efter check og efter remount
- kun `Gå videre til næste bilag` åbner B5
- B9 bliver stående i review efter remount
- kun `Gå videre til afstemning` åbner checkpoint
- checkpoint viser source-tælleværker, seks kontroloplysninger, 13 T-konti og A-E
- alle A-E korrekte giver `checkpointReview`, ikke completed
- `checkpointReview` består efter remount
- kun `Afslut Niveau 2` giver completed
- completed består efter remount og viser 9/9, afstemning og elevafledte saldi pr. 30/6
- ingen B10-B13, slutkontrol eller juli-flow vises

Home/continue og en helt ny App-mount genskaber samme variant, fase og rå elevinput uden generatorcall.

## Save failure og retry

Hvis autosave fejler, viser workspacet fortsat den nyeste in-memory state og beskeden `Kunne ikke gemme automatisk.`.

`Prøv at gemme igen` bruger `retryV2ControllerSave`. Ved succes forsvinder advarslen, samme state persistéres under v2-key, og der sker ingen regeneration eller rollback.

## Niveau 1-regression

De eksisterende Niveau 1 App-, exercise-, completed-, session- og UI-tests indgår uændret i den fulde suite. Den målrettede J3C-gruppe inkluderede også `tests/app.test.tsx` og bestod.

## Production build og HTTP

Afsluttende production build:

- typecheck: PASS
- Vite build: PASS
- 119 moduler transformeret
- JavaScript: `323.82 kB`
- CSS: `42.26 kB`

Preview blev startet på:

`http://127.0.0.1:4173/kontering-af-loen-paa-t-konti/`

Separat HTTP-kontrol gav:

- side: 200
- favicon: 200
- JavaScript-asset: 200
- CSS-asset: 200

Dette bekræfter build-output og asset paths, men erstatter ikke den krævede GUI-browseraudit.

## Browseraudit – blocker

Den integrerede browser kunne ikke starte. Første forsøg fejlede med:

`CreateProcessWithLogonW failed: 1385`

Efter præcis ét rent tool-reset fejlede det sidste startforsøg med samme hostfejl, før en browserfane blev oprettet. Previewserver og HTTP-assets var samtidig tilgængelige, så fejlen er afgrænset til browser/process-hosting og ikke til appserverens opstart.

Følgende kunne derfor ikke verificeres i en rigtig browser:

- clean-profile Home-smoke
- normal UI-start af variant 42
- documentReview B4 og B9 i browser
- checkpoint og reconciliation i browser
- checkpointReview og completed i browser
- Home/continue og refresh i browser
- legacy V1-browserflow
- viewportmatrixen 375×667, 768×1024, 900×768, 1280×720, 1366×768 og 1920×1080
- faktiske 1366×768-målinger
- keyboard smoke
- browserconsole errors/warnings
- browserens networklog

Der er ikke opfundet browserresultater. Produktkode og tests er ikke ændret for at omgå værtsfejlen.

## J3C-FIX1 – fulde juni-bilag på B4–B8

Den manuelle browseraudit fandt, at B4 kun viste det ene felt fra `documentSources` sammen med ÅTD-tælleværkerne. `DocumentPanel` renderede alle de felter, den modtog; årsagen var, at B4, B6 og B7 kun havde henholdsvis bruttoløn eller bruttoferiepenge i `documentSources.fields`.

Alle nødvendige legitime juni-data fandtes allerede i `caseSnapshot.source.history` på juni-posten. Rettelsen er derfor afgrænset til workspace-præsentationen og ændrer ingen domain business logic, generator, answer key, expected postings, grading, state, session, controller, progression eller storage.

`selectV2WorkspaceDocumentFields` sammensætter nu de aktuelle juni-rækker direkte fra source:

- B4: bruttoløn, medarbejderpension, medarbejder-ATP, AM-bidragsgrundlag, AM-bidrag, A-skat og nettoløn
- B5: arbejdsgiverpension og arbejdsgiver-ATP
- B6: bruttoferiepenge, AM-bidrag af feriepenge, A-skat af feriepenge og nettoferiepenge; intet almindeligt månedsfradrag
- B7: bruttoløn, medarbejderpension, medarbejder-ATP, AM-bidragsgrundlag, AM-bidrag, A-skat og nettoløn
- B8: arbejdsgiverpension og arbejdsgiver-ATP

Bilagspanelet viser `Lønbilag – juni` før de aktuelle label/value-rækker. De eksisterende relevante tælleværker vises fortsat i den separate `Tælleværker ÅTD`-reference under bilaget. Beløb er højrestillede med tabular numbers og kompakt afstand.

B1–B3 og B9 bruger fortsat deres oprindelige `documentSources.fields` uændret. B9 viser fortsat kun opening context og systemopgjort saldo, og juni-reguleringen vises ikke direkte. Workspace-auditen er fortsat source-only og indeholder ingen imports eller props for answers, expected postings, answer key eller expected checkpoint.

Målrettet FIX1-verifikation:

- B4–B8 DOM med alle krævede aktuelle R1-junifelter og beløb: PASS
- separat ÅTD-sektion på B4–B8: PASS
- B6 uden almindeligt månedsfradrag: PASS
- identisk B1–B3/B9-feltoutput: PASS
- målrettede workspace-tests: 2/2 testfiler og 25/25 tests

## Tests, stress og hashes

Målrettet runtime-, workspace- og Niveau 1-gruppe:

- 8/8 testfiler
- 56/56 tests

Afsluttende full suite efter J3C-FIX1 bestod:

- 66/66 testfiler
- 528/528 tests

Øvrig verification:

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- generator-/fixture-/hashgruppe: 5/5 testfiler og 22/22 tests
- Generator V1 stress: 4.000/4.000
- Generator V2 stress: 4.000/4.000
- V2 duplicate fingerprints: 0

Fixturehashes er uændrede:

- Generator V2: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Release-tags er uændrede:

- v1.0.0: `634a0eb94f789b950879443b1fc6817aa501b479`
- v2.0.0: `5b6c95e9af04a38add609bd9d19fb0d9bb43a387`
- v2.0.1: `d04850966046a6a6a1c63449dae7f10095ce4918`

## J3C-filer

Aktiv integration:

- `src/App.tsx`
- `src/level2/v2/controller/index.ts`
- `src/level2/v2/controller/variantInput.ts`
- `src/level2/v2/runtime/browserStorage.ts`
- `src/level2/v2/runtime/index.ts`

Integrationtests:

- `tests/level2/controller-ui.test.tsx`
- `tests/level2/phase-controller-ui.test.tsx`
- `tests/level2/v2-controller-random.test.ts`
- `tests/level2/v2-runtime-test-helpers.tsx`
- `tests/level2/v2-workspace-presentation.test.ts`
- `tests/level2/workspace-autosave-ui.test.tsx`

Dokumentation:

- `docs/J3C_V2_1_RUNTIME_INTEGRATION.md`

Der er ingen generator-, fixture-, state schema-, session schema-, workflow-, dependency- eller global stylingændringer. J3C-FIX1 ændrer kun workspace-præsentationen, dens lokale styling og målrettede workspace-tests.

## Status før manuel browserretest

Kode, typer, tests, build, storagekontrakt, stress og fixturehashes er grønne efter J3C-FIX1. Den integrerede browser er fortsat utilgængelig på værten på grund af `CreateProcessWithLogonW failed: 1385`, men brugeren kunne åbne production preview i sin egen browser og identificerede dermed det manglende juni-bilag.

Den fundne præsentationsfejl er rettet og den opdaterede production build er klar til manuel browserretest af B4–B8. J3C og J3C-FIX1 er fortsat ucommittede.
## J3C-FIX2 – faglig afstemningskorrektion og afsluttet opgave

Den manuelle browsertest efter FIX1 viste, at den tidligere C-model var fagligt svag: 2215 og 2223 indeholder både medarbejder- og arbejdsgiverandele, men C bad eleven udskille arbejdsgiverandelene ved hjælp af andre tælleværker. Sammenligningen blev derfor tælleværk mod tælleværk i stedet for bogføring mod ekstern dokumentation.

FIX2 er en pre-release-kontraktkorrektion. B1-B9-posteringer, payrollberegninger, kontoplan, random seed, ranges og draw count er uændrede.

Den nye C-model bruger:

- hele saldoen på 2215 mod fire pensions-tælleværker,
- hele saldoen på 2223 mod fire ATP-tælleværker,
- hele saldoen på 2230 mod bruttoferiepenge ÅTD.

For R1 er resultaterne 260.588 mod 260.588, 14.256 mod 14.256 og 119.574 mod 119.574; alle differencer er 0. Konto 2235 og det konstruerede brugerrettede tælleværk for regulering ÅTD er fjernet fra C. De interne månedlige reguleringsinputs og B9 er bevaret.

D er ændret til en intern kontrol af 2210 + 2211 + 2215 + 2223 + 2230 + 2235. R1-totalen er 2.506.874. D viser ikke en kunstig ekstern tælleværkssum. E er fagligt uændret.

A, B, C og E viser nu eksplicit **Fra bogføringen / T-konto**, **Fra lønsystemets tælleværker**, **Beregnet** eller **Ekstern kontroloplysning**. C har 12 raw string-felter i student state. `sessionSchemaVersion = 2` er bevaret; gammel pre-release C-shape afvises uden silent migration eller automatisk sletning.

Completed viser handlingen **Se afsluttet opgave**. Den lokale read-only gennemgang navigerer mellem B1-B9 og Afstemning og viser source, elevens faktiske godkendte posteringer, split rows, T-konti og checkpointresultater. Den bruger source og student-derived state, har ingen answer-key-presentation, aktiverer ingen mutationer og tilføjer ingen persisted student phase. **Tilbage til afslutning** vender tilbage til completed summary; refresh gør det samme.

Den canonical Generator V2-fixture er regenereret alene på grund af den ændrede pre-release reconciliation/source-kontrakt:

- OLD V2 HASH: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- NEW V2 HASH: `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Afsluttende FIX2-verifikation:

- full suite: 66/66 testfiler og 534/534 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- production build: 120 moduler, JavaScript 330,85 kB, CSS 43,71 kB
- Generator V1 stress: 4.000/4.000
- Generator V2 stress: 4.000/4.000
- V2 duplicate fingerprints: 0
- generator-/fixture-/hashgruppe: 5/5 testfiler og 22/22 tests
- workspace facit-audit: 0 imports/props af answers, expected postings, answer key eller expected checkpoint
- `git diff --check`: PASS
- release-tags v1.0.0, v2.0.0 og v2.0.1: uændrede
- staging, commit, push, merge og deploy: ikke udført

Production preview holdes på `http://localhost:4173/kontering-af-loen-paa-t-konti/`. HTTP-kontrol gav 200 for siden, favicon, JavaScript og CSS efter den afsluttende build. Manuel browsertest af den nye C/D-præsentation og completed-review er næste gate. J3C, FIX1 og FIX2 er fortsat samlet ucommittede.

## J3C-FIX3 – sidste UX-polering

FIX3 er afgrænset til workspace-præsentation, lokal React-visningsstate, styling og målrettede UI-tests. Domain business logic, generator, reconciliation semantics, expected postings, grading, student state machine, session schema, controller semantics, storage keys, B1-B9-progression og Niveau 1 er uændrede.

På desktop fra 1100 px bruger checkpoint-workspacet viewportens tilgængelige højde som flex-layout. A-E-kolonnen og referencekolonnen har hver `min-height: 0`, `overflow-y: auto` og skjult vandret overflow, så de kan scrolles uafhængigt. Under 1100 px bevares det stablede layout med normal sidescroll og uden to tvungne nested scrollområder.

Alle godkendte B1-B9-opgaveposteringer vises nu direkte i T-kontiene i document entry/review, checkpoint/review og completed review. `+ N tidligere` er fjernet for task-posteringer; startsaldoen bevares som særskilt faglig kontekst.

Ved `checkpointReview` vises den eksisterende **Afslut Niveau 2** nederst og den samme callback desuden øverst i statusområdet. Begge knapper bruger den eksisterende `complete`-handling. De vises ikke i et uafsluttet checkpoint, og der er fortsat ingen auto-complete.

Progressionen viser individuelle B1-B9-trin og Afstemning. Tidligere godkendte bilag er klikbare, det aktuelle trin er markeret, og fremtidige trin kan ikke åbnes. Historisk navigation bruger kun lokal workspace-state. Den gemmer, genererer, grader eller flytter ikke controller/student state.

Den historiske bilagsvisning er read-only og viser source, relevante tælleværker, elevens godkendte posting rows og alle 13 T-konti. Den afledte visning medtager startsaldi og godkendte dokumenter til og med det valgte bilag, men ingen senere B-posteringer. Retur til aktuelt bilag, documentReview eller afstemning bevarer raw strings, posting rows, phase, checkpoint-inputs og statuses. Completed review genbruger de samme read-only helpers og bevarer B1-B9, Afstemning, split rows og **Tilbage til afslutning**.

### FIX3-regressioner

Der er tilføjet syv tests ud over FIX2-baselinen:

- alle faktiske B1-B9-posteringer findes direkte i checkpointets T-konti, uden `+ N tidligere`, på tværs af Bankkonto og øvrige konti,
- B1/B2 kan åbnes read-only fra aktiv B3; aktuelt og fremtidige trin er ikke klikbare,
- B2 as-of fra aktiv B5 indeholder B1-B2, men ikke B3-B4, og retur bevarer B5-state,
- retur fra B2 til B4 `documentReview` bevarer review og fortsæt-handlingen,
- retur fra historisk B4 til checkpoint bevarer raw checkpoint-input og state,
- top- og bundknappen gennemfører hver især via den samme eksisterende semantic action,
- CSS-kontrakten dækker desktop-scroll, `min-height: 0`, ingen vandret overflow og naturligt stablet mobilflow.

Source/facit-auditen finder 0 forekomster i `src/level2/v2/workspace` af `answers`, `expectedPostings`, `answerKey` eller `expectedCheckpoint`. Historisk review bygges alene fra source, student state og student-derived selectors.

### Afsluttende FIX3-verifikation

Den første parallelle full-suite-kørsel ramte den kendte sporadiske UI-timeout i fire UI-tests. Alle fire bestod isoleret. Den foreskrevne afsluttende single-worker-kørsel bestod:

- full suite: 66/66 testfiler og 541/541 tests
- Niveau 1-regression: PASS som del af full suite; de to berørte Niveau 1-UI-tests bestod desuden isoleret
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- production build: 121 moduler, JavaScript 330,86 kB, CSS 45,59 kB
- Generator V1 stress: 4.000/4.000, duplicates 0
- Generator V2 stress: 4.000/4.000, 36.000/36.000 balancerede bilag, økonomiske duplicates 0
- `git diff --check`: PASS

Fixturehashes er uændrede efter FIX3:

- Generator V2: `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Production preview svarer 200 på `http://localhost:4173/kontering-af-loen-paa-t-konti/`; favicon, JavaScript og CSS svarer også 200 efter den afsluttende build. Preview-processen holdes kørende.

Den resterende gate er brugerens manuelle browsertest af uafhængig venstre/højre desktop-scroll, synlige fulde T-konti, top/bund-afslutning og read-only historik/retur. J3C, FIX1, FIX2 og FIX3 er fortsat samlet ucommittede; staging, commit, push, merge og deploy er ikke udført.

## J3C-FIX4 – visuelt afstemningslayout og kompakt progression

FIX4 ændrer alene workspace-præsentation, lokal styling og UI-tests. Domain calculations, generator, source, answers, checkpoint state shape, session schema, controller, persistence, B1-B9-progression og Niveau 1 er uændrede.

Completed progress-trin viser nu kun den synlige tekst **B1**, **B2** osv. Den grønne completed-styling er bevaret, og accessible navne angiver fortsat, at trinnet er gennemført. Historiske completed-trin er stadig klikbare. Det aktuelle trin viser fortsat **aktiv**, mens kommende trin er kompakte og ikke kan åbnes.

A og B er fortsat to separate checkpointsektioner med hver sin eksisterende status og gradingaction. På desktop ligger de i to parallelle kort; under 900 px stakkes de. Hvert kort følger samme visuelle rækkefølge:

- bogføring/T-konto,
- medarbejderpension og medarbejder-ATP fra lønsystemets tælleværker,
- live beregnet bruttoløn,
- det eksisterende graderede rå beregningsfelt,
- source-baseret bruttoløn ÅTD,
- live difference.

Live sum og difference beregnes alene i præsentationen fra parsebare raw elevinputs og synlig source. Det afledte beløb skrives ikke til student state. Det eksisterende `calculatedGrossPayYtd`-felt bevares som råt elevinput, fordi det fortsat er en del af den frosne gradingkontrakt. Difference 0 før kontrol vises neutralt; **✓ Stemmer** vises først efter eksisterende grading har sat sektionen til `correct`.

C er fortsat én logisk checkpointsektion med én **Kontrollér sektion C**-handling. Den vises nu som tre semantiske regioner:

- **Pension** med 2215 og kun de fire pensionstælleværker,
- **ATP** med 2223 og kun de fire ATP-tælleværker,
- **Feriepenge – timelønnede** med 2230 og bruttoferiepenge ÅTD.

Pension og ATP står parallelt på desktop; feriepenge ligger full-width under dem. På små skærme stakkes alle tre. Hver region viser live sum/difference. Checked-correct-visningen viser eksplicit Bogført saldo, Sum af tælleværker eller Tælleværk, Difference og **✓ Stemmer**.

Den eksplicitte swapped-ATP-regression bekræfter, at ombytning af månedslønnedes medarbejder- og arbejdsgiver-ATP fortsat afvises af gradingen, selv om den matematiske ATP-total og den neutrale live difference stadig er 0. FIX4 svækker dermed ikke felt-for-felt-kontrakten.

### FIX4-regressioner

Fire nye tests er tilføjet ud over FIX3:

- kompakte completed-progressbobler med accessible completed-status og bevaret historisk klikfunktion,
- live A/B-sum og difference uden skrivning af en derived værdi,
- live C-differencer i de tre semantiske grupper,
- swapped salaried employee/employer ATP afvises fortsat af eksisterende grading.

De eksisterende checkpoint-tests er opdateret til at verificere distinct A/B-kort, korrekt feltorden, adskilte Pension/ATP/Feriepenge-regioner og checked-correct-resultater i de relevante grupper. FIX3-regressionerne for uafhængig scroll, fulde T-konti, top/bund-afslutning og historical as-of navigation består fortsat. Completed review består fortsat read-only.

Source/facit-auditen finder fortsat 0 forekomster i `src/level2/v2/workspace` af `answers`, `expectedPostings`, `answerKey` eller `expectedCheckpoint`.

### Afsluttende FIX4-verifikation

Den parallelle fuldsuite ramte én kendt 5-sekunders user-event-timeout i live A/B-testen. Testen bestod isoleret på 2,26 sekunder. Den afsluttende single-worker-kørsel bestod:

- full suite: 66/66 testfiler og 545/545 tests
- målrettet FIX4/FIX3-gruppe: 4/4 testfiler og 53/53 tests
- checkpoint-UI efter sidste resultatjustering: 17/17 tests
- Niveau 1-regression: PASS som del af full suite
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- production build: 121 moduler, JavaScript 336,11 kB, CSS 47,52 kB
- production preview: side, favicon, JavaScript og CSS svarer HTTP 200 på port 4173
- Generator V1 stress: 4.000/4.000, duplicates 0
- Generator V2 stress: 4.000/4.000, 36.000/36.000 balancerede bilag, økonomiske duplicates 0

Fixturehashes er uændrede:

- Generator V2: `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Den resterende gate er brugerens manuelle browserkontrol af de kompakte progressbobler, A/B-forståelighed, live feedback, tydelig Pension/ATP-adskillelse, feriepengevisningen, FIX3-scroll og completed review. J3C, FIX1, FIX2, FIX3 og FIX4 er fortsat samlet ucommittede; staging, commit, push og deploy er ikke udført.

## J3C-FIX5 – labels og renderingsartefakter

FIX5 er en præsentationsrettelse i det fortsat ucommittede J3C-arbejde. Bogstavelige `` `n``-separatorstrenge er fjernet fra den korrekte C-visning og erstattet af almindelig JSX-struktur, så de ikke kan vises som tekst mellem resultatrækkerne.

A- og B-feltet `calculatedGrossPayYtd` bevarer sin eksisterende state- og gradingbinding, men vises nu som lønsystemets eksterne tælleværk med de præcise labels **Bruttoløn ÅTD – timelønnede – tælleværk** og **Bruttoløn ÅTD – månedslønnede – tælleværk**. Den automatiske beregning vises separat som **Beregnet bruttoløn ÅTD**, og differencen er den live beregnede bruttoløn minus elevens indtastede tælleværk. Domain, generator, source/answer-kontrakter, state shape, grading, session, controller, persistence, progression og Niveau 1 er uændrede.

Checkpoint-UI-testen verificerer begge labels, fravær af den tidligere label **Din beregnede bruttoløn ÅTD** og fravær af bogstavelige `` `n``-artefakter i korrekt C.
### FIX5-verifikation

- målrettet checkpoint-UI: 17/17 tests PASS,
- full suite, single worker: 66/66 testfiler og 545/545 tests PASS,
- `pnpm typecheck`: PASS,
- `pnpm build`: PASS,
- de tre låste canonical fixturehash-tests: 16/16 PASS; Generator V2 `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`, Generator V1 `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342` og V2.0.x R1 `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0` er uændrede,
- `git diff --check`: PASS.

J3C med FIX1–FIX5 er fortsat ucommittet. Der er ingen staged ændringer, commit, push eller deploy.
## Manuel browsergodkendelse

Manuel browsertest gennemført og godkendt 21. september 2026. Brugeren bekræftede efter sidste gennemgang, at Niveau 2 fungerer som ønsket.

- **FIX1:** komplette juni-bilag på B4-B8.
- **FIX2:** fagligt forbedret afstemning med 2215, 2223 og 2230 mod legitime lønsystemstælleværker, D som intern kontrol samt **Se afsluttet opgave**.
- **FIX3:** uafhængig desktop-scroll, alle elevposteringer synlige i T-konti, top- og bundhandling for **Afslut Niveau 2** samt read-only navigation til tidligere bilag.
- **FIX4:** kompakte progressknapper, tydeligt A/B-layout, særskilt Pension/ATP-layout og live beregning/difference.
- **FIX5:** labels rettet og synlige newline-artefakter fjernet.

Den godkendte slutmodel er juni-only med B1-B9. B10-B13, juli-flow og gammel slutkontrol indgår ikke. Progressionen er `documentEntry`, `documentReview`, `checkpoint`, `checkpointReview` og `completed`; kontrol af et trin avancerer ikke automatisk.

Afstemning A dækker timelønnede, B månedslønnede, C afstemmer 2215 Pensioner, 2223 ATP og 2230 Feriepenge – timelønnede mod legitime lønsystemstælleværker. D er intern kontrol af 2210, 2211, 2215, 2223, 2230 og 2235. E afstemmer seks skyldige poster pr. 30/6 mod eksterne kontroloplysninger. Completed viser 9/9, **Afstemning ✓** og **Se afsluttet opgave**.

Den canonical V2.1 Generator V2 fixture SHA-256 er nu frosset som `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`. Generator V1-hashen `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342` og V2.0.x R1-hashen `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0` er fortsat frosne.