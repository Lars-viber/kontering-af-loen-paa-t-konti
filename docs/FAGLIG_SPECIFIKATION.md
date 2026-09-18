# Faglig specifikation og projektkontrakt

## 1. Autoritet, formål og scope

Dette dokument er det autoritative v1-grundlag for **Kontering af løn på T-konti**. Den eksisterende Lovable-prototype er fagligt kildegrundlag, men den nye app skal være en selvstændig React/TypeScript/Vite-app. Prototypeframework, UI-kode og dependency-træ må ikke importeres. Ved konflikt med video eller prototypepræsentation gælder denne specifikation.

Eleven modtager et summeret månedligt lønbilag for 3–10 medarbejdere og konterer det på otte T-konti. Eleven vælger Debet/Kredit ved at skrive positive hele kronebeløb. Træningen omfatter lønomkostninger, ATP, pension, AM-bidrag, A-skat, nettoløn, skyldige lønrelaterede poster og dobbelt bogføring.

V1 er en statisk single-page-app uden backend. Den skal senere rumme hovedmenu, deterministiske varianter, autosave/restore, lønbilag, kontoplan, sammenklappelig video, T-konti, Debet/Kredit-totaler, feltvis kontrol og read-only completed view.

## 2. Låst kontoplan

| Konto | Kontonavn | Type |
|---:|---|---|
| 2210 | Lønninger | Drift |
| 2215 | Pensioner | Drift |
| 2223 | ATP | Drift |
| 6920 | Skyldig A-skat | Balance |
| 6921 | Skyldig ATP | Balance |
| 6922 | Skyldig pension | Balance |
| 6930 | Skyldig AM-bidrag | Balance |
| 5820 | Bankkonto | Balance |

Kun disse konti må anvendes. Numre, navne og typer er låst; alternative konti eller navne må ikke tilføjes.

## 3. Datamodel

Et genereret ExerciseSnapshot skal konceptuelt indeholde generatorVersion, variant, medarbejderantal, individuelle medarbejdergrundlag, summeret lønbilag, fast kontoplan og facit for de 16 Debet/Kredit-felter.

En medarbejderpost skal mindst repræsentere bruttoløn, ATP, pensionsprocent, pension, AM-grundlag, AM-bidrag, skatteprocent, fradrag og A-skat. Alle beløb er heltal i kroner. Intern matematik bruger tal, aldrig formateret tekst.

## 4. Deterministisk variantmodel og RNG

V1 starter med:

- generatorVersion = 1
- variantinterval 1–999999

GeneratorVersion + variant skal altid give præcis samme individuelle data, lønbilag og facit på alle maskiner og genindlæsninger.

J1 bør bruge en dependency-fri seeded PRNG, eksempelvis Mulberry32, med et stabilt 32-bit-seed afledt af en eksplicit streng som payroll:v1:<variant>. Math.random må ikke indgå. RNG-trækkenes rækkefølge og antal er en del af generatorVersion 1 og må ikke ændres uden bevidst versionsbeslutning.

Generér ny opgave vælger en gyldig variant uafhængigt af student state. Bestemt variant accepterer kun heltal 1–999999. En gemt opgave gendannes fra snapshot og regenereres aldrig.

## 5. Generatorregler pr. medarbejder

Medarbejderantal:

3 + floor(random * 8)

Udfaldsrummet er 3–10 inklusive.

For hver medarbejder beregnes i denne rækkefølge:

1. Bruttoløn = (28 + heltal 0–44) × 1.000 + (heltal 0–19) × 25. Interval: 28.000–72.475.
2. ATP = 99.
3. Pensionsprocent vælges ligeligt mellem 4, 5, 6, 8 og 10 %.
4. Pension = round((bruttoløn × pensionsprocent / 100) / 25) × 25.
5. AM-grundlag = bruttoløn − ATP − pension.
6. AM-bidrag = round(AM-grundlag × 8 / 100).
7. Skatteprocent er et heltal 36–42 inklusive.
8. Fradrag = 4.000 + heltal 0–8 × 250.
9. Skattegrundlag = AM-grundlag − AM-bidrag − fradrag.
10. A-skat = round(skattegrundlag × skatteprocent / 100).

V1 bevarer modellen præcist. ATP-sats, AM-grundlag, skat, pension og udfaldsrum må ikke fagligt forbedres uden eksplicit beslutning.

## 6. Summering og afrundingskontrakt

Efter individuel beregning:

- samlet bruttoløn = sum af bruttoløn
- samlet ATP = medarbejderantal × 99
- samlet pension = sum af individuelt 25-kroners-afrundede pensioner
- samlet AM-grundlag = samlet bruttoløn − samlet ATP − samlet pension
- samlet AM-bidrag = sum af individuelt afrundede AM-bidrag
- samlet A-skat = sum af individuelt afrundede A-skatter
- samlet nettoløn = samlet AM-grundlag − samlet AM-bidrag − samlet A-skat

AM-bidrag og A-skat beregnes og afrundes pr. medarbejder før summering. De må ikke beregnes én gang på totalsummer. Pension afrundes ligeledes individuelt før summering.

## 7. Lønbilag

Read-only-bilaget viser:

- Samlebilag for månedsløn, X medarbejdere.
- Alle beløb i kr.
- Bruttoløn
- ATP
- Pension
- Bruttoløn efter pensioner (AM-grundlag)
- AM-bidrag, afrundet
- A-skat
- Nettoløn

UI-labelen bevares, selv om AM-grundlaget faktisk fratrækker både ATP og pension. Beløb højrestilles og vises med dansk tusindtalsseparator, fx 145.812. ATP, pension, AM-bidrag og A-skat kan visuelt vises med minus. Nettoløn fremhæves.

## 8. Autoritativ facitkontering

| Konto | Debet | Kredit |
|---:|---|---|
| 2210 Lønninger | AM-grundlag | 0 |
| 2215 Pensioner | pension | 0 |
| 2223 ATP | ATP | 0 |
| 6920 Skyldig A-skat | 0 | A-skat |
| 6921 Skyldig ATP | 0 | ATP |
| 6922 Skyldig pension | 0 | pension |
| 6930 Skyldig AM-bidrag | 0 | AM-bidrag |
| 5820 Bankkonto | 0 | nettoløn |

2210 debiteres med AM-grundlaget, ikke bruttolønnen. Pension og ATP debiteres særskilt.

Hard sammenhæng:

2210 Debet + 2215 Debet + 2223 Debet = samlet bruttoløn

6920 Kredit + 6921 Kredit + 6922 Kredit + 6930 Kredit + 5820 Kredit = samlet bruttoløn

Facit skal derfor altid have Debet = Kredit.

## 9. Gennemregnet konsistenseksempel

Eksemplet kontrollerer modellen og ændrer ingen regler.

| Medarbejder | Brutto | ATP | Pension | AM-grundlag | AM 8 % | Skatte-% | Fradrag | A-skat | Nettoløn |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 28.000 | 99 | 1.125 (4 %) | 26.776 | 2.142 | 36 % | 4.000 | 7.428 | 17.206 |
| 2 | 35.000 | 99 | 1.750 (5 %) | 33.151 | 2.652 | 37 % | 4.250 | 9.712 | 20.787 |
| 3 | 42.475 | 99 | 3.400 (8 %) | 38.976 | 3.118 | 42 % | 6.000 | 12.540 | 23.318 |
| **I alt** | **105.475** | **297** | **6.275** | **98.903** | **7.912** |  |  | **29.680** | **61.311** |

Kontrol:

- Medarbejder 1: pension round(1.120 / 25) × 25 = 1.125; AM = round(26.776 × 8 %) = 2.142; A-skat = round((26.776 − 2.142 − 4.000) × 36 %) = 7.428.
- Medarbejder 2: AM = round(33.151 × 8 %) = 2.652; A-skat = round((33.151 − 2.652 − 4.250) × 37 %) = 9.712.
- Medarbejder 3: pension round(3.398 / 25) × 25 = 3.400; AM = round(38.976 × 8 %) = 3.118; A-skat = round((38.976 − 3.118 − 6.000) × 42 %) = 12.540.

Facit-Debet: 98.903 + 6.275 + 297 = **105.475**.

Facit-Kredit: 29.680 + 297 + 6.275 + 7.912 + 61.311 = **105.475**.

Eksemplet bekræfter lønbilag, individuel afrunding, facit og dobbelt bogføring.

## 10. Hard generatorinvariants

- antal medarbejdere ∈ [3, 10]
- hver bruttoløn følger formlen og ligger 28.000–72.475
- samlet ATP = antal medarbejdere × 99
- pensionsprocent ∈ {4, 5, 6, 8, 10}
- pension er ikke-negativ og delelig med 25
- AM-grundlag = bruttoløn − ATP − pension, individuelt og samlet
- hvert AM-bidrag er individuel afrundet 8 % og ikke-negativt
- skatteprocent er heltal 36–42
- fradrag er 4.000–6.000 i 250-trin
- hver A-skat følger den individuelle formel og er ikke-negativ
- nettoløn er ikke-negativ
- facit-Debet = facit-Kredit
- 2210 + 2215 + 2223 Debet = samlet bruttoløn
- ingen facitkonto findes uden for den faste kontoplan

## 11. Elevinput og parser

Alle otte konti vises som T-konti med kontonummer, navn, type, Debet og Kredit. Siden angiver fortegnet, så eleven indtaster positive beløb. Blankt betyder ingen postering og fortolkes som 0.

Parseren accepterer 145812, 145.812 og 145 812 som 145.812 kr. Kun ikke-negative hele kroner accepteres. Øre, decimaler, minus, formler og tvetydige tegn afvises med tilgængelig feedback. Ingen formelmotor er nødvendig.

## 12. Feltvis kontrolflow

Hvert Debet/Kredit-felt har selvstændig status:

- unchecked: neutralt og redigerbart
- incorrect: rødt, tekstligt markeret og redigerbart
- correct: grønt, tekstligt markeret og låst

Kontrollér sammenligner hvert felt med facit. Blank er korrekt mod facit 0. Et korrekt felt låses, selv om modfeltet er forkert. Forkerte felter låses aldrig. Gentagen kontrol bevarer korrekte felter og vurderer de øvrige igen.

Fejlfeedback må ikke vise facit eller Korrekt: 123.000. Completion kræver, at alle 16 felter er korrekte.

## 13. Debet/Kredit-hjælp

Debet i alt og Kredit i alt beregnes kun af elevens aktuelle input:

- begge 0: ingen status
- mindst én ikke 0 og forskellige summer: balancerer ikke
- ens summer > 0: balancerer

Balancerer betyder kun, at elevens summer er ens; det betyder ikke, at konteringen er korrekt. Kontrollér er faglig validering. Totalhjælpen bevares didaktisk, fordi lønbilag er komplekse.

## 14. Nulstil og ny opgave

Nulstil svar rydder alle input, kontrolstatusser og låse, men bevarer snapshot og variant. Hvis korrekte låste felter findes, bruges tydelig confirmation eller tilsvarende UX.

Generér ny opgave vælger et nyt variantnummer. Bestemt variant bruger elevens nummer. En ufærdig session må ikke overskrives uden confirmation.

## 15. Session, autosave og restore

V1 starter med schemaVersion = 1. SchemaVersion beskriver sessionformat; generatorVersion beskriver generatoradfærd.

Sessionen indeholder mindst schemaVersion, generatorVersion, variant, exerciseSnapshot, studentState, completed og savedAt. Student state indeholder de 16 elevfelter samt kontrol-/låsetilstande.

Input, kontrolstatus, korrekte låse og completion autosaves. Snapshot er autoritativt ved restore. Reload gendanner variant, bilag, svar, statusser, låse og completion uden generatoropkald. Ufærdig session giver Fortsæt opgaven; completed session giver Se afsluttet opgave.

## 16. Completion

Når alle felter er korrekte, sættes completed = true. Successtatus har betydningen:

- Lønkonteringen er korrekt
- Alle posteringer er korrekt konteret.

Handlinger: Se afsluttet opgave, Til hovedmenu og Generér ny opgave.

Completed view viser read-only lønbilag, kontoplan, otte færdige T-konti og begge totaler. Der er ingen inputs eller Kontrollér-knap.

## 17. Video

Videogennemgang har beskrivelsen: Se en gennemgang af lønbogføring, inden du løser opgaven.

Embed: https://www.youtube.com/embed/A6XmMtNr5mM

Sektionen er lukket som standard og har korrekt aria-expanded/aria-controls. Ved åbning vises:

> **Bemærk:** Videoen bruger forældede ATP-satser og en anden kontoplan end den, der anvendes i denne øvelse. Følg altid de satser og konti, der er angivet her på siden.

Videoen er aldrig programmatisk datakilde.

## 18. Hovedmenu, UI og layout

Hovedmenu:

- Generér ny opgave
- Bestemt variant
- Fortsæt opgaven ved ufærdig session
- Se afsluttet opgave ved completed session

Kompakt øvelsesside:

1. header med appnavn, variant og hovedmenu-link
2. lønbilag og synlig kontoplan
3. sammenklappelig video
4. T-konto-grid
5. totaler samt Kontrollér og Nulstil svar

Desktopmål: 1280×720, 1366×768 og 1920×1080. T-konti vises i to eller tre kolonner. 1366×768 er nøglemål. Ingen horisontal sidescroll. Beløb højrestilles, labels venstrestilles, kontonumre er tydelige, inputs er kompakte, og kontiene ligner T-konti.

## 19. Designsystem

| Rolle | Farve |
|---|---|
| Primary | #0050A4 |
| Primary hover | #003F82 |
| Medium blue | #1769C2 |
| Light blue | #DCEBFA |
| Background | #F4F8FD |
| Surface | #FFFFFF |
| Text | #172B3A |
| Success | #278369 |
| Error | #A53A32 |

Lovables beige/brune design kopieres ikke. Designet skal være roligt, tæt og regnskabsorienteret.

## 20. Accessibility

- programmatisk label på hvert input med konto og side
- fuld tastaturbetjening og synligt fokus
- status kommunikeres med tekst/ikon samt farve
- handlinger er rigtige buttons
- dialoger har fokusstyring
- video har korrekt aria-state
- gemme-, kontrol- og completionstatus annonceres passende

## 21. Teststrategi

Generator/faglig matematik:

- deterministisk snapshot for samme generatorVersion + variant
- variantgrænser og ugyldige værdier
- medarbejderantal, bruttolønsformel og interval
- ATP 99 pr. medarbejder
- pensionsprocenter og 25-kroners-afrunding
- individuelt/samlet AM-grundlag
- individuelt afrundet AM 8 %
- skatteprocent og fradrag
- individuel og summeret A-skat
- nettoløn, alle otte konti, facit og Debet = Kredit

Parser/kontrol:

- tre tilladte heltalsformater
- blank = 0
- ugyldige, negative og decimale input
- feltvis grading, låsning og gentaget kontrol
- ingen facitafsløring
- live-totaler og balance-status
- balanceret er ikke det samme som korrekt
- Nulstil bevarer snapshot/variant

Session/UI:

- autosave og snapshotrestore uden generator
- confirmation ved erstatning
- read-only completed view
- keyboard, labels, fokus og ikke-kun-farve
- video lukket som default
- ingen overflow ved de tre desktopmål

Låste fixtures planlægges for mindst 1, 2, 3, 42 og 999999. Før release køres mindst 4.000 varianter. Stressrapporten viser medarbejderantal, pensionsprocenter, skatteprocenter, fradragsniveauer og bruttolønsinterval for at opdage død logik, ikke for perfekt fordeling.

## 22. Teknisk retning

React, TypeScript og Vite med kun nødvendige dependencies. Ingen TanStack Start/Router, Radix-suite eller Tailwind uden konkret senere behov. Domænelogik, generator, parser, facit og sessioncodec holdes adskilt fra React. Ingen formelmotor.

## 23. Terminologi og out-of-scope

Brug konsekvent: Lønbilag, Kontoplan, T-konti, Debet, Kredit, AM-grundlag, AM-bidrag, A-skat, Nettoløn, Pension og ATP.

Uden for v1:

- login, backend, database og cloud sync
- PDF, Excel-export og print-layout
- karaktergivning, leaderboard og analytics
- real-time skattesatser og lønsystemintegration
- flere kontoplaner
- mobil-first redesign
- automatisk forklaringsfacit
- import af Lovable-framework/UI

## 24. Bevidst bevaret fra Lovable

De otte konti; alle beregninger og udfaldsrum; ATP 99; pensionsprocenter; AM 8 %; skatteprocent/fradrag; individuel beregning før summering; facit; Debet/Kredit-totaler; og lønbilag + kontoplan + video + T-konti.

## 25. Bevidst ikke kopieret

Math.random erstattes; forkerte svar låses ikke; facit afsløres ikke; videoblokken er sammenklappelig; TanStack/Tailwind/Radix/Lovable-stacken og beige/brunt design kopieres ikke.

## 26. Faseplan

- J0: Faglig specifikation og projektkontrakt
- J1: Projektfundament, deterministisk generator, facitmotor og tests
- J2: Hovedmenu, variant, session/localStorage og restore
- J3: Funktionel øvelse: lønbilag, kontoplan, video, T-konti, totaler, Kontrollér
- J4: Completion, read-only completed view og responsive/browser-polish
- J5: Slutaudit, Git/GitHub Pages og release

Planen kan justeres ved konkrete behov, men faglige ændringer kræver eksplicit beslutning.

## 27. Intern konsistens

Lønbilag, facit, totaler, completion, blank/zero-semantik, variantmodel og snapshotrestore er indbyrdes konsistente. Det gennemregnede eksempel bekræfter individuel afrunding og balanceret facit. Der er ingen faglig J0-blocker.