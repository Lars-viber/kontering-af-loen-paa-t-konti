# J1 – teknisk og fagligt fundament

## Source-struktur

Payroll-domænet er React-frit og ligger i src/domain/payroll:

- accounts.ts: fast immutable kontoplan
- types.ts: medarbejder, totaler, snapshot, facit og gradingtyper
- readonly.ts: rekursiv runtime-freeze
- rng.ts: FNV-1a, Mulberry32 og seedkontrakt
- calculations.ts: ren medarbejderberegning og summering
- solve.ts: facitmotor
- generator.ts: deterministisk generator og draw-order
- invariants.ts: variantvalidering og hard snapshotkontrol
- parser.ts: streng dansk heltalsparser
- grading.ts: feltvis grading uden facitværdier
- totals.ts: elevens Debet/Kredit-totaler og balancestatus
- index.ts: offentlig domainindgang

React-delen er kun en buildbar placeholder. Tests ligger i tests, den separate stress i scripts/stress-j1.test.ts, og stressresultatet i artifacts/j1-stress.json.

## RNG-kontrakt

GeneratorVersion er centralt fastlåst til 1, og varianten skal være et heltal 1–999999.

Seed-input er præcis:

    payroll:v1:<variant>

Strengen hashes med FNV-1a 32-bit:

- offset basis 0x811c9dc5
- prime 0x01000193
- XOR med hvert ASCII-charCode
- Math.imul med prime
- afslut med unsigned >>> 0

Variant 42 giver seed-input payroll:v1:42 og hash 1981966991.

PRNG er canonical Mulberry32 med unsigned 32-bit seed og output i [0, 1). Generatorlaget bruger ikke Math.random.

## Frosset draw-order

Generator v1 bruger:

1. én draw til employeeCount
2. præcis fem draws pr. medarbejder:
   1. grossThousands
   2. gross25Step
   3. pensionRateIndex
   4. taxRate
   5. deductionIndex

ATP og alle beregninger bruger nul draws. Samlet drawcount er 1 + employeeCount × 5. En instrumenteret test låser kontrakten.

## Generator og medarbejdermodel

Employee count = 3 + floor(draw × 8).

Pr. medarbejder:

- grossSalary = (28 + floor(draw × 45)) × 1.000 + floor(draw × 20) × 25
- atp = 99
- pensionRate = indeks i [4, 5, 6, 8, 10]
- pension = Math.round((grossSalary × pensionRate / 100) / 25) × 25
- amBase = grossSalary − 99 − pension
- amContribution = Math.round(amBase × 8 / 100)
- taxRate = 36 + floor(draw × 7)
- deduction = 4.000 + floor(draw × 9) × 250
- aTax = Math.round((amBase − amContribution − deduction) × taxRate / 100)
- netPay = amBase − amContribution − aTax

calculateEmployee er uafhængig af RNG og bruges af generatoren og det manuelle J0-regressionseksempel.

## Totaler og snapshot

AM-bidrag, A-skat og pension summeres fra de individuelt afrundede medarbejderbeløb. Samlet AM-grundlag afledes som brutto − ATP − pension, og nettoløn som AM-grundlag − AM-bidrag − A-skat.

ExerciseSnapshot er almindeligt JSON-data med:

- generatorVersion
- variant
- employeeCount
- employees
- payslipTotals
- accounts
- answerKey

Snapshot og underobjekter fryses rekursivt ved runtime. Ingen functions, Map, Set eller BigInt indgår.

## Kontoplan og facit

Kontoplanen består i fast rækkefølge af 2210, 2215, 2223, 6920, 6921, 6922, 6930 og 5820.

Facit:

- 2210 Debet = AM-grundlag
- 2215 Debet = pension
- 2223 Debet = ATP
- 6920 Kredit = A-skat
- 6921 Kredit = ATP
- 6922 Kredit = pension
- 6930 Kredit = AM-bidrag
- 5820 Kredit = nettoløn

Alle modfelter er 0. Facit-Debet og facit-Kredit skal begge være samlet bruttoløn.

## Hard invariants

Generatoren validerer variant, version, medarbejderantal, alle tilladte udfald, bruttolønsmodellen, ATP, individuelle beregninger og afrundinger, heltalskrav, ikke-negativ A-skat/nettoløn, totaler, kontoplan, facit, alle otte facitkonti og Debet/Kredit-lighed. Brud kaster en præcis developer-fejl; der findes ingen retry eller silent correction.

## Beløbsparser

Blank/whitespace er gyldigt 0. Parseren accepterer uformaterede cifre samt streng dansk tusindtalsgruppering med enten punkt eller mellemrum. NBSP og narrow NBSP normaliseres til mellemrum.

Parseren afviser minus, plus, decimaler, komma, valuta, tekst, scientific notation, blandede separatorer, ugyldig gruppering og unsafe integers. Resultatet er et discriminated result og aldrig silent fallback.

## Grading og totaler

Grading vurderer Debet og Kredit som 16 selvstændige felter og returnerer kun accountId, side og status samt optællinger/completion. Resultatet indeholder ingen expectedValue, correctValue eller facittekst.

Initial status er unchecked. Efter kontrol er hvert felt correct eller incorrect. Blank er normaliseret til 0 før grading, så blanke nulfelter kan godkendes. allFieldsCorrect kræver 16/16 korrekte felter.

Elevtotaler summerer de otte Debet- og Kreditfelter:

- 0/0 = empty
- forskellige summer = unbalanced
- ens positive summer = balanced

Balanced er bevidst uafhængigt af faglig korrekthed.

## Fixtures

tests/fixtures/generator-v1.json låser fulde snapshots for variant 1, 2, 3, 42 og 999999. Tests sammenligner deep-equal data, ikke kun hash.

SHA-256:

    c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25

## Stressstrategi

pnpm stress:j1 genererer variant 1–4000, kører generatorens hard invariants og kontrollerer negative skatter/nettoløn samt Debet/Kredit. Den rapporterer employee counts, pension rates, tax rates, deductions, samlet medarbejderantal og min/max bruttoløn. Alle forventede kategorier skal forekomme; perfekt statistisk lighed kræves ikke.