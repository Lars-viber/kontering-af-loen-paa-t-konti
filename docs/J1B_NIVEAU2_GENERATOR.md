# J1B – Niveau 2 Generator v1

## Kontraktstatus

Dette dokument fryser den deterministiske generator for Niveau 2.

- rulesetYear = 2026
- rulesetVersion = 1
- generatorVersion = 1
- variantinterval = 1–999999

Varianter uden for intervallet, NaN og ikke-heltal afvises med RangeError. Generatoren udfører ingen clamp eller reroll.

R1 er fortsat en separat håndfrosset faglig reference og er ikke knyttet til nogen generatorvariant.

## Seed og PRNG

Seedstrengen er eksakt:

payroll-level2:ruleset-2026-v1:generator-v1:<variant>

Variant 42 bruger derfor:

payroll-level2:ruleset-2026-v1:generator-v1:42

Seedstrengen hashes med FNV-1a 32-bit:

- offset basis: 0x811c9dc5
- prime: 0x01000193
- for hvert UTF-16 char-code: XOR, Math.imul med prime og unsigned konvertering med >>> 0

Kontrolværdien for variant 42 er 3928086949, hex ea21d9a5.

Den resulterende uint32 bruges som state i canonical Mulberry32. Generatoren bruger ingen Math.random, dato/tid, browser-entropi, crypto eller betingede ekstra draws.

## Inclusive randomInt

randomInt(min, max) bruger præcis ét PRNG-draw x i intervallet [0, 1).

Mapping:

min + floor(x × (max − min + 1))

Begge heltalsendepunkter er inklusive. Trinbaserede ranges vælger først et indeks med samme mapping og beregner min + indeks × step. Der bruges ingen rejection sampling.

## Fast draw-rækkefølge

Draw-rækkefølgen er en del af Generator v1-kontrakten:

1. Antal timelønnede.
2. Antal månedslønnede.
3. For hver timelønnet T1...Tn:
   - timeløn
   - trækprocent
   - månedsfradrag
   - januar timer
   - februar timer
   - marts timer
   - april timer
   - maj timer
   - juni timer
4. For hver månedslønnet M1...Mn:
   - månedsløn
   - trækprocent
   - månedsfradrag
5. Feriepengeforpligtelsens opening-liability-factor.
6. Januarregulering.
7. Februarregulering.
8. Martsregulering.
9. Aprilregulering.
10. Majregulering.
11. Juniregulering.
12. Bank-buffer.

Ved H timelønnede og M månedslønnede er draw-count eksakt:

10 + 9H + 3M

En instrumenteret PRNG-test fryser formlen. Fem medarbejdere i hver gruppe giver 70 draws.

## Genererede medarbejdere

Medarbejderkredsen er uændret januar–juni. Begge grupper findes altid.

| Felt | Range | Trin |
|---|---:|---:|
| Antal timelønnede | 3–6 | 1 |
| Antal månedslønnede | 3–6 | 1 |
| Timeløn | 200–300 | 5 |
| Timer pr. måned | 125–180 | 1 |
| Månedsløn | 38.000–65.000 | 500 |
| Trækprocent | 36–42 | 1 |
| Månedsfradrag | 4.000–6.000 | 250 |

Timeløn, månedsløn, trækprocent og månedsfradrag er stabile for den enkelte medarbejder januar–juni. Timer trækkes separat for hver timelønnet og måned.

Alle timer ligger over Generator v1-casens ATP-grænse. Alle medarbejdere behandles derfor med fuld ATP i alle seks måneder.

Pension varierer ikke:

- medarbejderandel: 4 %
- arbejdsgiverandel: 8 %

ATP varierer ikke:

- medarbejderandel: 99
- arbejdsgiverandel: 198
- samlet: 297

Alle løn-, pensions-, ATP-, skatte- og feriepengebeløb afledes gennem J1A-motoren med medarbejdervis afrunding.

## Feriepengeforpligtelse

Generatorens heuristik skaber plausible systemopgjorte caseinput. Den er ikke en regnskabsregel og må ikke vises som elevformel.

Opening-liability-factor:

- 70–100 %
- trin 5 procentpoint

Årets startsaldo beregnes som den samlede månedlige bruttoløn for månedslønnede × faktoren og afrundes til nærmeste 1.000 kr.

Hver måned januar–juni får præcis ét draw:

- regulering 2.000–10.000
- trin 500
- altid positiv

Saldo pr. 1/6 er årets startsaldo plus januar–maj-reguleringerne. Systemopgjort saldo pr. 30/6 er saldo pr. 1/6 plus junireguleringen. Eleven får kun saldo før regulering, systemopgjort ultimo og differencen.

## Sikker Bank

Bank-bufferen vælges med ét draw:

- 250.000–750.000
- trin 50.000

Generatoren bygger først casen med J1A-motoren og summerer alle Bank-krediteringer i B1–B13 som requiredCash.

rawBankStart = requiredCash + buffer

Bank-start afrundes op til nærmeste 50.000. Casen bygges derefter igen med den afledte Bank-startsaldo. Bank skal være positiv Debet efter hvert bilag, pr. 30/6 og efter B13.

## Afledningspipeline

Generatoren genererer kun medarbejderinput, feriepengeforpligtelsesinput og Bank-buffer. Den fælles casebuilder afleder:

- januar–juni løn og feriepenge
- januar–maj driftsstartsaldier
- maj-forpligtelser pr. 1/6
- ATP januar–maj
- B1–B9
- checkpoint pr. 30/6
- ÅTD-specifikation
- B10–B13
- slutsaldi

Facitposteringer, ledger og checkpointlogik findes ikke i en separat generatorudgave.

Resultatet indeholder variant, versioner, seed, tydeligt adskilte inputs og derived output og fryses rekursivt.

## Frosne fixtures

Fixturevarianter:

- 1
- 2
- 3
- 42
- 999999

Fixturefil:

tests/fixtures/level2-generator-v1-fixtures.json

Canonical serialisering:

1. Objektnøgler sorteres leksikografisk på alle niveauer.
2. Arrays bevarer domænets rækkefølge.
3. JSON serialiseres uden insignificant whitespace.
4. SHA-256 beregnes over canonical UTF-8.

Generatorfixture SHA-256:

a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342

Den separate J1A R1-fixture er uændret med SHA-256:

9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0
