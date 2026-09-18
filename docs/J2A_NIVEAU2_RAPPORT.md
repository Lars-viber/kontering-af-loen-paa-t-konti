# J2A – Niveau 2 state- og gradingrapport

## Status

Den rene state-, grading- og progressionsmotor er implementeret på branch v2. Der er ikke implementeret UI, persistence, sessioncodec, random variantvalg, deployment eller main-merge.

Ingen commit eller push er udført.

## Nye filer

Statekode:

- src/level2/state/types.ts
- src/level2/state/case.ts
- src/level2/state/amountParser.ts
- src/level2/state/stateUtils.ts
- src/level2/state/documentState.ts
- src/level2/state/documentGrading.ts
- src/level2/state/checkpointState.ts
- src/level2/state/finalControl.ts
- src/level2/state/selectors.ts
- src/level2/state/index.ts

Tests:

- tests/level2/state-helpers.ts
- tests/level2/state-parser.test.ts
- tests/level2/document-state.test.ts
- tests/level2/checkpoint-state.test.ts
- tests/level2/final-state.test.ts
- tests/level2/state-immutability.test.ts

Dokumentation:

- docs/J2A_NIVEAU2_STATE.md
- docs/J2A_NIVEAU2_RAPPORT.md

Ingen eksisterende filer er ændret.

## Dokumentgrading

Testene bekræfter:

- B1 er aktiv ved start
- B2–B13 er pending
- alle 13 konti kan vælges
- ukendt kontonummer afvises
- flere rækker kan opfylde én expected gruppe
- splitposteringer låser hele gruppen
- Debet/Kredit-netting afvises
- manglende grupper markeres uden facitbeløb
- unexpected konto/side forhindrer completion
- correct grupper er write-protected
- incorrect grupper er redigerbare
- edit nulstiller incorrect til unchecked
- helt tomme drafts prunes
- tekst uden beløb er incomplete
- elevtotaler bruger kun student rows
- B1–B9 åbnes sekventielt
- B9 fører til checkpoint

Facit læses udelukkende fra den injicerede case.

## Parser

Postingparseren er testet med:

- ugrupperede tal
- punktumgrouping
- space grouping
- NBSP
- narrow NBSP
- blank draft
- nul
- fortegn
- decimaler
- valutaord
- eksponentformat
- Infinity og NaN
- fejlagtig eller blandet grouping
- unsafe integers

Postingparseren kræver positive hele kroner. Checkpointparseren accepterer også 0.

## Checkpoint

Testene bekræfter:

- forkert sektion er incorrect og redigerbar
- edit nulstiller incorrect til unchecked
- korrekt sektion låses samlet
- locked sektion ignorerer writes
- E kræver både korrekt beløb og korrekt D/K
- alle A–E korrekte åbner B10
- B1–B9 forbliver completed/read-only

Checkpointet er testet mod både R1 og den allerede genererede variant 42. Der er ingen hardcodede R1-beløb i state-laget.

## Final control og completion

Testene bekræfter:

- B13 fører til finalControl
- seks read-only saldi kommer fra final ledger
- forkert reason giver incorrect
- ændring nulstiller incorrect til unchecked
- korrekt item låses
- seks korrekte items fører til completed
- completed state ignorerer alle efterfølgende writes
- reset returnerer den deterministiske blanke startstate

## Immutability

Tests bekræfter:

- previous state muteres ikke
- injiceret generated case muteres ikke
- returneret state er rekursivt frozen
- locked state muteres ikke
- completed state muteres ikke
- student state indeholder ikke variant, caseSnapshot eller savedAt

## Verifikation

- eksisterende tests før J2A: 174/174
- nye J2A-tests: 43/43
- samlet testresultat: 217/217
- testfiler: 29/29
- typecheck: PASS
- produktionsbuild: PASS

Fixturehashes:

- J1A R1: 9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0
- J1B Generator v1: a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342

Begge hashes er uændrede.

## Source audit

Søgning i src/level2/state gav 0 forekomster af:

- generateLevel2Case
- import fra generator
- Math.random
- Date.now
- localStorage
- getRandomValues
- session
- React

State-laget udfører 0 generatorcalls.

## Blockers før J2B

Der er ingen kendte faglige eller tekniske blockers før J2B.

J2B skal implementere separat persistence med eget schema, storage key, caseSnapshot og savedAt. Restore skal bruge caseSnapshot som autoritet og udføre 0 generatorcalls. Dette er kun dokumenteret og ikke implementeret i J2A.
