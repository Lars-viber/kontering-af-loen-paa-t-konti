# J1A – V2.1 domæne og R1

## 1. Status

J1A implementerer et isoleret V2.1-domænelag og en håndfrosset R1-reference. Den aktive V2.0.1-runtime, UI, state, session, controller, generator og fixtures er ikke ændret.

J1A-koden er klar til gennemgang og er ikke committed.

## 2. J0-freeze

De fem godkendte V2.1-specifikationsdokumenter blev terminologisk normaliseret til den konsekvente fagterm **tælleværk/tælleværker** og derefter frosset særskilt.

- Commit: `048944a`
- Commit message: `Freeze v2.1 June reconciliation specification`
- Branch: `feature/v2.1-june-reconciliation`
- Push: `origin/feature/v2.1-june-reconciliation`

## 3. Modulplacering og isolation

V2.1-domænet ligger under:

`src/domain/level2/v2/`

Den eksisterende aktive exportfil `src/domain/level2/index.ts` er ikke ændret. Den almindelige app importerer derfor fortsat V2.0.1-kontrakten.

V2.1-undermodulet består af:

- `types.ts`: versionsspecifikke typer og ID-unions
- `constants.ts`: versionsidentitet, satser, måneder og bilagstitler
- `accounts.ts`: den frosne 13-kontoplan
- `helpers.ts`: pure dokument-, ledger- og afstemningshelpers
- `r1Source.ts`: medarbejderdata, januar-juni-historik, dokumentkilder, tælleværker og eksterne kontroloplysninger
- `r1Answers.ts`: forventede posteringer, 30/6-ledger og checkpoint A-E
- `validation.ts`: runtime-validation af source- og answer-kontrakter
- `referenceR1.ts`: valideret samlet R1-reference
- `index.ts`: exports alene for det isolerede V2.1-undermodul

## 4. Versionskontrakt

| Felt | Værdi |
|---|---:|
| `rulesetYear` | 2026 |
| `rulesetVersion` | 2 |
| `generatorVersion` | 2 |

Session schema indgår ikke i J1A-domænelaget.

## 5. Dokument- og kontokontrakt

V2.1-typen accepterer præcis B1-B9. Compile-time- og runtime-tests beviser, at B10-B13 ikke accepteres som aktive V2.1-dokument-ID'er.

Alle ni bilag bruger de godkendte titler og uændrede R1-posteringer. Hvert bilag har positive heltalsbeløb og balancerer med samme debet- og kredittotal.

Kontoplanen indeholder præcis de 13 frosne konti. Alle 13 startsaldi og alle 13 slutsaldi verificeres i tests.

## 6. Source data og answer key

Domænet adskiller to imports:

- `r1Source.ts` indeholder synligt case-materiale, typed tælleværker og eksterne kontroloplysninger.
- `r1Answers.ts` indeholder expected postings, ledgerfacit og forventet afstemning.

Dokumentkilder indeholder ingen `expectedPostings`. En senere presentation kan importere `r1Source.ts` uden at importere answer key.

B9-kilden indeholder kun:

- bogført saldo før regulering: 174.000 kr.
- systemopgjort saldo pr. 30/6: 182.500 kr.

Reguleringen på 8.500 kr. eksponeres ikke som et særskilt kildefelt. Tælleværket for regulering ÅTD indgår i afstemningsreferencen.

## 7. Typed tælleværker

Hvert tælleværk har:

- type-safe ID,
- employee group,
- measure,
- period,
- amount,
- source,
- presentation label.

R1 indeholder alle krævede tælleværker for timelønnede, månedslønnede og feriepengeforpligtelse. Balancekontrollerne er en separat typed model med konto, periode, kilde og beløb.

## 8. Checkpoint A-E

Checkpointet afledes fra bogføring og de separate kontrolkilder:

- A: 956.570 mod 956.570; difference 0
- B: 1.215.000 mod 1.215.000; difference 0
- C arbejdsgiverpension: 173.726 mod 173.726; difference 0
- C arbejdsgiver-ATP: 9.504 mod 9.504; difference 0
- C feriepenge: 119.574 mod 119.574; difference 0
- C regulering: 32.500 mod 32.500; difference 0
- D: 2.506.874 mod summen af tælleværker 2.506.874; difference 0
- E: alle seks åbne forpligtelser har korrekt kreditside og difference 0

Checkpoint D's kontroltotal beregnes fra komponenterne. Den er ikke hardcoded som et ekstra facit.

## 9. Final state pr. 30/6

Ledgerhelperen anvender startsaldi og B1-B9 og giver præcis:

| Konto | Slutsaldo |
|---:|---:|
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

Driftskontienes afledte total er 2.506.874 kr.

## 10. Runtime-validation og immutability

Validation kontrollerer mindst:

- versionsidentitet,
- eksakt dokument- og kontorækkefølge,
- krævede tælleværker og saldokontroller,
- positive hele kronebeløb,
- gyldige debet-/kreditsider,
- ni balancerede bilag,
- alle 13 slutsaldi,
- checkpointets kontrolrelationer og differencer.

R1 source og answer key er rekursivt frozen. Tests muterer kloner og dokumenterer, at ugyldig version, manglende tælleværk og ubalanceret answer key afvises.

## 11. Verifikation

| Kontrol | Resultat |
|---|---|
| Nye målrettede J1A-tests | 20/20 PASS |
| Samlet `pnpm test` | 360/360 PASS i 49 testfiler |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS; 114 moduler transformeret |
| Generator v1 stress | 4.000/4.000 PASS |
| Generator v1 fixturetest | PASS |
| V2.0.x R1 fixturetest | PASS |
| Generator v1 fixture SHA-256 | `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`, uændret |
| V2.0.x R1 SHA-256 | `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`, uændret |

## 12. V2.0.x-regression

- Aktiv runtime bruger fortsat det eksisterende Level 2-modul.
- Session v1 er ikke ændret.
- Generator v1 er ikke ændret.
- Eksisterende fixtures er ikke ændret.
- Parent exports er ikke ændret.
- Buildens produktadfærd er fortsat V2.0.1.

## 13. J1A-filer

Nye domænefiler:

- `src/domain/level2/v2/accounts.ts`
- `src/domain/level2/v2/constants.ts`
- `src/domain/level2/v2/helpers.ts`
- `src/domain/level2/v2/index.ts`
- `src/domain/level2/v2/r1Answers.ts`
- `src/domain/level2/v2/r1Source.ts`
- `src/domain/level2/v2/referenceR1.ts`
- `src/domain/level2/v2/types.ts`
- `src/domain/level2/v2/validation.ts`

Nye tests:

- `tests/level2/v2-domain-contract.test.ts`
- `tests/level2/v2-r1-ledger.test.ts`
- `tests/level2/v2-reconciliation.test.ts`

Ny rapport:

- `docs/J1A_V2_1_DOMAIN_R1.md`

## 14. Blockers for J1B

Der er ingen åbne blockers for J1B. Generator V2, seedkontrakt, variantsfixtures og stressrunner er bevidst ikke implementeret i J1A og skal bygges i den efterfølgende fase mod denne frosne domænekontrakt.
