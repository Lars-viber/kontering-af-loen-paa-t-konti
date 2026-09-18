# J1B – Niveau 2 generatorrapport

## Status

Generator v1 er implementeret på branch v2 oven på J1A-domænemotoren. Der er ikke implementeret UI, menu, session, localStorage, codec, browser-randomness, deployment eller main-merge.

Ingen commit eller push er udført.

## Implementerede filer

Nye domænefiler:

- src/domain/level2/caseBuilder.ts
- src/domain/level2/generator.ts

Ændrede domænefiler:

- src/domain/level2/referenceR1.ts
- src/domain/level2/index.ts

ReferenceR1 bruger nu samme generiske casebuilder som generatoren. Det fjernede den tidligere case-specifikke kopi af bilags-, ledger- og checkpointafledningen uden at ændre R1-outputtet.

Nye tests og fixture:

- tests/level2/generator.test.ts
- tests/level2/generator-fixtures.test.ts
- tests/level2/generator-stress.test.ts
- tests/fixtures/level2-generator-v1-fixtures.json

Dokumentation:

- docs/J1B_NIVEAU2_GENERATOR.md
- docs/J1B_NIVEAU2_RAPPORT.md

## Fixturekontrakter

J1A R1 SHA-256, fortsat uændret:

9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0

Generator v1 fixturevarianter:

1, 2, 3, 42 og 999999

Generatorfixture SHA-256:

a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342

Samme variant giver deepEqual output, byteidentisk canonical serialisering og samme fingerprint. Ugyldige varianter afvises eksplicit.

## Draw-kontrakt

Seed, FNV-1a og Mulberry32 følger den frosne J1B-kontrakt. randomInt bruger ét draw og inklusive heltalsendepunkter.

Draw-count er testet som:

10 + 9H + 3M

En instrumenteret case med H = 5 og M = 5 bruger præcis 70 draws. Der findes ingen conditional draws eller rerolls.

## Stressresultat

Stresstesten gennemførte **4.000/4.000** varianter.

For hver variant blev følgende kontrolleret:

- rekursiv immutability
- medarbejderantal og alle inputranges
- ATP-gyldige timer
- alle numeriske output som ikke-negative safe integers
- almindelig A-skat større end 0
- 13 dokumenter i fast rækkefølge
- 13/13 dokumenter balancerer
- maj-afledte startsaldi
- januar–maj ATP-startsaldo
- positive checkpointforpligtelser
- ATP Q1/Q2-sammenhæng
- feriepengeforpligtelsen består efter juli
- eksakt ÅTD-afstemning
- Bank i Debet efter hvert bilag
- positiv slutbank
- ingen mutation leaks

Der opstod ingen invariantfejl og ingen rerolls.

## Distributionsaudit, variant 1–4000

Alle diskrete endepunkter og krævede værdier blev observeret:

- timelønnede: 3, 4, 5, 6
- månedslønnede: 3, 4, 5, 6
- timeløn: alle 5-kronetrin fra 200 til 300
- timer: alle heltal fra 125 til 180
- månedsløn: alle 500-kronetrin fra 38.000 til 65.000
- trækprocent: 36, 37, 38, 39, 40, 41, 42
- fradrag: alle 250-kronetrin fra 4.000 til 6.000
- feriepengefaktor: 70, 75, 80, 85, 90, 95, 100
- månedsregulering: alle 500-kronetrin fra 2.000 til 10.000
- Bank-buffer: alle 50.000-kronetrin fra 250.000 til 750.000

Observerede min/max:

| Måling | Minimum | Maksimum |
|---|---:|---:|
| Samlet medarbejderantal | 6 | 12 |
| Bruttoløn juni | 224.840 | 584.635 |
| Lønrelateret checkpointtotal | 1.563.538 | 4.023.297 |
| Bank-start | 700.000 | 1.750.000 |
| Slutbank | 250.060 | 799.977 |
| Feriepengeforpligtelse pr. 30/6 | 116.500 | 388.500 |

## Uniqueness

Der blev beregnet SHA-256 over hver variants canonical output for variant 1–4000.

- unikke fingerprints: 4.000
- duplicate fingerprints: 0

## Regression og værktøjskontrol

- eksisterende v1-tests: 133/133 PASS
- eksisterende J1A-tests: 26/26 PASS
- nye J1B-tests: 15/15 PASS
- samlet: 174/174 PASS
- typecheck: PASS
- build: PASS
- 4.000-variant stress: PASS
- R1-fixturehash: uændret
- generatorfixturehash: frosset
- frosne J0-dokumenter: uændrede

Source audit:

- Math.random i generatorområdet: 0
- Date/time: 0
- getRandomValues/browser-entropi: 0
- localStorage/session/React: 0
- hardcodede R1-totaler i generator.ts: 0

## Næste fase

J1B har ingen kendte blockers. Generatoren afslutter med en ren, typed og immutable domænekontrakt. Session, persistence, UI og valg af tilfældig variant hører til senere faser.
