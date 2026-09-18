# Niveau 2 – faglig specifikation

## 1. Status og autoritet

Dette dokument er den frosne faglige J0C-kontrakt for det avancerede Niveau 2 i samme app som Niveau 1. Niveau 2 er endnu ikke implementeret. J1 skal følge kontrakten; en senere ændring kræver en dokumenteret faglig beslutning eller en reel bug.

Det permanente Git-tag `v1.0.0` peger på commit `634a0eb` (`Finalize v1 release documentation`) og må aldrig flyttes. Niveau 2 udvikles på branch `v2`; J0C ændrer ikke `main`.

Niveau 1's faglige regler, generatorresultater, fixture-kontrakt, `generatorVersion`, sessionkontrakt, parser-/graderingsadfærd og brugerflow forbliver uændrede, medmindre en reel bug senere dokumenteres. Niveau 1 må i v2 få eksplicit godkendte præsentationsændringer. Følgende ændring er allerede godkendt: tal og tilhørende tekst i lønbilaget skal bruge samme grundskriftstørrelse. Tal må fortsat højrestilles, bruge tabular-nums og have anden font-weight, men de må ikke være mindre end bilagsteksten.

## 2. Case, periode og versionering

Niveau 2 er én sammenhængende case for en lille/mellemstor privat virksomhed med eget lønsystem:

- regelsæt: 2026
- hovedmåned: juni
- historik: januar–maj
- checkpoint: 30/6
- efterfølgende afregninger: juli

Eleven bogfører juni, gennemfører checkpointet pr. 30/6 og bogfører derefter udvalgte juli-afregninger.

Versionsfelterne er adskilte:

- `rulesetYear = 2026`
- `rulesetVersion = 1`
- `generatorVersion` versionsstyrer generatoradfærd og er ikke regelsættets år/version.

UI skal kunne vise fx `Juni · Regelsæt 2026 · Variant 42`. Historiske satser må ikke fremstilles som automatisk aktuelle.

## 3. Sessionisolation – hårdt J1-krav

Niveau 2 må aldrig overskrive Niveau 1's localStorage-session. Niveau 1 beholder sin eksisterende sessionkontrakt og storage key.

Niveau 2 skal have:

- egen `schemaVersion`
- egen codec og runtime-validation
- egen storage key
- egen sessionmodel

Foreløbig dokumenteret key er `kontering-af-loen-paa-t-konti.level2.session.v1`; det præcise navn kan fastlægges i J1/J2, men isolation er ikke valgfri. Én uafsluttet Niveau 1-session og én uafsluttet Niveau 2-session skal kunne eksistere samtidig.

## 4. Medarbejdergrupper og caseforudsætninger

R1 har 8 medarbejdere: 4 timelønnede og 4 månedslønnede. Medarbejderkredsen er uændret januar–juni. Alle er ATP-pligtige hele perioden og opfylder caseforudsætningen om fuld ATP-sats hver måned.

Alle 8 medarbejdere er almindeligt AM-bidragspligtige i 2026, har ingen aldersmæssig eller anden fritagelse og behandles efter R1's eksplicitte undervisningsmodel.

Casebestemt pensionsordning:

- medarbejderandel: 4 %
- arbejdsgiverandel: 8 %

Satserne er caseforudsætninger, ikke generelle danske lovsatser.

Grupperne har separate lønbilag, separate lønkonti, separate arbejdsgiverbidragsbilag og forskellig feriebehandling. A-skat, AM-bidrag, pension og ATP føres på fælles balancekonti. Nettoløn bogføres direkte på Bank. Der findes ingen konto `Skyldig løn`.

Bank er en rigtig T-konto med startsaldo 1.500.000 D. Kun lønrelaterede bankbevægelser indgår; øvelsen er ikke en bankafstemning.

## 5. Frosset beregningskontrakt for almindelig løn

Beregninger udføres pr. medarbejder og summeres først bagefter:

1. Bruttoløn. For timelønnede: `timer × timeløn`; for månedslønnede: fast månedsløn.
2. Medarbejderpension: `bruttoløn × 4 %`, afrundet til nærmeste hele krone pr. medarbejder.
3. Medarbejder-ATP: 99 kr.
4. AM-grundlag: `bruttoløn − medarbejderpension − medarbejder-ATP`.
5. AM-bidrag: `AM-grundlag × 8 %`, afrundet til nærmeste hele krone pr. medarbejder.
6. A-skattegrundlag: `AM-grundlag − AM-bidrag − månedsfradrag`.
7. A-skat: `A-skattegrundlag × trækprocent`, afrundet til nærmeste hele krone pr. medarbejder.
8. Nettoløn: `AM-grundlag − AM-bidrag − A-skat`.
9. Arbejdsgiverpension: `bruttoløn × 8 %`, afrundet til nærmeste hele krone pr. medarbejder.
10. Arbejdsgiver-ATP: 198 kr.

Pension må ikke beregnes på gruppetotalen som erstatning for medarbejdervis beregning. Afrundingen af 4 % og 8 % er en case-/generatorregel, ikke en universel dansk pensionsregel.

Skattemodellen er en pædagogisk undervisningsmodel og ikke en fuld teknisk implementering af dansk eSkattekort.

## 6. ATP

R1 bruger pr. medarbejder pr. måned:

- medarbejderandel 99
- arbejdsgiverandel 198
- samlet 297

Ved 8 medarbejdere er ATP 2.376 pr. måned. Q1 er 7.128, og Q2 er 7.128. Skyldig ATP er 11.880 K pr. 1/6, 14.256 K efter juni og 7.128 K efter betaling af Q1 i juli. Resten vedrører Q2.

Medarbejderantal og uændret medarbejderkreds januar–juni er nødvendige for at reproducere måneds-, kvartals- og saldotal. Eleven skal få forudsætningen oplyst og må ikke gætte den. ATP-dokumentationen skal vise antal, satser, måneder og kvartalssammenhæng.

ATP afregnes særskilt via Samlet Betaling og må ikke antages betalt sammen med A-skat og AM-bidrag.

## 7. Timelønnedes feriepenge

Feriepenge beregnes pr. medarbejder og summeres bagefter:

1. Bruttoferiepenge: `feriepengeberettiget løn × 12,5 %`, afrundet til hele kroner.
2. AM-bidrag: `bruttoferiepenge × 8 %`, afrundet til hele kroner.
3. Skattegrundlag: `bruttoferiepenge − AM-bidrag`.
4. A-skat: `skattegrundlag × medarbejderens trækprocent`, afrundet til hele kroner.
5. Det almindelige månedsfradrag anvendes ikke.
6. Nettoferiepenge: `bruttoferiepenge − AM-bidrag − A-skat`.

Den officielle ramme er, at FerieKonto-/feriekasseferiepenge for timelønnede beskattes ved optjeningen, udbetales som nettoferiepenge, og at hovedkortets almindelige fradrag ikke anvendes. R1's simple procentformel er fortsat en pædagogisk undervisningsmodel, ikke en fuld implementering af alle danske skattekortregler.

Eleven beregner ikke feriepengebilaget, men konterer et read-only lønsystembilag med medarbejderlinjer og totaler.

R1 juni:

- Debet 2230 Feriepenge – timelønnede: 20.400
- Kredit 6930 Skyldig AM-bidrag: 1.632
- Kredit 6920 Skyldig A-skat: 7.052
- Kredit 6923 Skyldige nettoferiepenge – FerieKonto: 11.716

## 8. Månedslønnedes feriepengeforpligtelse

R1 bruger:

- bogført feriepengeforpligtelse før regulering: 174.000 K
- eksternt/systemopgjort feriepengeforpligtelse pr. 30/6: 182.500 K
- regulering: 8.500

182.500 er en eksternt/systemopgjort størrelse. Eleven skal ikke beregne ultimoforpligtelsen. Bilaget må vise en read-only opgørelsesspecifikation fra løn-/feriesystemet med fx medarbejderlinjer, delbeløb og systemets total. J0/J1 må ikke opfinde en hjemmelavet pseudo-regnskabsregel for at derivere 182.500.

Eleven skal forstå de to oplyste saldi, beregne `182.500 − 174.000 = 8.500` og bogføre:

- Debet 2235 Regulering af feriepengeforpligtelse: 8.500
- Kredit 6924 Feriepengeforpligtelse: 8.500

## 9. Frossen kontoplan

| Konto | Navn | Type | Bemærkning |
|---:|---|---|---|
| 2210 | Lønninger – timelønnede | Drift | Godkendt |
| 2211 | Lønninger – månedslønnede | Drift | Godkendt undervisningskonto |
| 2215 | Pensioner | Drift | Godkendt |
| 2223 | ATP | Drift | Godkendt |
| 2230 | Feriepenge – timelønnede | Drift | Godkendt undervisningskonto |
| 2235 | Regulering af feriepengeforpligtelse | Drift | Godkendt undervisningskonto |
| 5820 | Bankkonto | Balance | Godkendt |
| 6920 | Skyldig A-skat | Balance | Godkendt |
| 6921 | Skyldig ATP | Balance | Godkendt |
| 6922 | Skyldig pension | Balance | Godkendt |
| 6923 | Skyldige nettoferiepenge – FerieKonto | Balance | Godkendt undervisningskonto |
| 6924 | Feriepengeforpligtelse | Balance | Godkendt undervisningskonto |
| 6930 | Skyldig AM-bidrag | Balance | Godkendt |

De nye numre er undervisningskonti og må ikke beskrives som en universel dansk standardkontoplan. Der findes ingen `Skyldig løn` og ingen separate pensions-/ATP-konti for medarbejdergrupperne.

## 10. Bilagsflow

Alle T-konti er synlige fra start. Bilag vises ét ad gangen; fremtidige bilagstitler behøver ikke afsløres.

Juni:

1. Betaling af A-skat og AM-bidrag vedr. maj.
2. Betaling af pension vedr. maj.
3. Betaling til FerieKonto vedr. maj.
4. Lønbilag – timelønnede.
5. Arbejdsgiver ATP og pension – timelønnede.
6. Feriepengebilag – timelønnede.
7. Lønbilag – månedslønnede.
8. Arbejdsgiver ATP og pension – månedslønnede.
9. Regulering af feriepengeforpligtelse – månedslønnede.

Derefter checkpoint pr. 30/6. Checkpointet er en faglig fase, ikke et bilag.

Juli:

10. Betaling af ATP vedr. Q1.
11. Betaling af A-skat og AM-bidrag vedr. juni.
12. Betaling af pension vedr. juni.
13. Betaling til FerieKonto vedr. juni.

Derefter følger en kort slutkontrol.

## 11. Posteringer og validering

Niveau 2 understøtter flere posteringer på samme T-konto. En godkendt postering låses; kontoen låses ikke. Senere bilag kan tilføje posteringer på samme konto.

Hver postering identificeres mindst ved bilag, konto, side, beløb, kort tekst, medarbejdergruppe/type hvor relevant samt godkendt/låst status.

Valideringsnøglen er `konto + bilag + side`. Forventet Debet og Kredit kontrolleres hver for sig. Debet 18.000 kan deles i 10.000 + 8.000. Debet 20.000 og Kredit 2.000 accepteres ikke som erstatning for Debet 18.000, selv om nettobevægelsen er den samme.

## 12. Saldosprog

Ordet `Saldo` bruges konsekvent, og alle ikke-nul-saldi har D eller K:

- drift: `Saldo ÅTD t.o.m. 31/5` og `Saldo ÅTD t.o.m. 30/6`
- balance: `Saldo pr. 1/6` og `Saldo pr. 30/6`

`Primosaldo` bruges ikke om driftskonti.

## 13. Frosset checkpoint pr. 30/6

Checkpointet består af fem separate delafstemninger:

A. Bruttoløn ÅTD – timelønnede.  
B. Bruttoløn ÅTD – månedslønnede.  
C. Øvrige lønomkostninger ÅTD.  
D. Samlede lønrelaterede omkostninger ÅTD.  
E. Balanceposter pr. 30/6.

Hver del kontrolleres separat. Korrekt del får grøn status og låses; elevens korrekte beløb bliver stående. Forkert del får rød status, forbliver redigerbar og afslører intet facitbeløb. Juli åbnes først, når A–E er korrekte.

A og B kræver input af lønkonto ÅTD, medarbejderpension ÅTD, medarbejder-ATP ÅTD og beregnet bruttoløn ÅTD for hver gruppe. Read-only ÅTD-specifikation for Pensioner og ATP kan bruges som grundlag.

C kræver arbejdsgiverpension ÅTD, arbejdsgiver-ATP ÅTD, feriepenge timelønnede ÅTD og regulering af feriepengeforpligtelse ÅTD.

D summerer bruttoløn for begge grupper, arbejdsgiverpension, arbejdsgiver-ATP, feriepenge timelønnede og regulering. R1-totalen 2.506.874 afstemmes til finansens samlede driftskonti.

E kræver forventet saldo og D/K for Skyldig A-skat, Skyldig AM-bidrag, Skyldig pension, Skyldig ATP, Skyldige nettoferiepenge – FerieKonto og Feriepengeforpligtelse. Efter kontrol må UI vise elevens forventede saldo, bogført saldo og difference; facit må ikke vises på forhånd.

## 14. Fælles konti og ÅTD-specifikation

Pensioner og ATP forbliver fælles driftskonti. `Vis ÅTD-specifikation` åbner read-only opdeling i medarbejder-/arbejdsgiverandel for hver gruppe og en total, der stemmer med kontosaldoen. Specifikationen er afstemningsgrundlag og autofylder ikke elevinput.

## 15. Slutkontrol

Efter juli gennemføres en kort forståelseskontrol, ikke en ny fuld afstemning. Eleven skal forstå:

- A-skat, AM-bidrag, pension og FerieKonto er 0, fordi juni-beløbene er betalt.
- ATP er 7.128 K, fordi Q1 er betalt og Q2 står tilbage.
- Feriepengeforpligtelsen er 182.500 K, fordi juli-flowet ikke afvikler den.

## 16. Officielle kilder kontrolleret 18. september 2026

- [Virk – ATP for medarbejdere](https://virk.dk/guidance/atp/atp-arbejdsgiver/atp-medarbejdere/) understøtter 99/198/297 og fuld månedssats ved mindst 117 timer.
- [Virk – ATP og Samlet Betaling](https://virk.dk/vejledning/atp/atp-arbejdsgiver/atp-info/) understøtter kvartalsopkrævning og Q1-betalingsfrist 1. juli.
- [Skattestyrelsen – AM-bidrag](https://skat.dk/borger/am-bidrag) understøtter 8 %, fradrag af eget ATP/pension før AM-bidrag og 2026-aldersreglen.
- [Skattestyrelsen – skat af ansattes løn](https://skat.dk/erhverv/ansatte-og-loen/indberet-loen-eindkomst/skat-af-ansattes-loen) understøtter A-skat efter eSkattekort og arbejdsgiverens træk af AM-bidrag.
- [Skattestyrelsens eIndkomst-vejledning – optjente feriepenge](https://info.skat.dk/data.aspx?oid=2045906) understøtter beskatning ved optjening for FerieKonto/feriekasse og at hovedkortets fradrag ikke anvendes.
- [Skattestyrelsens eIndkomst-vejledning – timelønnede](https://info.skat.dk/data.aspx?oid=2287085) understøtter nettoferiepenge efter AM-bidrag og A-skat.
- [Virk – Feriepenge](https://www.virk.dk/vejledning/feriepenge/fp-arbejdsgiver/) understøtter indberetning af nettoferiepenge til FerieKonto.

Kilderne gør ikke de casebestemte pensionssatser, generatorafrunding, undervisningskontonumre eller den simple skatteformel til universelle regler.

## 17. Beslutningsstatus

Alle J0-beslutninger er lukket i J0C. Der er ingen kendte faglige blockers før J1. R1-tallene er frosset i `NIVEAU2_REFERENCE_R1.md`, og UI-kontrakten er frosset i `NIVEAU2_UI_KRAV.md`.
