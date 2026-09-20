# J3A – V2.1 controller, autosave og sessionorkestrering

## Status

J3A er implementeret som et isoleret V2.1-lag og er klar til gennemgang. J3A er ikke committed. Den aktive app og V2.0.1-runtime er ikke koblet om.

## Commitkæde

- J0: `048944a` – Freeze v2.1 June reconciliation specification
- J1A: `bf4867b` – Implement v2.1 domain and R1 contract
- J1B: `2e3bb6b` – Implement v2.1 generator v2
- J2A: `f6bca0c` – Implement v2.1 student state machine
- J2B: `1c971b1` – Implement v2.1 session persistence

J2B blev verificeret med 455/455 tests, typecheck, build samt stress/hash-regression, committed separat og pushed til `origin/feature/v2.1-june-reconciliation`, før J3A blev påbegyndt.

## Modul og afhængigheder

Controlleren ligger i:

`src/level2/v2/controller/`

Den afhænger ensrettet af:

- `src/domain/level2/v2/`
- `src/level2/v2/state/`
- `src/level2/v2/session/`

Domain, state og session importerer ikke controlleren. Aktiv `App.tsx`, `src/level2/controller/`, `src/level2/state/`, `src/level2/session/`, styles og workspace er urørte.

Kun `newSession.ts` importerer `generateV2Case`. Load, reset, retry, autosave og student actions importerer eller kalder ikke generatoren. En source-audit låser denne grænse og bekræfter samtidig, at controlleren ikke bruger `Math.random`, og at `App.tsx` ikke importerer V2.1-controlleren.

## Controllerens runtime-model

Den aktuelle in-memory-model indeholder:

- variant
- authoritative `caseSnapshot`
- aktuelt immutable `studentState`
- `saveStatus`: `saved` eller `saveFailed`
- `lastSuccessfulSavedAt`
- typed `lastSaveFailure`

Controllerstatus gemmes ikke i student state. Student transitions bevarer samme in-memory `caseSnapshot`-reference og variant.

## Ny opgave

En eksplicit variant valideres som et heltal i intervallet 1–999999. En gyldig start kalder generatoren præcis én gang, opretter frisk state ved B1/documentEntry og forsøger én save via J2B. Ugyldige tal og runtime-string input giver typed `invalidVariant` uden generatorcall, storage write eller sletning.

En eksplicit ny opgave overskriver V2-key direkte via `setItem`. Der foretages ingen remove-before-save. Hvis overskrivningen fejler, bliver den tidligere persisted V2-session liggende, mens den nye case og state bevares i memory med `saveFailed`.

## Tilfældig variant

Random start bruger en injicerbar uint32-source. Production-default bruger `globalThis.crypto.getRandomValues`.

Mappingen til 1–999999 anvender rejection sampling over uint32-rummet. Den ufuldstændige tail afvises før modulo, så der ikke opstår modulo bias. Random draw kan gentages, men generatoren kaldes først efter valg af variant og da præcis én gang. En kastende eller ugyldig source giver typed `randomFailure`; der findes ingen `Math.random`-fallback.

## Continue og legacy

`loadCurrentV2ControllerSession` bruger J2B-load som autoritativ kilde og regenererer aldrig. Resultaterne er typed som:

- `loaded`
- `missing`
- `invalid`
- `storageFailure`

Resultatet eksponerer samtidig legacy V1-presence som `true`, `false` eller `null`, hvis presence-checket ikke kunne læses. Legacy V1 migreres, ændres eller slettes ikke. Invalid V2 falder ikke tilbage til V1.

Restore-tests dækker:

- documentReview på B4
- documentReview på B9
- delvist checkpoint med korrekte, forkerte og urørte sektioner
- checkpointReview
- completed

Alle restores bruger 0 generatorcalls og bevarer persisted snapshot, variant, student values og progression.

## Reset

Reset opretter kun en frisk V2.1 student state for den aktuelle authoritative case:

- samme variant
- samme `caseSnapshot`-reference
- B1/documentEntry
- ingen student rows
- tomt checkpoint
- 0 generatorcalls

Reset forsøger autosave. Ved write failure forbliver reset-state aktuel i memory, og retry kan gemme den senere. Legacy V1 berøres ikke. Både variant 42 og 999999 er dækket af create/load/reset-tests.

## Student actions og progression

Controlleren videresender alle transitions til J2A-API’erne og duplikerer ingen gradinglogik:

- add, edit og remove posting row
- check current document
- explicit advance fra documentReview
- checkpoint amount edit
- checkpoint balance edit
- check checkpoint section
- explicit complete

`CHECK != ADVANCE` er bevaret. Et korrekt bilag autosaves som documentReview. Først den eksplicitte advance-action åbner næste bilag, og B9 åbner først checkpoint efter denne action. Når A–E er korrekte, autosaves checkpointReview. Kun explicit complete skifter til completed.

En generated variant 42 er kørt gennem alle B1–B9, checkpoint A–E, checkpointReview og explicit complete via controlleractions. Completed-state er fortsat write-protected.

## Autosave, no-op og savedAt

En reel stateændring:

1. bruger samme caseSnapshot og variant,
2. opretter en J2B-session med den nye state,
3. henter én timestamp fra den injicerede clock,
4. forsøger én storage write.

Hvis J2A returnerer samme state-reference, returnerer controlleren samme current-reference. Der sker ingen write og ingen clock-call.

Ved save failure bevares den nyeste student state i memory. State rulles ikke tilbage, casen regenereres ikke, og `lastSuccessfulSavedAt` ændres ikke. Nye transitions kan fortsætte i memory. `retryV2ControllerSave` gemmer den aktuelle nyeste state, ikke det tidligere fejlende snapshot. En succesfuld retry rydder failure-status og opdaterer `lastSuccessfulSavedAt` med retry-forsøgets timestamp.

## Tests og regression

Nye J3A-tests:

- 4 testfiler
- 37 controllertests
- explicit/random lifecycle, unbiased picker og rejection path
- generatorcall-grænser
- legacy coexistence
- load/reset/retry
- autosave/no-op/save failure
- alle student actions
- review/checkpoint/completed restore
- complete generated variant-42 flow
- variant-999999 smoke
- dependency/source audit

Slutkontrol:

- målrettet J3A: 37/37 PASS
- fuld suite, afsluttende serialiseret kørsel: 492/492 PASS i 62 testfiler
- typecheck: PASS
- build: PASS, 114 modules transformed
- Generator V1 stress: 4.000/4.000 PASS
- Generator V2 stress: 4.000/4.000 PASS
- Generator V2 duplicate fingerprints: 0
- stress/hash-regression: 22/22 PASS i 5 testfiler

Den første parallelle fuldkørsel ramte to eksisterende 5-sekunders UI-timeouts; den anden ramte én af de samme tests. De konkrete testfiler bestod isoleret 11/11 og 8/8. Den afsluttende fulde suite med én worker bestod 492/492. Ingen UI-test eller aktiv runtime blev ændret.

## Frosne canonical fixturehashes

- Generator V2: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Alle tre blev verificeret af de eksisterende canonical SHA-256-tests og er uændrede.

## Ændrede filer

Controller:

- `src/level2/v2/controller/controller.ts`
- `src/level2/v2/controller/index.ts`
- `src/level2/v2/controller/newSession.ts`
- `src/level2/v2/controller/randomVariant.ts`
- `src/level2/v2/controller/types.ts`

Tests:

- `tests/level2/v2-controller-autosave-flow.test.ts`
- `tests/level2/v2-controller-lifecycle.test.ts`
- `tests/level2/v2-controller-random.test.ts`
- `tests/level2/v2-controller-restore.test.ts`
- `tests/level2/v2-controller-test-helpers.ts`

Rapport:

- `docs/J3A_V2_1_CONTROLLER.md`

## Blockers før UI-integration

Ingen kontrakt- eller implementeringsblockers er åbne. UI-integration er bevidst ikke en del af J3A. J3A-diffen skal gennemgås og godkendes, før den committes eller kobles til browserruntime.
