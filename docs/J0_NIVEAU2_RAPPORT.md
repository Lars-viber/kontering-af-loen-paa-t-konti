# J0C – Niveau 2-rapport

## 1. Samlet status

Niveau 2-specifikationen er fagligt lukket og frosset på den lokale branch `v2`. J0C er kun dokumentationsrevision. Ingen produktkode, tests, dependencies, konfiguration, workflow eller public assets er ændret. Der er ikke committed, pushed, merged eller deployet.

## 2. Beskyttelse af v1

- Det permanente annoterede tag `v1.0.0` peger på commit `634a0eb` – `Finalize v1 release documentation`.
- `main` er ikke ændret.
- Aktiv arbejdsbranch er `v2`.
- Niveau 1's faglige regler, generatorresultater, fixture-kontrakt, generatorVersion, sessionkontrakt, parser-/graderingsadfærd og brugerflow forbliver uændrede, medmindre en reel bug dokumenteres.
- Eksplicit godkendte præsentationsændringer er tilladt i v2. Godkendt nu: bilagstal må ikke have mindre grundskrift end den tilhørende bilagstekst.

## 3. Dokumenter

J0C har revideret og konsolideret:

- `docs/NIVEAU2_FAGLIG_SPECIFIKATION.md`
- `docs/NIVEAU2_REFERENCE_R1.md`
- `docs/NIVEAU2_UI_KRAV.md`
- `docs/J0_NIVEAU2_RAPPORT.md`

Det midlertidige verifikationsscript og JSON-resultatet ligger fortsat ignored under `artifacts/j0-niveau2/` og må ikke stages.

## 4. Frosne J0C-beslutninger

### 4.1 Kontoplan

Kontoplanen med 13 konti er godkendt. 2211, 2230, 2235, 6923 og 6924 er undervisningskonti, ikke universelle danske standardkonti. Der findes ingen `Skyldig løn` og ingen separate pensions-/ATP-konti pr. medarbejdergruppe.

### 4.2 Feriepengeforpligtelse

174.000 K er bogført saldo før regulering. 182.500 K er en eksternt/systemopgjort ultimoforpligtelse. Eleven beregner og bogfører differencen 8.500. Systemet må vise read-only specifikation, men J0/J1 må ikke opfinde en regel til at derivere 182.500.

### 4.3 Checkpoint

Checkpoint pr. 30/6 har præcis fem separat kontrollerede dele A–E:

A. Bruttoløn ÅTD – timelønnede.  
B. Bruttoløn ÅTD – månedslønnede.  
C. Øvrige lønomkostninger ÅTD.  
D. Samlede lønrelaterede omkostninger ÅTD.  
E. Seks balanceposter pr. 30/6.

Korrekte dele bliver grønne og låses. Forkerte dele bliver røde og redigerbare uden facitafsløring. Juli åbnes først, når A–E er korrekte.

### 4.4 Skattecase

Alle 8 medarbejdere er almindeligt AM-bidragspligtige i 2026 uden aldersmæssig eller anden fritagelse. Den almindelige R1-formel bruger AM-grundlag minus AM-bidrag minus månedsfradrag som A-skattegrundlag og afrunder A-skat pr. medarbejder. Modellen er pædagogisk og ikke en fuld eSkattekort-implementation.

### 4.5 Ferie-A-skat

For timelønnedes FerieKonto-feriepenge er skattegrundlaget bruttoferiepenge minus AM-bidrag. Medarbejderens trækprocent anvendes, mens almindeligt månedsfradrag ikke anvendes. Den officielle ramme er beskatning ved optjening og nettoferiepenge; R1-formlen er fortsat en forenklet undervisningsmodel.

### 4.6 Pensionsafrunding

Medarbejderpension 4 % og arbejdsgiverpension 8 % beregnes og afrundes til nærmeste hele krone pr. medarbejder før summering. Beregning på gruppetotalen er ikke tilladt som erstatning. Reglen er en case-/generatorregel.

### 4.7 T-kontohistorik

Et T-kort har ingen permanent intern scrollbar. Det viser startsaldo, højst 3 seneste godkendte/historiske posteringer, aktuelle redigerbare posteringer og aktuel saldo. Ældre poster åbnes via en keyboard-accessible read-only historikdrawer/modal.

### 4.8 Hårdt 1366×768-krav

Normal arbejdsvisning skal samtidig vise sticky aktuelt bilag, mindst 3 T-konti pr. række og mindst 2 komplette T-kontorækker i arbejdsområdet uden horisontal sidescroll. Senere audit dækker tidligt bilag, sent junibilag, historikkonto og fejltilstand. Checkpoint testes separat.

### 4.9 Sessionsadskillelse

Niveau 2 får egen schemaVersion, codec/validation, storage key og sessionmodel. Niveau 1's session må aldrig overskrives. En ufærdig session i hvert niveau skal kunne eksistere samtidigt.

## 5. R1-verifikation

Det ignorerede verifikationsscript blev kørt igen efter J0C. Resultatet er uændret:

- 8/8 medarbejdere, januar–juni
- 13/13 bilag med Debet = Kredit
- 0 talafvigelser
- drift ÅTD pr. 30/6: 2.506.874 D
- Bank pr. 30/6: 1.086.225 D
- slutbank: 879.396 D
- ATP-restsaldo: 7.128 K

182.500 er et eksternt/systemopgjort input og skal derfor ikke reproduceres med en intern pseudo-regel. Reguleringen 8.500 og alle posteringer/saldi er reproduceret.

## 6. Faglige kilder

Kontrolleret mod officielle kilder 18. september 2026:

1. [Virk – ATP for medarbejdere](https://virk.dk/guidance/atp/atp-arbejdsgiver/atp-medarbejdere/): 99/198/297 og fuld sats ved mindst 117 timer.
2. [Virk – ATP og Samlet Betaling](https://virk.dk/vejledning/atp/atp-arbejdsgiver/atp-info/): kvartalsvis opkrævning og Q1-frist 1. juli.
3. [Skattestyrelsen – AM-bidrag](https://skat.dk/borger/am-bidrag): 8 %, eget ATP/pension før AM-bidrag og 2026-aldersreglen.
4. [Skattestyrelsen – skat af ansattes løn](https://skat.dk/erhverv/ansatte-og-loen/indberet-loen-eindkomst/skat-af-ansattes-loen): A-skat efter eSkattekort og arbejdsgiverens træk.
5. [Skattestyrelsens eIndkomst-vejledning – feriepenge generelt](https://info.skat.dk/data.aspx?oid=2045906): FerieKonto-/feriekasseferiepenge beskattes ved optjening, og hovedkortfradrag anvendes ikke.
6. [Skattestyrelsens eIndkomst-vejledning – timelønnede](https://info.skat.dk/data.aspx?oid=2287085): nettoferiepenge efter AM-bidrag og A-skat.
7. [Virk – Feriepenge](https://www.virk.dk/vejledning/feriepenge/fp-arbejdsgiver/): nettoferiepenge indberettes til FerieKonto.

Casebestemte pensionstal, afrunding, undervisningskonti og den simple skatteformel beskrives ikke som universelle regler.

## 7. Konsistensaudit

Terminologien er opdateret konsekvent til de frosne J0C-beslutninger. Den tidligere formateringsskade i begyndelsen af fagspecifikationen er også rettet.

Alle fire dokumenter bruger nu samme kontrakt for Niveau 1-beskyttelse, kontoplan, beregninger, checkpoint, historik, 1366-layout og sessionisolation.

## 8. Blockers før J1

Der er ingen kendte faglige eller dokumentationsmæssige blockers før J1. Alle seks tidligere beslutninger er lukket, og J0C introducerede ingen ny modstrid.

## 9. Git- og ændringsstatus

J0C afsluttes uden commit og push. Kun de fire dokumenter under `docs/` må være permanente ændringer. `artifacts/j0-niveau2/` forbliver ignored. Produktkode, tests, public assets, packagefiler, Vite/TypeScript-konfiguration, workflow og `index.html` er urørte.
