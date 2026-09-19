# J2A – V2.1 State Machine

## Status

Den isolerede V2.1 student state/state machine er implementeret under `src/level2/v2/state/`. Den aktive V2.0.1-state under `src/level2/state/`, React, UI, session, controller, autosave og runtimevalg er uændrede.

J2A er bevidst ikke committed og er klar til gennemgang.

## Baseline

- J0 freeze: `048944a`
- J1A: `bf4867b`
- J1B: `2e3bb6b` – `Implement v2.1 generator v2`
- J1B er pushed separat til `origin/feature/v2.1-june-reconciliation`.

Release-tags er uændrede:

- `v2.0.1`: `d04850966046a6a6a1c63449dae7f10095ce4918`
- `v2.0.0`: `5b6c95e9af04a38add609bd9d19fb0d9bb43a387`
- `v1.0.0`: `634a0eb94f789b950879443b1fc6817aa501b479`

## Statekontrakt

State-modulet eksponerer præcis fem aktive faser:

- `documentEntry`
- `documentReview`
- `checkpoint`
- `checkpointReview`
- `completed`

Initial state er `documentEntry` med `currentDocumentId = B1`. B1 er aktiv, B2-B9 er pending, alle elevrækker og grupper er tomme, og checkpoint A-E er `unchecked`.

State er plain, rekursivt frozen data uden functions, Map, Set, DOM-værdier eller Date-objekter. Både `documentReview` og `checkpointReview` ligger eksplicit i state og kan derfor senere serialiseres og restore uden faseinferens.

## Dokumentgrading og partial locking

Elevrækker bevarer:

- stabilt `rowId`
- dokument
- konto
- side
- rå beløbsstreng
- tekst

Flere rækker på samme konto og side bevares. Grading grupperer efter dokument + konto + side og sammenligner summen af elevens positive hele kronebeløb med facitgruppens sum. Debet og kredit nettes ikke.

En korrekt gruppe låses individuelt. Forkerte og ukontrollerede grupper kan fortsat redigeres, få rækker tilføjet og få rækker fjernet i `documentEntry`. En redigering af en forkert gruppe nulstiller kun denne gruppe til `unchecked`.

En fuldt korrekt check foretager:

`documentEntry -> documentReview`

Det aktuelle dokument forbliver valgt, samtlige elevrækker bevares, og hele dokumentet er readonly. Check åbner aldrig automatisk næste dokument.

Den separate action `advanceFromV2DocumentReview()` foretager:

- B1 review til B2 entry
- ...
- B8 review til B9 entry
- B9 review til checkpoint

Advance uden for `documentReview` returnerer samme state uændret. Der kan derfor ikke springes over dokumenter.

## Progression og approved history

`selectV2Progress()` afleder uden persisted counter:

- fase
- aktuelt dokument
- antal completed dokumenter
- antal resterende dokumenter

I B3 entry er B1-B2 completed. I B3 review tæller B3 også som completed. Fra checkpoint og frem er tælleren 9/9.

`selectV2ApprovedRows()` returnerer kun elevens egne rækker fra korrekte grupper og kan filtrere på dokument, konto og side. Splitrækker forbliver separate i approved history.

## Student-derived balances

`selectV2StudentDerivedBalance()` og `selectAllV2StudentDerivedBalances()` beregner T-kontosaldi fra:

- casens opening balances
- elevens approved rows
- gyldige aktuelle rækker under `documentEntry`

Selectors modtager ikke answer key eller final ledger. Ved checkpoint matcher de 13 student-afledte saldi både håndfrosset R1 og Generator V2 variant 42's final ledger i testene.

Presentation-orienterede selectors indeholder ingen expected postings, expected groups, reconciliation-facit eller final balances.

## Checkpoint A-E

Checkpointstate bevarer rå strenge for:

- A og B: lønkonto, medarbejderpension, medarbejder-ATP og beregnet bruttoløn ÅTD
- C: arbejdsgiverpension, arbejdsgiver-ATP, bruttoferiepenge og regulering ÅTD
- D: samlede lønrelaterede omkostninger
- E: beløb samt D/K for seks balancekonti

Checkpointbeløb accepterer 0 og positive hele kroner. Negative beløb, decimaler, tekst og NaN-lignende input afvises.

A-E grades separat mod den injicerede V2.1 reconciliation answer contract. En korrekt sektion låses, mens øvrige sektioner forbliver editable. Når alle fem er korrekte, foretages:

`checkpoint -> checkpointReview`

State går ikke automatisk til completed. `completeV2Level()` er en særskilt action, der kun kan foretage:

`checkpointReview -> completed`

## Completed og runtimeinvariants

Completed har:

- 9/9 completed dokumenter
- A-E correct
- intet aktuelt dokument
- ingen juli- eller slutkontrolstate

Alle edit-, add-, remove-, check-, advance- og complete-actions returnerer samme state efter completion.

Runtimevalideringen håndhæver blandt andet:

- præcis B1-B9 i korrekt rækkefølge
- kun de fem faser
- sekventielle pending/active/completed dokumentstatusser
- review kræver et fuldt korrekt aktuelt dokument
- checkpoint kræver 9/9 completed
- checkpointReview og completed kræver A-E correct
- unikke positive row IDs
- gyldige konti, sider og rå strengværdier
- præcis de seks checkpointbalancekonti

Tests afviser review med incorrect gruppe, checkpoint før B1-B9, checkpointReview/completed med ukorrekte sektioner og ukendt dokument-ID.

## Isolation

Statekoden importerer ikke og refererer ikke til:

- Generator V1 eller Generator V2
- storage
- sessionkode
- controller
- autosave
- React
- aktiv V2.0.1-state

Der findes ingen aktive V2.1-statebegreber for slutkontrol, reason IDs eller B10-B13. Parent runtime exports er ikke ændret, så appen bruger fortsat V2.0.1.

## Tests og regression

Nye J2A-tests:

- 35/35 PASS i 3 testfiler
- fuldt B1-B9-flow med review og explicit advance
- partial document locking
- splitposteringer og raw strings
- checkpoint partial success
- checkpointReview og explicit completion
- completed write protection
- R1 full stateflow
- Generator V2 variant 42 stateflow
- alle 13 student-derived balances for R1 og variant 42
- serialisering, immutability, source audit og invalid-state validation

Samlet verifikation:

- fuld testpakke: 422/422 PASS i 55 filer
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 114 moduler transformeret
- Generator V1 stress: 4.000/4.000 PASS
- Generator V2 stress: 4.000/4.000 PASS
- Generator V2 duplicate fingerprints: 0

Fixturehashes er uændrede:

- Generator V2: `595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`
- Generator V1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

Den sporadiske eksisterende UI-timeout fra J1B optrådte ikke i J2A's fulde suite. Ingen UI- eller UI-testkode er ændret.

## Ændrede filer

State:

- `src/level2/v2/state/amountParser.ts`
- `src/level2/v2/state/index.ts`
- `src/level2/v2/state/selectors.ts`
- `src/level2/v2/state/state.ts`
- `src/level2/v2/state/types.ts`
- `src/level2/v2/state/validation.ts`

Tests:

- `tests/level2/v2-state-checkpoint.test.ts`
- `tests/level2/v2-state-documents.test.ts`
- `tests/level2/v2-state-flow.test.ts`
- `tests/level2/v2-state-helpers.ts`

Dokumentation:

- `docs/J2A_V2_1_STATE.md`

## Blockers for J2B

Der er ingen åbne J2A-blockers. J2B kan bygge session, persistence og restore oven på den eksplicit serialiserbare fase- og statekontrakt.
