# J2B – Niveau 2 session- og restorerapport

## Status

En separat, defensiv persistencekontrakt for Niveau 2 er implementeret på branch `v2`. Der er ikke implementeret React, UI, menu, autosave, browsernavigation, random variantvalg, deployment eller main-merge. Niveau 1 og de frosne J0/J1A/J1B/J2A-lag er ikke ændret.

## Nye filer

Sessionkode:

- `src/level2/session/constants.ts`
- `src/level2/session/types.ts`
- `src/level2/session/validationUtils.ts`
- `src/level2/session/caseValidation.ts`
- `src/level2/session/studentStateValidation.ts`
- `src/level2/session/sessionValidation.ts`
- `src/level2/session/codec.ts`
- `src/level2/session/createSession.ts`
- `src/level2/session/storage.ts`
- `src/level2/session/index.ts`

Tests:

- `tests/level2/session-test-helpers.ts`
- `tests/level2/session-codec.test.ts`
- `tests/level2/session-validation.test.ts`
- `tests/level2/session-storage.test.ts`
- `tests/level2/session-restore.test.ts`

Dokumentation:

- `docs/J2B_NIVEAU2_SESSION.md`
- `docs/J2B_NIVEAU2_RAPPORT.md`

## Kontrakt

- schemaVersion: `1`
- storage key: `kontering-af-loen-paa-t-konti.level2.session.v1`
- rulesetYear: `2026`
- rulesetVersion: `1`
- generatorVersion: `1`
- caseSnapshot er autoritativ ved restore
- restore udfører 0 generatorcalls
- successful decode/load returnerer en rekursivt frozen session
- invalid session giver typed failure og overskrives ikke
- storagefejl kastes ikke videre til caller

## Roundtrip-tests

Testene dækker:

- generatorvariant 42 med versions- og snapshotidentitet
- B1 aktiv
- B4 med både correct og incorrect grupper
- checkpoint med correct A og incorrect B
- B11 aktiv efter correct checkpoint og B10
- finalControl med både correct og incorrect items
- completed state
- splitpostering med to elevrækker i samme gradinggruppe
- bevaring af row IDs og correct/locked-semantik
- rå strings med punktum, spaces, NBSP og narrow NBSP
- tekster med ledende og efterfølgende spaces
- encode uden mutation af inputsessionen
- deep-freeze af session, snapshot, state, arrays og nested objects

## Corruption-tests

Codec- og casekorruption:

- tom/whitespace input og malformed JSON
- null, primitive, array og manglende top-level-shape
- ekstra top-level-felt
- schemaVersion 0 og fremtidig schemaVersion
- forkert rulesetYear, rulesetVersion og generatorVersion
- ugyldig UTC-timestamp
- session/snapshot variant mismatch
- ændret snapshotvariant og snapshotversion
- fjernet og ombyttet bilag
- negativt og decimalt posteringsbeløb
- ukendt konto og ubalanceret/tampered bilag
- manipuleret checkpointbalance og final balance
- manipulerede feriepenge- og bankinput
- unsafe integer

Student-state-korruption:

- duplicate rowId og kolliderende nextRowId
- ukendt documentId og accountNumber
- ugyldig side og gruppestatus
- falsk `correct` gradinggruppe
- aktivt dokument ude af progression og to aktive dokumenter
- checkpoint/finalControl for tidligt
- checkpointinput før checkpoint
- manipuleret correct checkpointsektion
- manglende automatisk overgang efter alle checkpointsektioner er correct
- completed flag/phase mismatch
- ukendt og falsk correct final reason ID

## Storage-tests

Fake storage bekræfter:

- save/load/remove bruger kun Niveau 2-key'en
- Niveau 1-key'en læses, skrives og fjernes aldrig
- manglende session giver `none`
- corrupt session giver `invalid` uden overwrite/remove
- get-, set- og remove-exceptions giver typed storage failure
- der udføres ingen retry

## Restore og source audit

Sessionmodulet importerer eller kalder ikke generatorfunktionen. Source audit søger hele `src/level2/session/` og kræver 0 forekomster af:

- generatorfunktionsnavnet
- `Math.random`
- `Date.now`
- `getRandomValues`
- `localStorage`
- `React`

Restore generatorcall count: **0**.

## Verifikation

- eksisterende tests før J2B: 217/217
- nye J2B-tests: 33/33
- samlet testresultat: 250/250
- testfiler: 33/33
- typecheck: PASS
- produktionsbuild: PASS

Fixturehashes:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

Begge er uændrede.

## Blockers før næste fase

Der er ingen kendte faglige eller tekniske blockers. Næste fase kan integrere den frosne kontrakt i menu/controller/autosave, men J2B indeholder ingen af disse UI-opgaver.

