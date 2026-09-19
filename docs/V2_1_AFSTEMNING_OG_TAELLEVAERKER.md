# V2.1 – Afstemning og tælleværker

## 1. Formål

Dette dokument fastlægger den faglige model for lønsystemets synlige tælleværker og for afstemningscheckpoint A-E. De konkrete R1-beløb findes i `V2_1_REFERENCE_R1.md`.

## 2. Fagligt princip

En lønafstemning sammenholder to uafhængige repræsentationer af samme økonomiske forhold:

1. bogføringen på T-kontiene,
2. kontroloplysninger fra lønsystemet eller en ekstern opgørelse.

Kontroloplysningerne er kildedata i opgaven. De skal være synlige, have en tydelig betegnelse og kunne spores til det relevante bilag. De må ikke skjules som en facitnøgle, der først vises efter elevens svar.

Et facit er derimod systemets regel for, hvordan kildedata og bogførte saldi skal sammenholdes. Denne regel bruges til grading, men selve afstemningsberegningen skal være gennemskuelig for eleven.

I V2.0.x blev eleven i praksis kontrolleret mod skjulte expected values. I V2.1 afstemmer eleven sin bogføring mod synlige, eksterne kontrolkilder. Det er en bevidst ændring: afstemningen er hverken en hukommelsestest eller en facitquiz.

## 3. Begreber

| Begreb | Definition |
|---|---|
| Månedstal | En værdi for den aktuelle lønperiode, her juni |
| Akkumuleret tælleværk | Summen fra årets begyndelse til og med juni |
| Bogført saldo | Saldoen på en T-konto efter de korrekte juni-bilag |
| Ekstern kontrol | En synlig værdi fra lønsystem eller tredjepart |
| Afstemningsgrundlag | Den viste beregning, som gør bogføring og kontroltal sammenlignelige |
| Difference | Afstemningsgrundlag minus kontroltal |

En korrekt afstemning har difference 0 kr. Afrunding følger lønberegningens eksisterende regler; afstemningen introducerer ingen selvstændig tolerance.

## 4. Tælleværker på B4-B9

Tælleværkerne placeres ved det bilag, hvor de giver faglig mening. Eleven skal kunne læse, hvad tælleværket omfatter, hvilken periode det dækker, og om beløbet er et månedstal eller et akkumuleret tal.

### B4 – Timelønnedes lønseddel

- Bruttoløn år til dato: 956.570 kr.
- Medarbejderpension år til dato: 38.262 kr.
- Medarbejder-ATP år til dato: 2.376 kr.

Den bogførte konto 2210 indeholder AM-grundlaget. Derfor rekonstrueres bruttolønnen ved at lægge medarbejderpension og medarbejder-ATP til kontosaldoen.

### B5 – Timelønnedes arbejdsgiverandel

- Arbejdsgiverpension år til dato: 76.526 kr.
- Arbejdsgiver-ATP år til dato: 4.752 kr.

### B6 – Timelønnedes feriepenge

- Bruttoferiepenge år til dato: 119.574 kr.

### B7 – Månedslønnedes lønseddel

- Bruttoløn år til dato: 1.215.000 kr.
- Medarbejderpension år til dato: 48.600 kr.
- Medarbejder-ATP år til dato: 2.376 kr.

Den bogførte konto 2211 indeholder AM-grundlaget. Bruttolønnen rekonstrueres derfor på samme måde som for de timelønnede.

### B8 – Månedslønnedes arbejdsgiverandel

- Arbejdsgiverpension år til dato: 97.200 kr.
- Arbejdsgiver-ATP år til dato: 4.752 kr.

### B9 – Feriepengeforpligtelse

- Regulering år til dato: 32.500 kr.
- Feriepengeforpligtelse ifølge lønsystemet: 182.500 kr.

Den første værdi afstemmes mod konto 2235. Den anden værdi afstemmes mod konto 6924.

Før B9 er korrekt, vises kun bogført saldo før regulering på 174.000 kr. og systemopgjort saldo på 182.500 kr. Reguleringen på 8.500 kr. må ikke vises direkte. Regulering år til dato på 32.500 kr. må føjes til afstemningsmaterialet efter korrekt B9.

## 5. Eksterne kontroloplysninger

Checkpoint E bruger følgende kontroloplysninger pr. 30. juni:

| Område | Kildebetydning | R1-kontroltal |
|---|---|---:|
| A-skat | Lønsystemets åbne A-skat | 114.447 |
| AM-bidrag | Lønsystemets åbne AM-bidrag | 29.654 |
| Pension | Pensionsforpligtelse | 43.884 |
| ATP | ATP-forpligtelse | 14.256 |
| FerieKonto | Beløb til afregning | 11.716 |
| Feriepengeforpligtelse | Lønsystemets opgjorte forpligtelse | 182.500 |

Oplysningerne vises som eksterne kontroltal. De må ikke præsenteres som T-kontienes korrekte saldo på forhånd.

## 6. Checkpoint A-E

Checkpointet bliver tilgængeligt, når alle ni bilag er korrekt konteret og gennemgået. Alle dele indgår i samme checkpoint.

### A – Timelønnedes lønomkostning

Formål: At dokumentere sammenhængen mellem AM-grundlaget på konto 2210 og lønsystemets bruttoløn.

Eleven indtaster lønkonto år til dato, medarbejderpension år til dato, medarbejder-ATP år til dato og beregnet bruttoløn år til dato.

| Led | R1-værdi |
|---|---:|
| Konto 2210 | 915.932 |
| Medarbejderpension | +38.262 |
| Medarbejder-ATP | +2.376 |
| Afstemningsgrundlag | 956.570 |
| Tælleværk for bruttoløn | 956.570 |
| **Difference** | **0** |

Efter korrekt kontrol står bogført/beregnet værdi, tælleværk, difference og status **✓ Stemmer** permanent readonly.

### B – Månedslønnedes lønomkostning

Formål: At dokumentere sammenhængen mellem AM-grundlaget på konto 2211 og lønsystemets bruttoløn.

Eleven indtaster lønkonto år til dato, medarbejderpension år til dato, medarbejder-ATP år til dato og beregnet bruttoløn år til dato.

| Led | R1-værdi |
|---|---:|
| Konto 2211 | 1.164.024 |
| Medarbejderpension | +48.600 |
| Medarbejder-ATP | +2.376 |
| Afstemningsgrundlag | 1.215.000 |
| Tælleværk for bruttoløn | 1.215.000 |
| **Difference** | **0** |

Efter korrekt kontrol står bogført/beregnet værdi, tælleværk, difference og status **✓ Stemmer** permanent readonly.

### C – Øvrige lønomkostninger

Formål: At afstemme de øvrige driftskonti mod lønsystemets relevante akkumulerede tælleværker.

Eleven indtaster arbejdsgiverpension år til dato, arbejdsgiver-ATP år til dato, feriepenge for timelønnede år til dato og regulering af feriepengeforpligtelse år til dato.

| Afstemning | Bogført grundlag | Kontroltal | Difference |
|---|---:|---:|---:|
| Arbejdsgiverpension | 260.588 - 38.262 - 48.600 = 173.726 | 76.526 + 97.200 = 173.726 | 0 |
| Arbejdsgiver-ATP | 14.256 - 2.376 - 2.376 = 9.504 | 4.752 + 4.752 = 9.504 | 0 |
| Feriepenge, konto 2230 | 119.574 | 119.574 | 0 |
| Regulering, konto 2235 | 32.500 | 32.500 | 0 |

Konto 2215 og 2223 indeholder både medarbejder- og arbejdsgiverandele. Bogføringssiden udskiller derfor arbejdsgiverandelene fra kontosaldoen ved hjælp af de synlige tælleværker for medarbejderandelene. Kontrolsiden summerer de synlige tælleværker for arbejdsgiverandelene. Eleven må ikke forventes at gætte en skjult fordeling.

Efter korrekt kontrol vises bogført værdi, tælleværk, difference og **✓ Stemmer** readonly for hver linje.

### D – Samlet lønomkostning

Formål: At dokumentere, at driftskontiene samlet stemmer med alle relevante tælleværker for omkostninger fra lønsystemet.

Eleven indtaster de samlede lønrelaterede omkostninger år til dato. Kontrolsummen er summen af de allerede viste tælleværker og er ikke et nyt, skjult facit.

| Led | R1-værdi |
|---|---:|
| Timelønnedes bruttoløn | 956.570 |
| Månedslønnedes bruttoløn | 1.215.000 |
| Arbejdsgiverpension | 173.726 |
| Arbejdsgiver-ATP | 9.504 |
| Feriepenge | 119.574 |
| Regulering af feriepengeforpligtelse | 32.500 |
| Kontrolsum | 2.506.874 |
| Bogført driftssum | 2.506.874 |
| **Difference** | **0** |

Efter korrekt kontrol vises bogført/beregnet værdi, sum af tælleværker, difference og **✓ Stemmer** readonly.

### E – Åbne forpligtelser

Formål: At dokumentere, at hver åben lønforpligtelse stemmer med sin eksterne kontroloplysning.

For hver konto indtaster eleven både beløb og D/K. Kreditsiden er en del af det korrekte svar; et rigtigt beløb med forkert side er ikke korrekt.

| Konto | Bogført ultimosaldo | Ekstern kontrol | Difference |
|---:|---:|---:|---:|
| 6920 | 114.447 | 114.447 | 0 |
| 6930 | 29.654 | 29.654 | 0 |
| 6922 | 43.884 | 43.884 | 0 |
| 6921 | 14.256 | 14.256 | 0 |
| 6923 | 11.716 | 11.716 | 0 |
| 6924 | 182.500 | 182.500 | 0 |

Efter korrekt kontrol vises post, bogført saldo med D/K, kontroloplysning, difference og **✓ Stemmer** readonly.

## 7. Elevens handlinger og grading

Afstemningen skal lade eleven udføre eller bekræfte de fagligt meningsfulde koblinger. Systemet må beregne summer og differencer, når de underliggende valg eller indtastninger er elevens.

Ved kontrol skal systemet:

1. vurdere alle krævede felter og koblinger,
2. vise hvilke delafstemninger der ikke stemmer,
3. bevare elevens svar til rettelse,
4. blive i checkpointet ved fejl,
5. åbne reviewtilstand, når A-E er korrekt.

Kontrolhandlingen må ikke sætte opgaven direkte til completed. Reviewtilstanden viser den samlede, korrekte afstemning. Eleven afslutter derefter med **Afslut Niveau 2**.

Når alle fem dele er korrekte, vises **✓ Afstemningen pr. 30/6 stemmer**, gerne sammen med **5 af 5 afstemninger korrekte**, før afslutningsknappen.

## 8. Tilladte og ikke tilladte oplysninger

Tilladt i det synlige referenceområde:

- eksternt tælleværk fra lønsystemet,
- systemopgjort feriepengeforpligtelse,
- betalings- og afregningskontroltal,
- elevens egne T-kontosaldi.

Ikke tilladt som hjælp til elevens bogføring:

- skjult answer key,
- expected posting accounts,
- debet/kredit-facit for bilag,
- autofill af elevens bogførte værdier,
- ændring af input uden elevhandling.

Under afstemningen skal eleven samtidig kunne se checkpointformularen, alle 13 readonly T-konti, egne godkendte posteringer, saldi pr. 30/6 og de synlige kontroloplysninger. Referenceområdet skal følge den scrollbare/sticky V2.0.1-UX på desktop.

## 9. Sporbarhed og implementeringskrav

En senere generator skal udlede:

- månedstal fra medarbejderdata og satser,
- akkumulerede tælleværker fra januar-juni-historikken,
- bilagsfacit fra lønhændelserne,
- ultimosaldi fra startsaldi og bilag,
- afstemningsfacit fra tælleværker og ultimosaldi.

R1-værdierne er en låst referencefixture. Produktionslogikken må ikke opnå R1-resultatet ved at hardcode elevens facit uafhængigt af generatorens kildedata.

Samme seed og versionskombination skal give samme tælleværker, bilag, saldi og afstemning.

## 10. Historisk afgrænsning

**SUPERSEDED IN V2.1:** En separat slutkontrol efter checkpointet er udgået. A-E dækker både lønomkostninger og åbne forpligtelser.

**SUPERSEDED IN V2.1:** B10-B13 bidrager ikke til tælleværker, saldi eller progression og findes ikke i den aktive V2.1-kontrakt.
