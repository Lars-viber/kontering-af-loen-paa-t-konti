# J1B – V2.1 Generator V2

## Status

Generator V2 er implementeret som et isoleret V2.1-domænemodul. Den aktive V2.0.1-runtime, React, UI, state, session, controller, autosave og workflows er ikke ændret.

J1B er bevidst ikke committed og er klar til gennemgang.

## Baseline og releasebeskyttelse

- J0 freeze: `048944a` – `Freeze v2.1 June reconciliation specification`
- J1A: `bf4867b` – `Implement v2.1 domain and R1 contract`
- J1A er pushed separat til `origin/feature/v2.1-june-reconciliation`.
- `v2.0.1`: `d04850966046a6a6a1c63449dae7f10095ce4918`
- `v2.0.0`: `5b6c95e9af04a38add609bd9d19fb0d9bb43a387`
- `v1.0.0`: `634a0eb94f789b950879443b1fc6817aa501b479`
- Ingen release-tags er flyttet.

## Implementering

Generatoren ligger i:

- `src/domain/level2/v2/generator.ts`
- `src/domain/level2/v2/caseBuilder.ts`

`caseBuilder.ts` bygger source og answer key ad to separate veje. `generator.ts` genererer inputs, bygger casen, fryser hele resultatet rekursivt og validerer den færdige kontrakt.

Identiteten er:

- `rulesetYear = 2026`
- `rulesetVersion = 2`
- `generatorVersion = 2`
- variant: heltal fra 1 til 999999 inklusive
- seed: `payroll-level2:ruleset-2026-v2:generator-v2:<variant>`
- PRNG: FNV-1a 32-bit efterfulgt af Mulberry32, genbrugt uændret fra Generator V1

Variant 42 har seed `payroll-level2:ruleset-2026-v2:generator-v2:42` og FNV-1a-værdien `245780607`.

## Draw-kontrakt

Den verificerede V1-rækkefølge er kopieret med den nye V2-seed:

1. antal timelønnede
2. antal månedslønnede
3. for hver timelønnet: timeløn, skatteprocent, månedsfradrag og timer for januar, februar, marts, april, maj og juni
4. for hver månedslønnet: månedsløn, skatteprocent og månedsfradrag
5. opening liability factor
6. regulering for januar, februar, marts, april, maj og juni
7. bankbuffer

Det giver præcis `10 + 9H + 3M` draws. Der er ingen rejection sampling eller betingede ekstratræk.

## Genererede source-ranges

- 3–6 timelønnede
- timeløn 200–300 i step 5
- 125–180 timer pr. måned
- 3–6 månedslønnede
- månedsløn 38.000–65.000 i step 500
- skatteprocent 36–42
- månedsfradrag 4.000–6.000 i step 250
- opening liability factor 70–100 % i step 5
- positive månedsreguleringer 2.000–10.000 i step 500
- bankbuffer 250.000–750.000 i step 50.000

Pension, ATP, skat og feriepenge beregnes med de eksisterende Level 2-regler. Afrunding sker pr. medarbejder før summering.

## Feriepengeforpligtelse

Generator V1-heuristikken er bevaret:

- udgangspunktet er samlet månedsløn for de månedslønnede gange den genererede factor
- beløbet afrundes til nærmeste 1.000
- 6924 pr. 1/6 er dette udgangspunkt plus reguleringerne januar–maj
- 6924 pr. 30/6 er opening-beløbet plus juni-reguleringen
- 2235 pr. 1/6 er summen af reguleringerne januar–maj
- 2235 pr. 30/6 er summen af reguleringerne januar–juni

B9-source viser kun den bogførte opening-kontekst og den systemopgjorte saldo pr. 30/6. Juni-reguleringen findes ikke som et direkte source field.

## Bank-start

Generatoren bygger først B1-B9 med bank 0 og summerer kun faktiske krediteringer på 5820 i disse ni dokumenter. I den nuværende kontrakt kommer de fra B1, B2, B3, B4 og B7.

Bank-start beregnes som:

`ceil((B1-B9 bankcredits + genereret buffer) / 50.000) * 50.000`

Der indgår ingen reserver til B10-B13 eller juli. Final bank er positiv debit, og den faktiske slutbuffer er mindst den genererede buffer.

## B1-B9 og afstemning

Generatoren bygger præcis B1-B9:

- B1 betaler maj A-skat og AM-bidrag
- B2 betaler maj pension
- B3 betaler maj nettoferiepenge
- B4 og B7 bogfører juni-løn
- B5 og B8 bogfører arbejdsgiverpension og ATP
- B6 bogfører juni-feriepenge
- B9 regulerer feriepengeforpligtelsen

Alle 9 dokumenter indeholder positive hele kronebeløb og balancerer. Slutledgeren indeholder præcis 13 konti pr. 30/6.

Tælleværkerne afledes fra den faktiske januar–juni-historik. Balancekontrollerne afledes fra juni og den akkumulerede ATP-/feriepengeforpligtelse. Reconciliation A-E afledes fra ledger, tælleværker og eksterne kontroller; alle 13 sammenligninger har difference 0.

## Source og answers

Det genererede objekt har separate `source`- og `answers`-grene.

`source` indeholder medarbejdere, seks måneders lønhistorik, startsaldi, dokumentkilder, synlige tælleværker og eksterne balancekontroller. En rekursiv test afviser `expectedPostings`, `answerKey`, `expectedCheckpoint` og `expectedSide` i source.

`answers` indeholder B1-B9-posteringer, final ledger og reconciliation A-E. Hele resultatet er rekursivt frozen, og separate generatorcalls deler ikke mutable arrays eller objekter.

## Fixtures

Ny tracked fixture:

`tests/fixtures/level2-generator-v2-fixtures.json`

Frosne varianter:

- 1
- 2
- 3
- 42
- 999999

Canonical SHA-256:

`595d9488ee7c513563d4b936ccd291fada15908a1d818bcee1ac9a35b7f47941`

Fixtureformatet indeholder version, variant, seed, draw count, alle generatorinputs, startsaldi, dokumentkilder, tælleværker, balancekontroller, B1-B9 debit-/credittotaler, reconciliation A-E og de 13 slutsaldi.

## Stress og regression

Generator V2 stress, varianter 1–4000:

- 4.000/4.000 genereret og runtime-valideret
- 36.000/36.000 dokumenter balanceret
- 0 økonomiske duplicate fingerprints
- fingerprintet er SHA-256 over canonical økonomiske inputs uden variant eller anden identitetsmetadata
- alle observerede værdier var inden for ranges og steps
- observeret medarbejderantal i alt: 6–12
- observeret juni-bruttoløn: 224.495–609.445
- observeret driftsomkostning: 1.535.978–4.158.737
- observeret bank-start: 550.000–1.400.000
- observeret final bank: 250.151–799.928
- observeret feriepengeforpligtelse pr. 30/6: 109.500–400.500

Generator V1 er urørt. Regressionerne bevarer:

- Generator V1 stress: 4.000/4.000
- Generator V1 fixture SHA-256: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`
- V2.0.x R1 SHA-256: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`

## Verifikation

- målrettede J1B-tests: 27/27 PASS
- fuld testpakke: 387/387 PASS i 52 filer
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 114 moduler transformeret
- `git diff --check`: PASS

## J1B-filer

- `src/domain/level2/v2/caseBuilder.ts`
- `src/domain/level2/v2/generator.ts`
- `src/domain/level2/v2/index.ts`
- `tests/fixtures/level2-generator-v2-fixtures.json`
- `tests/level2/v2-generator-fixtures.test.ts`
- `tests/level2/v2-generator-stress.test.ts`
- `tests/level2/v2-generator.test.ts`
- `docs/J1B_V2_1_GENERATOR.md`

Det ignorerede audit-output ligger i `artifacts/j1b-v2-generator-audit.json` og er ikke en del af diffen.

## Blockers for J2

Der er ingen åbne J1B-blockers. J2 skal eksplicit foretage en senere runtime-/state-/sessionintegration; J1B ændrer ingen af disse lag.
