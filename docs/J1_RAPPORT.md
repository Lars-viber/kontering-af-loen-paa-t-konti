# J1-rapport

## 1. Leverance og filer

Oprettet projektfundament med package.json, pnpm-lock.yaml, Vite/TypeScript-konfiguration, index.html, README, minimal React-placeholder, payroll-domæne, tests, fixtures, stress-script og artifact samt J1-dokumentation.

Domænefiler:

- src/domain/payroll/accounts.ts
- types.ts
- readonly.ts
- rng.ts
- calculations.ts
- generator.ts
- solve.ts
- invariants.ts
- parser.ts
- grading.ts
- totals.ts
- index.ts

Dokumentation:

- docs/J1_FOUNDATION.md
- docs/J1_RAPPORT.md

Ingen hovedmenu, session/localStorage, video, lønbilag eller T-konto-UI er implementeret.

## 2. Dependencies og scripts

Runtime dependencies:

- react 19.2.8
- react-dom 19.2.8

Dev dependencies:

- typescript 7.0.2
- vite 8.2.2
- @vitejs/plugin-react 6.1.1
- vitest 4.1.11
- React/Node typepakker

Scripts: dev, test, typecheck, build, preview og stress:j1. Ingen router, state library, TanStack, Tailwind, Radix, shadcn eller form library.

## 3. Arkitektur

Faglig logik er fri af React. Rene moduler adskiller typer, kontoplan, RNG, beregninger, generator, facit, invariants, parser, grading og elevtotaler. App.tsx er kun teksten Kontering af løn på T-konti / Projektfundament etableret.

## 4. GeneratorVersion, variant og RNG

GENERATOR_VERSION = 1 er defineret centralt. Variantintervallet er 1–999999 med ren validering af heltal og finitte grænser.

FNV-1a bruger offset 0x811c9dc5, prime 0x01000193, XOR, Math.imul og unsigned afslutning. Seed er præcis payroll:v1:<variant>; variant 42 hashes til 1981966991.

Mulberry32 er dependency-fri, tager unsigned 32-bit seed og returnerer [0,1). Samme variant genereret 100 gange giver exact samme snapshot.

Draw-order er låst: først employee count, derpå grossThousands, gross25Step, pensionRateIndex, taxRate og deductionIndex pr. medarbejder. Drawcounttesten bekræfter 1 + employeeCount × 5. ATP, beregninger og metadata bruger ingen draws.

## 5. Medarbejdermodel, individuel afrunding og totaler

Employee indeholder grossSalary, atp, pensionRate, pension, amBase, amContribution, taxRate, deduction, aTax og netPay.

Pension afrundes individuelt til 25 kr. AM-bidrag og A-skat afrundes individuelt til hele kroner før summering. Totalmotoren genberegner ikke AM eller A-skat fra totalsummer.

Snapshot indeholder version, variant, employeeCount, employees, payslipTotals, accounts og answerKey som serialiserbart, rekursivt immutable JSON-data.

## 6. Kontoplan og facit

Præcis otte konti findes i låst visningsrækkefølge og uden dubletter. Answer key indeholder Debet og Kredit som ikke-negative heltal for alle otte konti. 2210 debiteres med AM-grundlaget; 2215/2223 med pension/ATP. 6920/6921/6922/6930/5820 krediteres med A-skat/ATP/pension/AM-bidrag/nettoløn.

J0-eksemplet er en RNG-uafhængig regression:

- brutto 105.475
- ATP 297
- pension 6.275
- AM-grundlag 98.903
- AM-bidrag 7.912
- A-skat 29.680
- nettoløn 61.311
- Debet = Kredit = 105.475

## 7. Hard invariants

Central validering dækker version/variant, employeeCount, bruttolønsmodel, ATP, pensionssatser og -afrunding, AM-grundlag/-bidrag, skatteprocent, fradrag, A-skat, integers, ikke-negativ skat/nettoløn, employee-summer, kontoplan, alle otte facitkonti, facit mod totaler samt Debet = Kredit = brutto. Generatoren validerer sig selv og kaster ved fejl uden retry.

## 8. Parser

Gyldigt: blank, whitespace, 0, leading zeros, 145812, 145.812, 145 812, flergruppetal, NBSP/narrow NBSP og MAX_SAFE_INTEGER.

Ugyldigt: negative/plus-tal, komma/decimaler, valuta/tekst, scientific notation, Infinity/NaN, blandede separatorer, ugyldig 3-ciffergruppering og unsafe integer. Resultatet er ok/value eller ok=false/error.

## 9. Grading, totaler og completion

Grading er feltvis for 16 felter. Initial status er unchecked; kontrol giver correct/incorrect pr. side. Blank er 0 før grading. Completion kræver 16/16 correct.

Grading-resultatet indeholder accountId, side, status og summary counts, men ingen facitværdi eller facittekst. Det gør correct → locked og incorrect → editable muligt i senere student state uden answer reveal.

Elevtotaler giver empty, unbalanced eller balanced. En særskilt regression bekræfter, at 100 Debet og 100 Kredit kan være balanced, mens completion er false.

## 10. Låste fixtures

SHA-256 for tests/fixtures/generator-v1.json:

c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25

| Variant | Ansatte | Brutto | ATP | Pension | AM-grundlag | AM-bidrag | A-skat | Nettoløn | Debet | Kredit |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 5 | 263.500 | 495 | 18.900 | 244.105 | 19.528 | 78.841 | 145.736 | 263.500 | 263.500 |
| 2 | 9 | 419.300 | 891 | 26.675 | 391.734 | 31.338 | 121.407 | 238.989 | 419.300 | 419.300 |
| 3 | 4 | 197.825 | 396 | 17.625 | 179.804 | 14.384 | 58.247 | 107.173 | 197.825 | 197.825 |
| 42 | 8 | 433.375 | 792 | 26.675 | 405.908 | 32.472 | 127.943 | 245.493 | 433.375 | 433.375 |
| 999999 | 6 | 338.900 | 594 | 22.475 | 315.831 | 25.266 | 102.276 | 188.289 | 338.900 | 338.900 |

Alle fem snapshots testes deep-equal.

## 11. Tests, typecheck og build

Unit gate:

- 7 testfiler
- 77 tests
- 0 failures

Typecheck: 0 fejl.

Production build:

- 16 modules
- index.html 0,41 kB / gzip 0,28 kB
- CSS 0,19 kB / gzip 0,16 kB
- JavaScript 190,49 kB / gzip 60,00 kB

## 12. Stress 1–4000

- successful: 4.000
- generator failures: 0
- invariant failures: 0
- Debet/Kredit failures: 0
- negative A-skat failures: 0
- negative nettoløn failures: 0
- total employees: 25.815
- min/max employee gross salary: 28.000 / 72.475

Employee-count distribution:

| Ansatte | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Antal | 507 | 500 | 520 | 492 | 526 | 494 | 502 | 459 |

Pension distribution:

| Sats | 4 % | 5 % | 6 % | 8 % | 10 % |
|---:|---:|---:|---:|---:|---:|
| Antal | 4.992 | 5.214 | 5.319 | 5.146 | 5.144 |

Tax-rate distribution:

| Sats | 36 % | 37 % | 38 % | 39 % | 40 % | 41 % | 42 % |
|---:|---:|---:|---:|---:|---:|---:|---:|
| Antal | 3.707 | 3.648 | 3.788 | 3.667 | 3.598 | 3.740 | 3.667 |

Deduction distribution:

| Fradrag | 4.000 | 4.250 | 4.500 | 4.750 | 5.000 | 5.250 | 5.500 | 5.750 | 6.000 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Antal | 2.889 | 2.902 | 2.902 | 2.801 | 2.897 | 2.853 | 2.891 | 2.861 | 2.819 |

Alle forventede kategorier forekommer.

## 13. Source- og dependency-audit

- Math.random i payroll generator: 0
- eval: 0
- Function-constructor: 0
- Lovable-imports: 0
- TanStack: 0
- Tailwind: 0
- Radix/shadcn: 0
- runtime dependencies: kun react og react-dom

## 14. Git-status og problemer

Git er ikke initialiseret, og ingen Git-kommandoer er kørt. Der er ingen faglige problemer eller kompromiser. En tidlig gate rettede alene testforventningen for den verificerede FNV-hash, JavaScripts numeriske object-key order i én test og Vites CSS-typedeklaration; generatorens faglige output blev ikke ændret.

J1 KLAR TIL GODKENDELSE