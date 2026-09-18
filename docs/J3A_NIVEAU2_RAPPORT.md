# J3A – Niveau 2 controller- og autosaverapport

## Status

Controller, niveauvalg, browser-storage-integration, specific/random start, resume, autosave, retry, reset, replacement confirmation og invalid-session-flow er implementeret på branch `v2`.

Der er ikke implementeret fuldt Niveau 2-workspace, T-konti, bilagsvisning, checkpointformularer, final-control-UI, kontoplanmodal, videogennemgang, deployment eller main-merge. Der er ikke committet eller pushet.

## Ændrede og nye filer

Controllerkode:

- `src/level2/controller/types.ts`
- `src/level2/controller/randomVariant.ts`
- `src/level2/controller/browserStorage.ts`
- `src/level2/controller/newSession.ts`
- `src/level2/controller/controller.ts`
- `src/level2/controller/index.ts`

App-integration:

- `src/App.tsx`
- `src/styles.css`
- `src/ui/Dialog.tsx`

Tests:

- `tests/level2/controller-test-helpers.ts`
- `tests/level2/controller-lifecycle.test.ts`
- `tests/level2/controller-autosave.test.ts`
- `tests/level2/controller-random.test.ts`
- `tests/level2/controller-ui.test.tsx`

Dokumentation:

- `docs/J3A_NIVEAU2_CONTROLLER.md`
- `docs/J3A_NIVEAU2_RAPPORT.md`

Ingen J0-, J1A-, J1B-, J2A- eller J2B-filer er ændret. Niveau 1's domæne-, session-, storage-, grading- og generatorfiler er uændrede.

## Testresultater

- eksisterende tests før J3A: 250/250
- nye J3A-tests: 38/38
- samlet: 288/288
- testfiler: 37/37
- typecheck: PASS
- produktionsbuild: PASS

De eksisterende Niveau 1 React-regressioner: 27/27 PASS.

## Lifecycle og resume

Tests dækker:

- no session → `none`
- valid session → `valid` og resumable
- invalid JSON/session → `invalid`
- getItem-exception → `storageError`
- specifik variant 42
- secure random upper endpoint 999999
- invalid variantinput uden generatorcall
- explicit remove og remove failure
- preloaded session resume

Resume generatorcall count: **0**.

Resume bevarer snapshotindhold, student state og variant. Source audit bekræfter, at generatorfunktionen kun forekommer i `newSession.ts`.

## Autosave

Tests dækker:

- meaningful state update gemmes
- nyt `savedAt` kommer fra injiceret clock
- variant og samme snapshot-reference bevares
- save failure beholder den nye in-memory elevstate
- retry gemmer den aktuelle in-memory session
- retry regenererer ikke og ændrer ikke snapshot
- samme/no-op student-state-reference giver 0 writes og 0 clockcalls
- ingen retry-loop

## Reset og ny opgave

Reset er testet efter elevprogression og bevarer eksakt samme snapshot-reference og variant. Reset kalder ikke generatoren og returnerer blank B1-state.

Ny opgave med en anden variant skaber et nyt snapshot. Existing valid session erstattes først efter confirmation. Cancel ændrer hverken storage eller generatorcall count.

## Storage-isolation

Controller- og UI-tests bekræfter:

- Niveau 2 læser/skriver/fjerner kun `kontering-af-loen-paa-t-konti.level2.session.v1`
- Niveau 1-key'en berøres aldrig af Niveau 2-controlleren
- en valid Niveau 1-session og en valid Niveau 2-session kan eksistere samtidig
- skift mellem niveauer fjerner ingen session
- invalid Niveau 2-session overskrives ikke automatisk

## Secure random audit

Testene dækker:

- variant 1
- variant 999999
- middelværdi
- højeste accepterede uint32
- rejection af acceptance-limit og `0xffffffff`
- range/integer-invariant
- browserkald til `crypto.getRandomValues`

Source audit i nye Niveau 2-filer:

- `Math.random`: 0
- direkte `localStorage`: kun `browserStorage.ts`
- `generateLevel2Case`: kun import/default i `newSession.ts`

## Flowaudit A–H

Flowene er gennemgået gennem faktiske React DOM-handlinger og controllertransaktioner:

- A: home → Niveau 1 → Til forsiden → Niveau 2 setup: PASS
- B: none → variant 42 → start → home → fortsæt → samme variant/session, 0 ekstra generatorcalls: PASS
- C: valid → ny opgave → cancel → gammel raw session uændret: PASS
- D: valid → ny variant → confirm → nyt snapshot og variant: PASS
- E: reset → cancel → persisted session uændret: PASS
- F: reset confirm efter progress → samme variant/snapshot og blank state: PASS
- G: invalid → ingen overwrite → explicit remove → ny opgave kan åbnes: PASS
- H: save failure → in-memory session åben → warning → retry af samme session: PASS

Vite-devserveren startede korrekt på projektets base path. Et forsøg på yderligere visuel audit i den integrerede browser kunne ikke starte browserprocessen på værten og returnerede `CreateProcessWithLogonW failed: 1385`, også efter browserreset. Der er derfor ikke opfundet visuelle browserresultater. React DOM-flowaudit, fuld build og alle UI-regressioner er grønne.

## Fixtures og frosne lag

Canonical SHA-256:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

Begge er uændrede. `v1.0.0` peger fortsat på commit `634a0eb`.

## Blockers før J3B

Der er ingen kendte kode-, kontrakt- eller testblockers før J3B. En visuel browser-smoke kan gentages, når værtsbrowseren igen kan startes; dette ændrer ikke controllerkontrakten.