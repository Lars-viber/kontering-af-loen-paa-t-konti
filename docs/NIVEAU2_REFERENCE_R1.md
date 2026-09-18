# Niveau 2 – referencevariant R1

## 1. Referenceformål

R1 er den gennemregnede referencecase for Niveau 2. Alle beløb er hele kroner. D/K angiver saldoens side. R1 er reproduceret fra medarbejderdata med det ignorerede script `artifacts/j0-niveau2/verify-r1.mjs`; auditresultatet ligger lokalt i `artifacts/j0-niveau2/r1-verification.json`.

R1 er ikke en generatorimplementation. J1 skal implementere den frosne kontrakt uden at ændre R1-tallene. Det permanente v1-tag `v1.0.0` peger fortsat på `634a0eb`; Niveau 1's faglige, generator-, fixture-, session-, parser-/graderings- og flowkontrakter bevares. Kun eksplicit godkendte præsentationsændringer må påvirke Niveau 1 i v2.

## 2. Medarbejdere

Casefælles satser: medarbejderpension 4 %, arbejdsgiverpension 8 %, medarbejder-ATP 99 og arbejdsgiver-ATP 198 pr. måned. Begge pensionsandele afrundes til nærmeste hele krone pr. medarbejder og summeres derefter. Det er en frossen case-/generatorregel, ikke en universel pensionsregel.

### Timelønnede

| ID | Timeløn | Træk-% | Månedsfradrag | Jan timer | Feb | Mar | Apr | Maj | Jun |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T1 | 240 | 36 | 4.500 | 145 | 148 | 152 | 154 | 156 | 155 |
| T2 | 240 | 37 | 4.750 | 155 | 160 | 163 | 162 | 164 | 165 |
| T3 | 230 | 38 | 5.000 | 172 | 174 | 176 | 178 | 177 | 180 |
| T4 | 250 | 39 | 5.250 | 172 | 170 | 176 | 174 | 178 | 180 |

Bruttoløn pr. medarbejder og måned er timer × timeløn.

### Månedslønnede

| ID | Månedsløn | Træk-% | Månedsfradrag |
|---|---:|---:|---:|
| M1 | 42.000 | 37 | 5.000 |
| M2 | 47.500 | 38 | 5.250 |
| M3 | 52.500 | 39 | 5.500 |
| M4 | 60.500 | 40 | 5.750 |

## 3. Månedstotaler januar–juni

### Timelønnede – almindelig løn

| Måned | Brutto | Medarb. pension | Arbejdsg. pension | Medarb. ATP | Arbejdsg. ATP | AM-grundlag | AM | A-skat | Netto |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Januar | 154.560 | 6.182 | 12.365 | 396 | 792 | 147.982 | 11.838 | 43.848 | 92.296 |
| Februar | 156.440 | 6.258 | 12.516 | 396 | 792 | 149.786 | 11.983 | 44.451 | 93.352 |
| Marts | 160.080 | 6.403 | 12.806 | 396 | 792 | 153.281 | 12.262 | 45.663 | 95.356 |
| April | 160.280 | 6.411 | 12.822 | 396 | 792 | 153.473 | 12.278 | 45.718 | 95.477 |
| Maj | 162.010 | 6.480 | 12.961 | 396 | 792 | 155.134 | 12.411 | 46.295 | 96.428 |
| Juni | 163.200 | 6.528 | 13.056 | 396 | 792 | 156.276 | 12.502 | 46.702 | 97.072 |

### Månedslønnede – almindelig løn

De fire månedslønnede har samme total hver måned januar–juni:

| Brutto | Medarb. pension | Arbejdsg. pension | Medarb. ATP | Arbejdsg. ATP | AM-grundlag | AM | A-skat | Netto |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 202.500 | 8.100 | 16.200 | 396 | 792 | 194.004 | 15.520 | 60.693 | 117.791 |

### Timelønnedes feriepenge

| Måned | Bruttoferiepenge | AM | A-skat | Nettoferiepenge |
|---|---:|---:|---:|---:|
| Januar | 19.320 | 1.546 | 6.682 | 11.092 |
| Februar | 19.556 | 1.564 | 6.760 | 11.232 |
| Marts | 20.010 | 1.601 | 6.917 | 11.492 |
| April | 20.036 | 1.603 | 6.924 | 11.509 |
| Maj | 20.252 | 1.620 | 7.000 | 11.632 |
| Juni | 20.400 | 1.632 | 7.052 | 11.716 |

## 4. Juni – individuel feriepengekontrol

| ID | Bruttoferiepenge | AM | A-skat | Netto |
|---|---:|---:|---:|---:|
| T1 | 4.650 | 372 | 1.540 | 2.738 |
| T2 | 4.950 | 396 | 1.685 | 2.869 |
| T3 | 5.175 | 414 | 1.809 | 2.952 |
| T4 | 5.625 | 450 | 2.018 | 3.157 |
| **I alt** | **20.400** | **1.632** | **7.052** | **11.716** |

## 5. Startsaldier

### Drift – Saldo ÅTD t.o.m. 31/5

| Konto | Saldo |
|---|---:|
| 2210 Lønninger – timelønnede | 759.656 D |
| 2211 Lønninger – månedslønnede | 970.020 D |
| 2215 Pensioner | 216.704 D |
| 2223 ATP | 11.880 D |
| 2230 Feriepenge – timelønnede | 99.174 D |
| 2235 Regulering af feriepengeforpligtelse | 24.000 D |

### Balance – Saldo pr. 1/6

| Konto | Saldo | Afledning |
|---|---:|---|
| 5820 Bankkonto | 1.500.000 D | Case-startsaldo |
| 6920 Skyldig A-skat | 113.988 K | Maj: 46.295 + 60.693 + 7.000 |
| 6921 Skyldig ATP | 11.880 K | 8 medarbejdere × 297 × 5 måneder |
| 6922 Skyldig pension | 43.741 K | Maj: 6.480 + 12.961 + 8.100 + 16.200 |
| 6923 Skyldige nettoferiepenge – FerieKonto | 11.632 K | Maj-bilagets nettoferiepenge |
| 6924 Feriepengeforpligtelse | 174.000 K | Caseoplyst bogført forpligtelse |
| 6930 Skyldig AM-bidrag | 29.551 K | Maj: 12.411 + 15.520 + 1.620 |

A-skat, AM-bidrag, pension og FerieKonto er dermed reproduceret direkte fra maj-data. ATP er den akkumulerede januar–maj-forpligtelse, fordi Q1 først betales i juli i R1.

## 6. Juni-bilag og facit

| Bilag | Debet | Kredit | Total |
|---:|---|---|---:|
| 1 Betaling A-skat/AM maj | 6920 113.988; 6930 29.551 | 5820 143.539 | 143.539 |
| 2 Betaling pension maj | 6922 43.741 | 5820 43.741 | 43.741 |
| 3 Betaling FerieKonto maj | 6923 11.632 | 5820 11.632 | 11.632 |
| 4 Løn timelønnede | 2210 156.276; 2215 6.528; 2223 396 | 6920 46.702; 6930 12.502; 6922 6.528; 6921 396; 5820 97.072 | 163.200 |
| 5 Arbejdsgiverbidrag timelønnede | 2215 13.056; 2223 792 | 6922 13.056; 6921 792 | 13.848 |
| 6 Feriepenge timelønnede | 2230 20.400 | 6930 1.632; 6920 7.052; 6923 11.716 | 20.400 |
| 7 Løn månedslønnede | 2211 194.004; 2215 8.100; 2223 396 | 6920 60.693; 6930 15.520; 6922 8.100; 6921 396; 5820 117.791 | 202.500 |
| 8 Arbejdsgiverbidrag månedslønnede | 2215 16.200; 2223 792 | 6922 16.200; 6921 792 | 16.992 |
| 9 Regulering ferieforpligtelse | 2235 8.500 | 6924 8.500 | 8.500 |

Hvert bilag har Debet = Kredit. Der findes ingen postering på `Skyldig løn`.

## 7. Checkpoint pr. 30/6

### Drift – Saldo ÅTD t.o.m. 30/6

| Konto | Saldo |
|---|---:|
| 2210 Lønninger – timelønnede | 915.932 D |
| 2211 Lønninger – månedslønnede | 1.164.024 D |
| 2215 Pensioner | 260.588 D |
| 2223 ATP | 14.256 D |
| 2230 Feriepenge – timelønnede | 119.574 D |
| 2235 Regulering af feriepengeforpligtelse | 32.500 D |
| **I alt** | **2.506.874 D** |

### ÅTD-lønsumsafstemning

Timelønnede:

- lønkonto 915.932
- medarbejderpension 38.262
- medarbejder-ATP 2.376
- bruttoløn ÅTD 956.570

Månedslønnede:

- lønkonto 1.164.024
- medarbejderpension 48.600
- medarbejder-ATP 2.376
- bruttoløn ÅTD 1.215.000

Samlet kontrol:

| Komponent | Beløb |
|---|---:|
| Bruttoløn timelønnede | 956.570 |
| Bruttoløn månedslønnede | 1.215.000 |
| Arbejdsgiverpension | 173.726 |
| Arbejdsgiver-ATP | 9.504 |
| Feriepenge timelønnede | 119.574 |
| Regulering ferieforpligtelse | 32.500 |
| **I alt** | **2.506.874** |

### Balance – Saldo pr. 30/6

| Konto | Saldo |
|---|---:|
| 5820 Bankkonto | 1.086.225 D |
| 6920 Skyldig A-skat | 114.447 K |
| 6930 Skyldig AM-bidrag | 29.654 K |
| 6922 Skyldig pension | 43.884 K |
| 6921 Skyldig ATP | 14.256 K |
| 6923 Skyldige nettoferiepenge – FerieKonto | 11.716 K |
| 6924 Feriepengeforpligtelse | 182.500 K |

Bankafledning: 1.500.000 − 113.988 − 29.551 − 43.741 − 11.632 − 97.072 − 117.791 = 1.086.225 D.

## 8. Juli-bilag og slutsaldi

| Bilag | Debet | Kredit | Total |
|---:|---|---|---:|
| 10 Betaling ATP Q1 | 6921 7.128 | 5820 7.128 | 7.128 |
| 11 Betaling A-skat/AM juni | 6920 114.447; 6930 29.654 | 5820 144.101 | 144.101 |
| 12 Betaling pension juni | 6922 43.884 | 5820 43.884 | 43.884 |
| 13 Betaling FerieKonto juni | 6923 11.716 | 5820 11.716 | 11.716 |

Slutsaldi:

| Konto | Saldo |
|---|---:|
| Bankkonto | 879.396 D |
| Skyldig A-skat | 0 |
| Skyldig AM-bidrag | 0 |
| Skyldig pension | 0 |
| Skyldige nettoferiepenge – FerieKonto | 0 |
| Skyldig ATP | 7.128 K |
| Feriepengeforpligtelse | 182.500 K |

Bankafledning: 1.086.225 − 7.128 − 114.447 − 29.654 − 43.884 − 11.716 = 879.396 D. ATP-restsaldoen 7.128 K er Q2. Feriepengeforpligtelsen påvirkes ikke af de valgte juli-betalinger.

## 9. Verifikationsresultat

- 8/8 medarbejdere reproduceret for januar–juni.
- Alle juni-kontroltal reproduceret.
- Alle startsaldi med oplyst derivation reproduceret.
- Alle ÅTD- og balancesaldi pr. 30/6 reproduceret.
- Alle juli-betalinger og slutsaldi reproduceret.
- 13/13 bilag har Debet = Kredit.
- Antal talafvigelser: 0.
- Ultimobeløbet 182.500 er eksternt/systemfastsat caseinput og behandles som et read-only beløb. Eleven beregner og bogfører reguleringen 182.500 − 174.000 = 8.500; der findes ingen intern pseudoregel for at udlede 182.500.


