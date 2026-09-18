# J2B – Niveau 2 session, persistence og restore

## Status og afgrænsning

Dette dokument fryser persistencekontrakten for Niveau 2. Laget indeholder ingen React, UI, menu, autosave-hook, navigation, random variantvælger eller deploymentkode. Niveau 1-sessionen er urørt og kan eksistere samtidig med en Niveau 2-session.

## Schema og storage key

`LEVEL2_SESSION_SCHEMA_VERSION` er `1`.

Den eneste storage key, som Niveau 2-laget må læse, skrive eller fjerne, er:

`kontering-af-loen-paa-t-konti.level2.session.v1`

Niveau 1-key'en `kontering-af-loen-paa-t-konti.session.v1` bruges aldrig af Niveau 2-laget.

Schema 1 understøtter kun:

- `rulesetYear = 2026`
- `rulesetVersion = 1`
- `generatorVersion = 1`
- `variant` som et heltal fra 1 til 999999

Der findes ingen migration, fallback eller nedgradering. Andre schema- og versionsværdier afvises med et typed reason ID.

## Eksakt persisted shape

En persisted session har præcis disse top-level-felter:

- `schemaVersion`
- `rulesetYear`
- `rulesetVersion`
- `generatorVersion`
- `variant`
- `caseSnapshot`
- `studentState`
- `savedAt`

Ukendte eller manglende top-level-felter afvises. `savedAt` skal være en gyldig ISO-8601 UTC-timestamp med `Z`. Tiden gives eksplicit til `createLevel2PersistedSession`; sessionlaget bruger ingen intern klokke.

## Snapshotautoritet og restore

`caseSnapshot` er den fulde genererede case, som var i brug, da sessionen blev oprettet. Ved restore er dette snapshot eneste source of truth.

Decode og load:

- kalder aldrig generatoren
- regenererer aldrig varianten
- bruger ikke seed til at skabe en ny case
- sammenligner ikke med en ny generatorcase
- reparerer ikke snapshot eller student state

Sessionmodulet har ingen import af generatorfunktionen. Runtimevalideringen genbruger den rene, deterministiske casebuilder til at kontrollere de persisterede input og afledte data indbyrdes. Resultatet bruges kun som validitetskontrol; det erstatter eller ændrer aldrig det gemte snapshot.

Generator v1-snapshotformen indeholder ikke et separat kontoplanfelt. Validatoren beskytter derfor kontometadata og rækkefølge ved at validere alle saldi og posteringer mod den frosne `LEVEL2_ACCOUNTS`/`LEVEL2_ACCOUNT_NUMBERS`-kontrakt i stedet for at indføre et nyt persisted felt.

## Runtimevalidering

Codec'en validerer plain-object-shapes og eksakte felter. Casesnapshotvalideringen kontrollerer blandt andet:

- variant, seed og versioner
- medarbejdergrupper og generator v1-intervaller
- Jan–Jun-historik via den eksisterende casebuilder
- kontoplan og kontorækkefølge
- start-, checkpoint- og slutsaldi
- præcis B1–B13 i korrekt rækkefølge
- positive, hele, sikre posteringsbeløb og balancerede bilag
- nettoløn på Bank i B4 og B7
- fravær af en konto for Skyldig løn
- ATP og feriepengeforpligtelse
- feriepengeinput og bankmetadata
- checkpoint, ÅTD-specifikationer og final balances

Student state-valideringen kontrollerer:

- eksakt phase-, dokument-, checkpoint- og final-control-shape
- dokumentrækkefølge og sekventiel progression
- højst ét aktivt bilag, som skal matche fasen
- unikke positive row IDs og et monotont `nextRowId`
- kendte bilag, konti og sider på alle elevrækker
- rå beløb og tekster som strings
- lovlige, unikke gradinggrupper og issue IDs
- præcis checkpoint A–E og den frosne E-kontorækkefølge
- præcis seks final-control-items og frosne reason IDs
- automatiske overgange efter sidste korrekte dokument, checkpoint og final control
- `completed` hvis og kun hvis fasen og hele progressionen er completed

Persisted `correct` og `incorrect` dokumentgrupper og checkpointsektioner grades igen med J2A's rene gradingfunktioner uden mutation. Correct final-control-items kontrolleres mod den frosne reason-mapping. Valideringen ændrer aldrig status eller elevinput.

## Codec og immutability

`encodeLevel2Session(session)` returnerer JSON og muterer ikke inputtet. Et ugyldigt programmerinput til encode afvises i stedet for at blive skrevet.

`decodeLevel2Session(raw)` returnerer en diskrimineret success/failure-union. Tomt input, JSON-parsefejl, primitive værdier, arrays, ukendte shapes, fremtidige versioner og korrupte snapshots/states giver et kontrolleret failure-resultat og kaster ikke.

En successful decode/load deep-freezer hele grafen rekursivt:

- session
- caseSnapshot
- studentState
- alle nested objects og arrays

## Raw-input roundtrip

`rawAmount` og `text` serialiseres som de foreligger. Codec'en parser, formatterer eller normaliserer dem ikke. Punktumgrouping, almindelige spaces, NBSP, narrow NBSP og ledende/efterfølgende tekstspaces bevares byte-for-byte gennem encode/decode.

Splitposteringer bevarer hver række, row ID, rækkefølge, rå beløbsstreng og gruppestatus. En korrekt splitgruppe er fortsat `correct` og dermed låst efter restore.

## Progression og completed

Følgende faser kan roundtrippe uden tab:

- B1 aktiv
- et delvist løst bilag med correct, incorrect og unchecked grupper
- checkpoint med delvist løste sektioner
- B10–B13 efter korrekt checkpoint
- delvist løst final control
- completed

Completed kræver samtidig:

- `phase.kind = completed`
- `completed = true`
- B1–B13 completed
- checkpoint A–E correct
- alle seks final-control-items correct med korrekt reason ID

## Storageadfærd

Storageadapteren kræver kun `getItem`, `setItem` og `removeItem`, så browserens storage kan injiceres senere, mens tests bruger en fake.

- Save validerer, encoder og skriver kun Niveau 2-key'en.
- Load returnerer `none`, `loaded`, `invalid` eller `storageFailure`.
- Remove fjerner kun Niveau 2-key'en.
- Exceptions fra storage konverteres til typed failure-resultater.
- Der findes ingen retry-loop.

En invalid session overskrives eller fjernes aldrig automatisk. Laget returnerer kun fejlen; et senere controller/UI-lag kan tilbyde brugeren at fjerne data.

