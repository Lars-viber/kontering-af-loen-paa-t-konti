# V2.1 – Faglig specifikation: juni og afstemning

## 1. Status og autoritet

Dette dokument er den autoritative faglige kontrakt for Niveau 2 i V2.1. Det skal læses sammen med:

- `V2_1_REFERENCE_R1.md`
- `V2_1_AFSTEMNING_OG_TAELLEVAERKER.md`
- `V2_1_PROGRESSION_OG_SESSION.md`

De eksisterende Niveau 2-dokumenter bevares uændret som historik. Ved modstrid gælder V2.1-dokumenterne for V2.1.

V2.1 ændrer øvelsen fra en lang bilagsrække til en afgrænset juniopgave, hvor eleven bogfører månedens lønhændelser og derefter afstemmer bogføringen mod synlige, eksterne kontroloplysninger.

## 2. Læringsmål

Det overordnede læringsmål er frosset som:

> Niveau 2 træner den studerende i at:
>
> 1. starte juni med afregning af relevante maj-forpligtelser,
> 2. bogføre juni-løn og tilhørende lønrelaterede poster,
> 3. opdatere T-kontiene,
> 4. afstemme bogføringen pr. 30/6 mod synlige tælleværker og kontroloplysninger fra lønsystemet,
> 5. dokumentere at bogføringen stemmer pr. 30/6.

Eleven skal forstå forskellen mellem:

- postering af en økonomisk hændelse,
- kontrol af debet og kredit,
- gennemgang af et korrekt bilag,
- afstemning af akkumulerede saldi,
- afslutning af en samlet regnskabsopgave.

Niveau 2 V2.1 stopper ved 30/6. Der indgår ingen juli-betalinger, ingen efterfølgende afregning af juni-forpligtelser og ingen separat slutkontrol efter afstemningen.

## 3. Fagligt omfang

V2.1 indeholder præcis ni aktive bilag:

| Bilag | Titel | Formål |
|---|---|---|
| B1 | Betaling af A-skat og AM-bidrag vedr. maj | Afvikling af maj-forpligtelser |
| B2 | Betaling af pension vedr. maj | Afvikling af maj-forpligtelse |
| B3 | Betaling til FerieKonto vedr. maj | Afvikling af maj-forpligtelse |
| B4 | Lønkørsel – timelønnede – juni | Juni-løn og medarbejdertræk |
| B5 | Arbejdsgiverbidrag – timelønnede – juni | Arbejdsgiverpension og ATP |
| B6 | Feriepenge – timelønnede – juni | Juni-feriepenge og tilhørende træk |
| B7 | Lønkørsel – månedslønnede – juni | Juni-løn og medarbejdertræk |
| B8 | Arbejdsgiverbidrag – månedslønnede – juni | Arbejdsgiverpension og ATP |
| B9 | Regulering af feriepengeforpligtelse pr. 30/6 | Juni-regulering til årets tælleværk |

Bilagene behandles i rækkefølgen B1-B9. Hvert bilag skal være korrekt før eleven kan gå videre til næste bilag.

Efter B9 følger én samlet afstemning med fem dele, A-E. Efter korrekt afstemning følger en reviewtilstand og derefter en eksplicit afslutningshandling.

## 4. Regnskabsregler og kontoplan

De eksisterende konteringsregler, fortegn, afrundingsregler og konti fra den frosne Niveau 2-specifikation videreføres. V2.1 ændrer ikke lønberegningens faglige metode.

Aktive konti i juniopgaven:

| Konto | Kontonavn | Normal saldo |
|---:|---|---|
| 2210 | Lønninger, timelønnede | Debet |
| 2211 | Lønninger, månedslønnede | Debet |
| 2215 | Pension | Debet |
| 2223 | ATP | Debet |
| 2230 | Feriepenge | Debet |
| 2235 | Regulering af feriepengeforpligtelse | Debet |
| 5820 | Bank | Debet |
| 6920 | Skyldig A-skat | Kredit |
| 6921 | Skyldig ATP | Kredit |
| 6922 | Skyldig pension | Kredit |
| 6923 | Skyldige feriepenge, FerieKonto | Kredit |
| 6924 | Feriepengeforpligtelse | Kredit |
| 6930 | Skyldigt AM-bidrag | Kredit |

## 5. Starttilstand pr. 1. juni

### Driftssaldi pr. 31. maj

| Konto | Saldo |
|---:|---:|
| 2210 | 759.656 D |
| 2211 | 970.020 D |
| 2215 | 216.704 D |
| 2223 | 11.880 D |
| 2230 | 99.174 D |
| 2235 | 24.000 D |

### Balancesaldi pr. 1. juni

| Konto | Saldo |
|---:|---:|
| 5820 | 1.500.000 D |
| 6920 | 113.988 K |
| 6921 | 11.880 K |
| 6922 | 43.741 K |
| 6923 | 11.632 K |
| 6924 | 174.000 K |
| 6930 | 29.551 K |

## 6. Bilagsflow og feedback

Eleven konterer ét bilag ad gangen. Kontrolhandlingen vurderer den aktuelle kontering og må ikke ændre progressionen alene.

Ved fejl:

- fejl markeres på den relevante side eller linje,
- eleven kan rette sin kontering,
- bilaget forbliver aktivt.

Ved korrekt bilag:

1. bilaget markeres korrekt,
2. elevens korrekte posteringer bliver readonly,
3. alle 13 T-konti bliver stående synlige,
4. status **✓ Bilaget er korrekt bogført** vises,
5. løsningen bliver i en manuel reviewtilstand,
6. knappen **Gå videre til næste bilag** bliver tilgængelig for B1-B8,
7. knappen **Gå videre til afstemning** bliver tilgængelig for B9,
8. først elevens klik på den relevante knap aktiverer næste fase.

Det faglige princip er derfor:

> Kontrol er vurdering. Gå videre er progression.

Reviewtilstanden skal kunne gendannes efter reload. Eleven må ikke springe et review over på grund af autosave eller restore.

## 7. Synlige kontroloplysninger

På B4-B9 vises lønsystemets relevante tælleværker sammen med bilaget. De er kildedata, som eleven skal bruge til bogføring og senere afstemning. De er ikke skjulte facitværdier.

Bilagene skal mindst vise:

| Bilag | Synlige kontroloplysninger |
|---|---|
| B4 | Akkumuleret bruttoløn, medarbejderpension og medarbejder-ATP for timelønnede |
| B5 | Akkumuleret arbejdsgiverpension og arbejdsgiver-ATP for timelønnede |
| B6 | Akkumulerede feriepenge for timelønnede |
| B7 | Akkumuleret bruttoløn, medarbejderpension og medarbejder-ATP for månedslønnede |
| B8 | Akkumuleret arbejdsgiverpension og arbejdsgiver-ATP for månedslønnede |
| B9 | Akkumuleret regulering og systemets feriepengeforpligtelse |

Den komplette R1-værdiserie og dens sammenhæng med kontosaldi er fastlagt i reference- og afstemningsdokumenterne.

Før B9 er korrekt, vises bogført saldo før regulering på 174.000 kr. og systemopgjort saldo pr. 30/6 på 182.500 kr. Junireguleringen på 8.500 kr. må ikke vises direkte. Efter korrekt B9 må afstemningsmaterialet desuden vise regulering år til dato på 32.500 kr.

## 8. Afstemningscheckpoint

Når B1-B9 er korrekt bogført og gennemgået, åbnes checkpointet. Eleven skal gennemføre alle fem dele:

| Del | Afstemning |
|---|---|
| A | Timelønnedes lønomkostning mod lønsystemets tælleværk for bruttoløn |
| B | Månedslønnedes lønomkostning mod lønsystemets tælleværk for bruttoløn |
| C | Øvrige lønomkostninger mod lønsystemets relevante tælleværker |
| D | Samlet lønomkostning mod summen af eksterne tælleværker |
| E | Åbne lønforpligtelser mod eksterne kontroloplysninger |

Afstemningen skal gøre beregningen synlig. Eleven skal kunne se bogført saldo, eventuelle tillæg, kontroltal og difference. En afstemning er korrekt, når hver krævet difference er 0 kr.

Ved korrekt A-E åbnes en checkpoint-reviewtilstand. Kontrolhandlingen afslutter ikke opgaven. Eleven skal efter gennemgangen aktivt vælge **Afslut Niveau 2**.

Under afstemningen vises checkpointformularen sammen med alle 13 readonly T-konti, elevens godkendte posteringer, saldi pr. 30/6 og tælleværker/kontroloplysninger. Referenceområdet skal kunne være scrollbart og sticky efter samme princip som V2.0.1. Det er et fremtidigt UI-krav, ikke en J0-implementering.

## 9. Faglig sluttilstand pr. 30. juni

### Drift

| Konto | Ultimosaldo |
|---:|---:|
| 2210 | 915.932 D |
| 2211 | 1.164.024 D |
| 2215 | 260.588 D |
| 2223 | 14.256 D |
| 2230 | 119.574 D |
| 2235 | 32.500 D |
| **I alt** | **2.506.874 D** |

### Balance og åbne forpligtelser

| Konto | Ultimosaldo |
|---:|---:|
| 5820 | 1.086.225 D |
| 6920 | 114.447 K |
| 6930 | 29.654 K |
| 6922 | 43.884 K |
| 6921 | 14.256 K |
| 6923 | 11.716 K |
| 6924 | 182.500 K |

Banken afledes af de faktiske juni-betalinger:

`1.500.000 - 113.988 - 29.551 - 43.741 - 11.632 - 97.072 - 117.791 = 1.086.225`

De seks kreditposter er tilsigtede åbne juni-forpligtelser. Opgaven stopper pr. 30/6, efter forpligtelserne er bogført og før de bliver afregnet. Det er derfor ikke en fejl, at A-skat, AM-bidrag, pension, ATP, nettoferiepenge til FerieKonto og feriepengeforpligtelse ikke er nul.

## 10. Completion

Completed-status opstår kun efter:

1. korrekt B1-B9,
2. gennemført review af hvert bilag,
3. korrekt checkpoint A-E,
4. gennemført checkpoint-review,
5. elevens klik på **Afslut Niveau 2**.

Completed-visningen skal dokumentere den færdige juniopgave og dens afstemning. Den må ikke føje nye faglige opgaver til forløbet.

## 11. Generator- og versionskontrakt

V2.1 låser følgende kontrakt:

- `rulesetYear = 2026`
- `rulesetVersion = 2`
- `generatorVersion = 2`
- `sessionSchemaVersion = 2`
- session key: `kontering-af-loen-paa-t-konti.level2.session.v2`

Generatoren skal senere implementere den frosne V2.1-model deterministisk. Samme seed skal give samme opgave, samme kildeoplysninger og samme facit. V1- og V2.0-sessioner må ikke fortolkes som V2.1-sessioner.

Generator V2 skal genbruge de faglige inputrammer fra V2.0.x: 3-6 timelønnede, 3-6 månedslønnede, samme rammer for løn, timer, skat, pension og ATP, samme feriepengeprincipper og samme bank-guardrail. Outputkontrakten ændres til ni bilag og final state pr. 30/6.

## 12. Historiske koncepter, som ikke er aktive i V2.1

**SUPERSEDED IN V2.1:** B10-B13 indgår ikke i den aktive V2.1-opgave. De bevares kun i historiske dokumenter og eksisterende tags.

**SUPERSEDED IN V2.1:** `finalControl` er ikke et aktivt trin. Den faglige slutkontrol er afstemningscheckpoint A-E.

**SUPERSEDED IN V2.1:** Automatisk progression umiddelbart efter korrekt kontrol er erstattet af manuel review og **Gå videre**.

**SUPERSEDED IN V2.1:** Den tidligere opdeling med separate checkpoint- og final-control-forløb er erstattet af ét samlet checkpoint efter B9.

Disse markeringer er afgrænsninger. De må ikke bruges som grundlag for at genindføre de historiske koncepter i V2.1.

## 13. Afgrænsning

J0 fastlægger kun den faglige kontrakt. Implementering af generator, state, session, controller, UI og tests hører til senere jobs. V2.1 må ikke ændre historiske tags eller den allerede frigivne V2.0.1-adfærd.
