# Niveau 2 – frosne UI- og interaktionskrav

## 1. Formål og Niveau 1

Niveau 2 skal rumme 13 bilag, 13 synlige T-konti, historiske saldi, flere posteringer pr. konto, checkpoint og slutkontrol. Plads og overblik er produktkrav. Dokumentet fastlægger acceptance-kriterier uden at implementere UI.

Niveau 1's faglige regler, generator, fixtures, session, parser/grading og brugerflow må ikke ændres uden en dokumenteret reel bug. Eksplicit godkendte præsentationsændringer er tilladt i v2. Allerede godkendt: tal og tilhørende tekst i Niveau 1-lønbilaget får samme grundskriftstørrelse; tal forbliver højrestillede og kan bruge tabular-nums og anden vægt.

Niveau 2 bruger en separat sessionmodel og må ikke genbruge Niveau 1's model med ét Debet- og ét Kredit-input pr. konto.

## 2. Arbejdsflade

Desktoplayout:

- venstre: sticky read-only reference-/bilagspanel
- højre: T-kontoarbejdsområde i grid
- aktuelt bilag forbliver synligt, mens eleven scroller T-kontiene
- alle 13 konti er til stede fra start
- bilag afsløres ét ad gangen
- fremtidige bilagstitler behøver ikke være synlige

Bilagets synlighed må ikke fortrænges af permanent kontoplan eller video.

## 3. Responsive krav

| Viewport | Frosset krav |
|---|---|
| 1920 px | 3–4 kolonner og læsbar max-width |
| 1366×768 | Sticky bilag, mindst 3 T-konti på samme række og mindst 2 komplette rækker synlige samtidig i T-kontoarbejdsområdet |
| ca. 1280 px | 3 kolonner som mål; 2 kun hvis dokumenteret nødvendigt for kortenes minimumsbredde |
| 900–1279 px | 2 kolonner og kompakt/sticky referencepanel |
| Smal mobil | 1 kolonne og almindelig vertikal navigation |

1366×768 er et hårdt acceptance-krav. Det testes senere ved tidligt bilag, sent junibilag, konto med historik og fejltilstand. Checkpoint testes separat som en anden fase. Der må ikke være horisontal sidescroll.

Browseraudit skal mindst dække 900, 1280, 1366 og 1920 px.

## 4. Sticky referencepanel

Panelet viser:

- bilagsnummer og aktuel titel
- måned, regelsæt og variant
- medarbejdergruppe, hvor relevant
- read-only beregningslinjer og totaler
- kort opgaveinstruktion
- aktuel bilagsstatus/navigation uden løsningsafsløring
- kompakte knapper `Kontoplan` og `Videogennemgang`

Sticky-adfærd respekterer header, viewport og tastaturfokus. Ved lav højde kan panelets eget indhold scrolles, men T-kontoarbejdsområdet skal forblive anvendeligt.

## 5. Kontoplan og video

`Kontoplan` åbner en keyboard-accessible modal/drawer med alle 13 konti, nummer, navn, type og markering af undervisningskonti. Alle T-konti forbliver synlige i arbejdsfladen.

`Videogennemgang` åbner en modal/dialog. Niveau 1-videoen og advarslen bevares. Iframe mountes kun ved åbning og fjernes ved lukning; videoen bruger ingen permanent vertikal plads.

Overlays har tilgængeligt navn, fokusindfangning, Escape-lukning og fokusretur.

## 6. T-kort og frossen historikmodel

Hvert T-kort viser kompakt:

- relevant startsaldo
- højst de 3 seneste godkendte/historiske posteringer
- aktuelle redigerbare posteringer
- aktuel saldo

Der er ingen permanent intern scrollbar i hvert T-kort. Hvis ældre posteringer findes, vises en button som `+ 4 tidligere posteringer`. Den åbner en read-only, keyboard-accessible drawer/modal med hele kontohistorikken.

Formålet er stabil korthøjde, få samtidige scrollområder og to komplette synlige rækker ved 1366×768.

En kompakt historikrække kan fx vise `B1 · A-skat maj · 113.988 D · ✓`. Bilag, tekst, beløb, side og godkendt status skal også være programmatisk forståelige. Godkendte poster vises som tekst, ikke store disabled inputs.

## 7. Aktuelle posteringer og kontrol

Et bilag kan have flere elevrækker på samme konto og side. Eleven kan tilføje en række, indtaste et positivt helt kronebeløb, angive kort posteringstekst og fjerne en endnu ikke godkendt række.

Hver række bærer bilag, konto, side, beløb, tekst, medarbejdergruppe/type og status. Inputlabel indeholder mindst bilag, konto og side.

Kontrol sker pr. `konto + bilag + side`. Summer på Debet og Kredit vurderes hver for sig; nettomodregning accepteres ikke. En korrekt postering/sum låses, men kontoen forbliver åben for senere bilag. Forkerte poster forbliver redigerbare og får rød tekstlig status uden facitbeløb.

## 8. Bilagsprogression

- Kun aktuelt bilag kan redigeres.
- Godkendt bilag bliver read-only.
- Næste bilag åbnes først, når aktuelt bilag er korrekt.
- Godkendte tidligere bilag kan genåbnes read-only.
- T-konti akkumulerer posteringer gennem flowet.
- Autosave bevarer rå input, rækker, låse, aktuelt bilag og fase.
- Ingen fremtidig konto eller titel må afsløre løsningen.

## 9. Sessionisolation – hårdt J1-krav

Niveau 1 beholder sin eksisterende storage key og kontrakt. Niveau 2 får egen `schemaVersion`, sessionmodel, codec/validation og storage key. Foreløbig key kan være `kontering-af-loen-paa-t-konti.level2.session.v1`.

En bruger skal samtidig kunne have én uafsluttet Niveau 1-session og én uafsluttet Niveau 2-session. Start, autosave, restore, reset og completion i ét niveau må ikke læse, ændre eller slette det andet niveaus session.

## 10. Saldi og typografi

Alle beløb højrestilles og bruger tabular numerals. Labels, kontonavne og posteringstekster venstrestilles. Bilagstal og tilhørende bilagstekst bruger samme grundskriftstørrelse; tal må kun afvige i vægt og justering.

Saldoformater:

- `Saldo ÅTD t.o.m. 31/5   759.656 D`
- `Saldo ÅTD t.o.m. 30/6   915.932 D`
- `Saldo pr. 1/6   113.988 K`
- `Saldo pr. 30/6   114.447 K`

Nul kan vises som `0`; alle ikke-nul-saldi viser D eller K.

## 11. Frosset checkpoint pr. 30/6

Checkpointet er en særskilt fase efter bilag 9 og har præcis fem delafstemninger.

### A. Bruttoløn ÅTD – timelønnede

Eleven indtaster lønkonto ÅTD, medarbejderpension ÅTD, medarbejder-ATP ÅTD og beregnet bruttoløn ÅTD.

### B. Bruttoløn ÅTD – månedslønnede

Eleven indtaster de samme fire felter for månedslønnede.

### C. Øvrige lønomkostninger ÅTD

Eleven indtaster arbejdsgiverpension ÅTD, arbejdsgiver-ATP ÅTD, feriepenge timelønnede ÅTD og regulering af feriepengeforpligtelse ÅTD.

### D. Samlede lønrelaterede omkostninger ÅTD

Eleven summerer bruttoløn for begge grupper, arbejdsgiverpension, arbejdsgiver-ATP, feriepenge timelønnede og regulering. R1-beløbet 2.506.874 afstemmes til finansens samlede driftskonti.

### E. Balanceposter pr. 30/6

For hver af Skyldig A-skat, Skyldig AM-bidrag, Skyldig pension, Skyldig ATP, Skyldige nettoferiepenge – FerieKonto og Feriepengeforpligtelse indtaster eleven forventet saldo og D eller K.

### Checkpointfeedback

Hver del kontrolleres separat:

- Korrekt: grøn status, låst, og elevens eget korrekte beløb bliver stående.
- Forkert: rød status, redigerbar og intet facitbeløb.

Efter kontrol må del E vise elevens forventede saldo, bogført saldo og difference. Facit vises ikke på forhånd. Juli-navigation er utilgængelig med forklaring, indtil A–E er korrekte.

Read-only grundlag omfatter godkendte posteringer/saldi, historiske januar–maj-data, medarbejderoplysninger, startsaldi og ÅTD-specifikation for Pensioner og ATP.

## 12. ÅTD-specifikation for fælles konti

`Vis ÅTD-specifikation` på Pensioner og ATP åbner read-only opdeling i:

- timelønnede medarbejderandel
- timelønnede arbejdsgiverandel
- månedslønnede medarbejderandel
- månedslønnede arbejdsgiverandel
- total, der stemmer med kontosaldoen

Specifikationen må ikke autofylde elevinput.

## 13. Slutkontrol

Efter bilag 13 vises seks korte forståelsesrækker for A-skat, AM-bidrag, pension, FerieKonto, ATP og feriepengeforpligtelse. Eleven matcher slutsaldo og årsag. Kontrollen skelner mellem udlignede poster, Q2-ATP på 7.128 K og den bestående feriepengeforpligtelse på 182.500 K.

Der bygges ikke en ny fuld afstemning eller bankafstemning.

## 14. Accessibility

- Inputs har label med bilag, konto og side.
- Status kommunikeres med tekst/ikon samt farve.
- Fokus er synligt og skjules ikke af sticky områder.
- Handlinger er rigtige buttons.
- Overlays har fokusstyring og Escape.
- Autosave-, kontrol-, checkpoint- og completionstatus annonceres passende.
- Godkendte værdier er read-only tekst, ikke fake disabled inputs.
- Fejl afslører ikke facitbeløb.

## 15. Frosne acceptance-kriterier

1. Niveau 1's faglige og funktionelle kontrakter forbliver uændrede; kun eksplicit godkendte præsentationsændringer udføres.
2. Niveau 1- og Niveau 2-sessioner er fuldt isolerede.
3. Alle 13 konti findes fra start.
4. Flere posteringer pr. konto og side understøttes.
5. Godkendt postering låses uden at låse kontoen.
6. Validering sker pr. konto + bilag + side og afviser nettomodregning.
7. Sticky bilag forbliver synligt ved desktopscroll.
8. 1366×768 viser mindst 3 kort pr. række og mindst 2 komplette rækker samtidig i arbejdsområdet i de fire krævede scenarier.
9. T-kort viser højst 3 historiske poster og bruger en accessible historikdrawer til resten; ingen intern kortscrollbar.
10. Kontoplan og video åbnes som overlays; ingen permanent iframe.
11. Bilagstekst og -tal har samme grundskriftstørrelse.
12. Saldi bruger korrekt ÅTD-/dato-sprog og D/K.
13. Checkpoint A–E kontrolleres separat og blokerer juli indtil alt er korrekt.
14. Slutkontrollen forklarer de seks centrale slutsaldi.
15. Ingen facitafsløring, horisontal overflow eller utilgængelig tastatursti.
16. Browseraudit dækker 900, 1280, 1366 og 1920 px; checkpoint testes separat.

Der er ingen udestående UI-beslutninger fra J0C før J1.
