# J1A – Niveau 2-domænemotor

## Status

J1A er implementeret på branch v2 som en ren, isoleret domænemotor. Der er ikke implementeret UI, session/persistence, random variantgenerator, deployment eller ændringer i Niveau 1.

Det permanente tag v1.0.0 peger fortsat på 634a0eb Finalize v1 release documentation. De fire frosne J0C-dokumenter er uændrede.

## Tilføjede filer

Domæne:

- src/domain/level2/types.ts
- src/domain/level2/ruleset.ts
- src/domain/level2/accounts.ts
- src/domain/level2/payroll.ts
- src/domain/level2/holidayPay.ts
- src/domain/level2/atp.ts
- src/domain/level2/postings.ts
- src/domain/level2/ledger.ts
- src/domain/level2/canonical.ts
- src/domain/level2/readonly.ts
- src/domain/level2/referenceR1.ts
- src/domain/level2/index.ts

Tests og fixture:

- tests/level2/payroll.test.ts
- tests/level2/holiday-pay.test.ts
- tests/level2/atp.test.ts
- tests/level2/reference-history.test.ts
- tests/level2/documents.test.ts
- tests/level2/ledger.test.ts
- tests/level2/checkpoint.test.ts
- tests/level2/reference-regression.test.ts
- tests/fixtures/level2-r1-v1.json

Ingen eksisterende produkt-, test-, fixture- eller konfigurationsfiler er ændret.

## Domænearkitektur

Motoren holder Niveau 2 fysisk adskilt under src/domain/level2/.

- ruleset.ts adskiller rulesetYear = 2026, rulesetVersion = 1 og LEVEL2_GENERATOR_VERSION = 1. Den fælles helkronehelper bruger den frosne positive Math.round-semantik, inklusive .5 opad.
- payroll.ts beregner løn, medarbejder-/arbejdsgiverpension, ATP, AM, A-skat og nettoløn pr. medarbejder. Et negativt beregnet skattegrundlag klampes defensivt til 0, så A-skat aldrig bliver negativ.
- holidayPay.ts beregner bruttoferiepenge, AM, A-skat uden månedsfradrag og nettoferiepenge pr. timelønnet.
- atp.ts leverer måneds-, gruppe- og fler-måneders ATP.
- accounts.ts fastholder de 13 typed konti i deterministisk rækkefølge.
- postings.ts bygger immutable facitposteringer og bilag med eksplicit Debet/Kredit og afledte totaler.
- ledger.ts anvender startsaldi og en vilkårlig posteringsekvens og returnerer kontobevægelser samt Debet-, Kredit- eller nul-saldo.
- referenceR1.ts afleder hele R1 fra medarbejderdata gennem januar–juni, startsaldi, B1–B9, checkpoint, B10–B13 og slutsaldi.
- canonical.ts sorterer objektnøgler leksikografisk i alle niveauer, bevarer arrayrækkefølge og serialiserer uden whitespace.
- readonly.ts fryser referenceoutputtet rekursivt.

Bogførte beløb er ikke-negative integer-kroner. Facit indeholder ingen UI-status som godkendt eller låst.

## R1-resultater

Juni, timelønnede:

- bruttoløn: 163.200
- medarbejderpension: 6.528
- arbejdsgiverpension: 13.056
- medarbejder-ATP: 396
- arbejdsgiver-ATP: 792
- AM-grundlag: 156.276
- AM-bidrag: 12.502
- A-skat: 46.702
- nettoløn: 97.072

Juni, månedslønnede:

- bruttoløn: 202.500
- medarbejderpension: 8.100
- arbejdsgiverpension: 16.200
- medarbejder-ATP: 396
- arbejdsgiver-ATP: 792
- AM-grundlag: 194.004
- AM-bidrag: 15.520
- A-skat: 60.693
- nettoløn: 117.791

Juni, feriepenge for timelønnede:

- bruttoferiepenge: 20.400
- AM-bidrag: 1.632
- A-skat: 7.052
- nettoferiepenge: 11.716

Feriepengeforpligtelsen er modelleret som de to frosne inputs 174.000 og 182.500. Motoren afleder reguleringen 8.500 uden at opfinde en beregningsregel for ultimobeløbet.

## Bilag og ledger

Alle 13 dokumenter findes i fast rækkefølge. **13/13 bilag balancerer**.

Ledgeren afleder pr. 30/6:

| Konto | Saldo |
|---|---:|
| 2210 | 915.932 D |
| 2211 | 1.164.024 D |
| 2215 | 260.588 D |
| 2223 | 14.256 D |
| 2230 | 119.574 D |
| 2235 | 32.500 D |
| 5820 | 1.086.225 D |
| 6920 | 114.447 K |
| 6921 | 14.256 K |
| 6922 | 43.884 K |
| 6923 | 11.716 K |
| 6924 | 182.500 K |
| 6930 | 29.654 K |

De seks driftskonti summerer til **2.506.874 D**.

Efter B10–B13 er de centrale slutsaldi:

- Bank: 879.396 D
- Skyldig A-skat: 0
- Skyldig AM-bidrag: 0
- Skyldig pension: 0
- Skyldige nettoferiepenge – FerieKonto: 0
- Skyldig ATP: 7.128 K
- Feriepengeforpligtelse: 182.500 K

## ÅTD-specifikation og checkpoint

Pension:

- timelønnede, medarbejderandel: 38.262
- timelønnede, arbejdsgiverandel: 76.526
- månedslønnede, medarbejderandel: 48.600
- månedslønnede, arbejdsgiverandel: 97.200
- total: 260.588

ATP:

- timelønnede, medarbejderandel: 2.376
- timelønnede, arbejdsgiverandel: 4.752
- månedslønnede, medarbejderandel: 2.376
- månedslønnede, arbejdsgiverandel: 4.752
- total: 14.256

Bruttoløn ÅTD er 956.570 for timelønnede og 1.215.000 for månedslønnede. Checkpointets samlede lønrelaterede omkostninger er 2.506.874 og matcher ledgerens seks driftskonti.

## Frossen referencefixture

Fixture: tests/fixtures/level2-r1-v1.json

Canonical format:

1. Objektnøgler sorteres leksikografisk på alle niveauer.
2. Arrays bevarer den frosne domænerækkefølge.
3. JSON serialiseres uden insignificant whitespace.
4. SHA-256 beregnes over UTF-8-bytes for den canonical streng.

SHA-256:

9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0

Hashen beskytter ruleset-/generatorversion, kontoplan, medarbejderinput, seks måneders beregninger, startsaldi, alle 13 bilag og posteringer, checkpoint, ÅTD-specifikation og slutsaldi.

## Verifikation

- Niveau 2-testfiler: 8/8 bestået
- Nye Niveau 2-tests: 26/26 bestået
- Eksisterende Niveau 1-tests: 133/133 bestået
- Samlet testresultat: 159/159 bestået
- Typecheck: PASS
- Produktionsbuild: PASS
- Niveau 1-fixture/hash: uændret
- J0C-kontraktdokumenter: uændrede
- UI/session/persistence: ikke implementeret
- Random variantgenerator/PRNG: ikke implementeret

## Punkter før J1B

J1A har ingen faglige eller tekniske blockers. J1B skal fortsat fryse egne generatorvalg for medarbejderantal, løn, timer, skatteparametre, pensionsvarianter, ferieforpligtelse, seed og PRNG. J1A har bevidst ikke valgt eller implementeret disse fordelinger.
