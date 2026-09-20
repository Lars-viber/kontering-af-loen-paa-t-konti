# J2B – V2.1 Session Schema, Persistence og Restore

## Status

Det isolerede V2.1 session- og persistence-lag er implementeret under `src/level2/v2/session/`. Den aktive V2.0.1-session under `src/level2/session/`, React, UI, controller, autosave og runtimevalg er uændrede.

J2B er bevidst ikke committed og er klar til gennemgang.

## Baseline

- J0 freeze: `048944a`
- J1A: `bf4867b`
- J1B: `2e3bb6b`
- J2A: `f6bca0c` – `Implement v2.1 student state machine`
- J2A er pushed separat til `origin/feature/v2.1-june-reconciliation`.

Release-tags er uændrede.

## Sessionsidentitet og format

Frosne værdier:

- `sessionSchemaVersion = 2`
- `rulesetYear = 2026`
- `rulesetVersion = 2`
- `generatorVersion = 2`
- storage key: `kontering-af-loen-paa-t-konti.level2.session.v2`
- legacy presence key: `kontering-af-loen-paa-t-konti.level2.session.v1`

Et persisted snapshot indeholder præcis:

- `schemaVersion`
- `rulesetYear`
- `rulesetVersion`
- `generatorVersion`
- `variant`
- `caseSnapshot`
- `studentState`
- `savedAt`

`savedAt` følger den eksisterende strikte UTC ISO-kontrakt. Sessionbuilderen modtager timestamp eksplicit og er derfor deterministisk og testbar.

## Autoritativt case snapshot

`caseSnapshot` indeholder den komplette V2.1-case med separate `source`- og `answers`-grene. Restore bruger udelukkende det persistede snapshot.

Sessionlaget importerer eller kalder ikke Generator V1 eller Generator V2. Der findes ingen `generateV2Case`- eller `generateLevel2Case`-reference i sessionkoden. Generatoren bruges kun i testlaget, før snapshotbuilderen kaldes.

Casevalideringen kontrollerer:

- variant 1–999999 og den eksakte V2-seedidentitet
- draw count `10 + 9H + 3M`
- ruleset- og generatorversioner
- alle employee ranges og steps
- feriepengeforpligtelsens matematiske relationer
- bankbuffer og eksakt bank-start
- source/answers-separation
- B1-B9, tælleværker, kontroller, reconciliation og final ledger

Source og answers genopbygges med den pure V2.1 domain case builder ud fra de gemte inputs og sammenlignes canonical med snapshotværdierne. Det opdager ændringer i dokumenter, kontoplan, tælleværker, postings, reconciliation og final ledger uden at regenerere random input.

Sessionvariant og versionsmetadata skal matche case snapshot. Der findes ingen tolerant fallback eller conversion.

## Student state og cross-validation

Restored `studentState` gennemgår både strukturel validation, J2A-runtimeinvariants og caseafhængig stærk gradingvalidation.

Der valideres blandt andet:

- præcis B1-B9
- de fem J2A-faser
- current document og sekventielle dokumentstatusser
- row IDs, konti, sider og raw strings
- grading group-identiteter og statuses
- checkpoint A-E-form og D/K-input
- documentReview kræver korrekt dokument
- checkpoint kræver 9/9 completed
- checkpointReview/completed kræver A-E correct
- korrekte og forkerte document groups regrades mod snapshot.answers
- korrekte og forkerte checkpointsektioner regrades mod snapshot.answers
- checkpointdata er pristine før checkpointfasen

Tampering bliver `invalidStudentState`; data regenereres eller repareres ikke.

## Codec og immutability

Encoding validerer sessionen og bruger deterministisk `JSON.stringify` uden at mutere input.

Decode håndterer typed:

- tom input
- malformed JSON
- null, arrays og primitives
- missing/extra fields
- forkert schema/ruleset/generatorversion
- ugyldig variant og savedAt
- invalid case snapshot
- invalid student state
- session/snapshot mismatch

Efter valid decode deep-freezes hele sessionen, case source, answers, student state, dokumenter og rækker. Separate loads deler ingen mutable objekter.

Roundtrip er testet med variant 42 og 999999.

## Restorede faser

Følgende er bevaret præcist over encode/decode:

- partial `documentEntry` med correct/incorrect groups og raw strings
- split rows som separate rækker
- `documentReview(B4)`, uden automatisk åbning af B5
- `documentReview(B9)`, uden automatisk åbning af checkpoint
- partial checkpoint med A/E correct, B/D incorrect og C unchecked
- `checkpointReview`, uden automatisk completion
- `completed`

Efter restore virker de eksplicitte J2A-actions fortsat:

- B4 review kan advances til B5 entry
- B9 review kan advances til checkpoint
- checkpointReview kan completes eksplicit
- completed write protection er bevaret

Alle 13 student-derived saldi ved checkpoint er identiske før og efter restore og matcher variant 42's final ledger. Selectorberegningen bruger fortsat elevrækker og opening balances.

## Storage og legacy policy

Storageadapteren har kun `getItem`, `setItem` og `removeItem` og kan testes uden browserstorage.

- save skriver kun v2-key
- load læser kun v2-key
- remove fjerner kun v2-key
- invalid v2-data rapporteres og slettes ikke
- read/write/remove exceptions konverteres til typed `storageFailure`
- write failure udfører ingen retry og sletter ikke tidligere data

Legacydetektionen læser kun v1-key og returnerer `legacyV1Present`. Den parser, migrerer, omskriver eller sletter aldrig V1.

Testede kombinationer:

- V1 uden V2: V2 er missing, legacy er present, ingen migration
- V1 + valid V2: V2 restores, legacy forbliver present
- V1 + invalid V2: V2 rapporteres invalid, ingen fallback til V1
- V2 remove: kun v2-key fjernes
- Level 1-data forbliver urørt

## Isolation

V2.1-sessionlaget importerer ikke:

- generator
- controller
- browserstorage
- React
- aktiv V2.0.1-session

Der er ingen parent runtime export eller App-rewire. Den aktive app skriver derfor fortsat ikke v2-key.

## Tests og regression

Nye J2B-tests:

- 33/33 PASS i 3 testfiler
- schema- og keyidentitet
- variant 42 og 999999
- encode/decode og source/answers
- deep freeze og separate object graphs
- malformed/invalid input
- case og state tampering
- alle krævede phase-roundtrips
- student-derived balances
- zero-generator restore
- V1/V2 coexistence og no migration
- storage failures og v2-only remove

Samlet verifikation:

- fuld testpakke: 455/455 PASS i 58 filer
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 114 moduler transformeret
- Generator V1 stress: 4.000/4.000 PASS
- Generator V2 stress: 4.000/4.000 PASS
- Generator V2 duplicate fingerprints: 0

Fixturehashes er uændrede:

- Generator V2: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Den tidligere sporadiske UI-timeout optrådte ikke under J2B-verifikationen. Ingen UI- eller UI-testkode er ændret.

## Ændrede filer

Session:

- `src/level2/v2/session/caseValidation.ts`
- `src/level2/v2/session/codec.ts`
- `src/level2/v2/session/constants.ts`
- `src/level2/v2/session/createSession.ts`
- `src/level2/v2/session/index.ts`
- `src/level2/v2/session/sessionValidation.ts`
- `src/level2/v2/session/storage.ts`
- `src/level2/v2/session/studentStateValidation.ts`
- `src/level2/v2/session/types.ts`
- `src/level2/v2/session/validationUtils.ts`

Tests:

- `tests/level2/v2-session-codec.test.ts`
- `tests/level2/v2-session-restore.test.ts`
- `tests/level2/v2-session-storage.test.ts`
- `tests/level2/v2-session-test-helpers.ts`

Dokumentation:

- `docs/J2B_V2_1_SESSION.md`

## Blockers for controllerintegration

Der er ingen åbne J2B-blockers. En senere controller kan eje caseoprettelse, timestamp/autosave og presentationgrænser ved at bruge dette sessionlag uden at ændre restorekontrakten.
