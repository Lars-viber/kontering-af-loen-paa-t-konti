# V2.1 – Progression og session

## 1. Formål

Dette dokument fastlægger den autoritative progression, persistence og restore-adfærd for Niveau 2 i V2.1. Det beskriver kontrakten, som senere jobs skal implementere; J0 ændrer ingen produktkode.

**Pre-release-korrektion efter manuel browsertest:** Checkpoint C bruger den nye 12-felts raw state, og completed-review er lokal presentation state uden ny sessionfase.

## 2. Versionskontrakt

| Felt | Værdi |
|---|---:|
| `rulesetYear` | 2026 |
| `rulesetVersion` | 2 |
| `generatorVersion` | 2 |
| `sessionSchemaVersion` | 2 |
| localStorage key | `kontering-af-loen-paa-t-konti.level2.session.v2` |

Versionsfelterne skal gemmes eksplicit i V2.1-sessionen. Restore må kun acceptere en session, som opfylder hele V2.1-kontrakten.

## 3. Faser

V2.1 har følgende logiske faser:

| Fase | Betydning |
|---|---|
| `documentEntry` | Eleven arbejder med det aktive bilag |
| `documentReview` | Det aktive bilag er korrekt og gennemgås før manuel fremdrift |
| `reconciliation` | Eleven løser checkpoint A-E |
| `reconciliationReview` | A-E er korrekt og gennemgås før afslutning |
| `completed` | Niveau 2 er eksplicit afsluttet |

Navnene er normative begreber for kontrakten. En senere implementering kan kun vælge andre tekniske symboler, hvis semantik, persistence og tests er entydigt de samme.

## 4. Bilagsprogression

Bilagsrækken består præcis af B1-B9.

### 4.1 Aktivt bilag

I `documentEntry` har sessionen ét aktivt bilag. Eleven kan redigere konteringen og kontrollere den. En forkert kontrol bevarer både bilaget og elevens input.

### 4.2 Korrekt kontrol

Når det aktive bilag er korrekt:

1. bilaget registreres som korrekt,
2. fasen ændres til `documentReview`,
3. elevens korrekte posteringer bliver readonly,
4. alle 13 T-konti bliver stående synlige,
5. status **✓ Bilaget er korrekt bogført** vises,
6. **Gå videre til næste bilag** eller efter B9 **Gå videre til afstemning** bliver den eneste handling, der ændrer aktiv fase.

Kontrolhandlingen må ikke selv aktivere næste bilag.

### 4.3 Manuel fremdrift

Ved klik på den viste gå-videre-knap:

- fra review af B1-B8 åbnes næste bilag i `documentEntry`,
- fra review af B9 åbnes `reconciliation`.

Handlingen skal være idempotent på den konkrete reviewtilstand. Gentagne events må ikke springe et bilag over.

## 5. Progressionsvisning

Progression for bilagsdelen vises mod ni bilag. Den følger disse normative eksempler:

- B3 under arbejde: **2 af 9 bilag gennemført · 7 tilbage**; B1-B2 er korrekte, B3 er aktivt, B4-B9 og afstemning er kommende.
- B3 i review: **3 af 9 bilag gennemført · 6 tilbage**; B1-B3 er korrekte, men B4 åbnes først ved elevens klik.
- B9 i review: **9 af 9 bilag gennemført**; afstemning er kommende.
- Checkpoint: **9 af 9 bilag gennemført**; B1-B9 er korrekte, og afstemning er aktiv.
- Completed: **9 af 9 bilag gennemført**; B1-B9 og afstemning er markeret korrekte.

Visningen skal skelne mellem et korrekt bilag i review og den manuelle handling, der flytter eleven videre. Den må ikke antyde, at hele Niveau 2 er afsluttet, når kun bilagsdelen er færdig.

## 6. Afstemningsprogression

I `reconciliation` arbejder eleven med del A-E. Elevens svar og kontrolstatus for hver krævet del gemmes.

Ved fejl forbliver fasen `reconciliation`. Ved korrekt A-E ændres fasen til `reconciliationReview`. Kontrol må ikke ændre fasen direkte til `completed`.

I `reconciliationReview` vises den samlede korrekte afstemning med 0-differencer. Eleven afslutter med den eksplicitte handling **Afslut Niveau 2**.

Først denne handling sætter fasen til `completed` og registrerer completion.

## 7. Sessionens konceptuelle indhold

En V2.1-session skal mindst kunne genskabe:

- versionsfelter og sessionidentitet,
- seed og variantidentitet,
- de genererede V2.1-kildedata eller en entydig reference til dem,
- aktiv fase,
- aktivt bilag,
- elevens kontering for B1-B9,
- kontrol- og reviewstatus for hvert bilag,
- elevens svar i checkpoint A-E,
- checkpointets kontrol- og reviewstatus,
- completed-status,
- nødvendige tidsstempler og integritetsoplysninger efter projektets eksisterende principper.

Facit må ikke gemmes som en elevredigerbar sandhedskilde. Restore skal regenerere eller validere opgaven deterministisk fra version og seed.

## 8. Autosave

Autosave skal ske efter enhver relevant, gyldig stateændring, herunder:

- ændring i et konteringsfelt,
- kontrolforsøg og feedbackstatus,
- overgang til `documentReview`,
- klik på **Gå videre**,
- ændring i et afstemningsfelt,
- overgang til `reconciliationReview`,
- eksplicit afslutning.

Autosave må ikke simulere brugerhandlinger. Det betyder især, at en gemt reviewtilstand ikke ved næste autosave eller reload må flytte eleven frem.

## 9. Restore

Restore skal føre eleven tilbage til samme faglige sted:

| Gemt tilstand | Krævet restore |
|---|---|
| Bilagsindtastning | Samme bilag, samme elevinput og samme feedback |
| Bilagsreview | Samme korrekte bilag, status og relevante gå-videre-knap |
| Afstemning | Samme A-E-input og kontrolstatus |
| Checkpoint-review | Samme korrekte afstemning og synlig **Afslut Niveau 2** |
| Completed | Completed-visningen |

Restore må ikke:

- springe fra review til næste fase,
- miste elevens delvise afstemning,
- genåbne afsluttede bilag som ubesvarede,
- markere en uafsluttet session som completed.

## 10. Adskillelse fra ældre sessioner

V2.1 bruger en ny key og en ny schema-version. Den eksisterende v1-key må ikke læses som en V2.1-session.

Der må ikke ske silent migration fra tidligere Niveau 2-sessioner. En gammel session må heller ikke slettes automatisk. Den kan ignoreres af V2.1 og forbliver dermed tilgængelig for den produktversion, der ejer den.

Hvis UI senere finder `kontering-af-loen-paa-t-konti.level2.session.v1`, men ingen V2.1-session, skal det kunne fortælle:

> Du har en gemt Niveau 2-opgave fra en tidligere version. Niveau 2 er siden ændret til den nye juni-afstemningsmodel.

Den gamle session må kun fjernes efter en eksplicit brugerhandling. Der må ikke ske skjult datatab.

Hvis en gemt V2.1-session er ugyldig, skal den afvises sikkert efter projektets eksisterende restore-principper. Systemet må ikke gætte manglende review- eller afstemningsstatus.

## 11. Determinisme

`generatorVersion = 2` identificerer den nye V2.1-opgavemodel. Samme seed sammen med samme regelsæt og generatorversion skal give:

- samme medarbejder- og løngrundlag,
- samme bilag B1-B9,
- samme synlige tælleværker,
- samme startsaldi og ultimosaldi,
- samme checkpoint A-E,
- samme facit.

En session med ukendt eller uforenelig version må ikke restores som en anden opgave.

Generatorversion 2 må have en ny deterministisk seed-kontrakt. Det er ikke et krav, at variant 42 i V2.1 har samme tilfældige medarbejderdata som variant 42 i V2.0.x. R1 forbliver den håndfrosne, sammenlignelige referencecase. Fixture og hash fastlægges først i implementationsfasen.

## 12. Completed og ny opgave

Completed-status er terminal for den konkrete session. En ny opgave kræver en eksplicit brugerhandling og en ny sessionsidentitet efter de eksisterende produktprincipper.

Completed registreres kun efter elevens klik på **Afslut Niveau 2**. Korrekt checkpoint og checkpoint-review er nødvendige, men ikke tilstrækkelige alene.

Completed-visningen skal kort vise **Niveau 2 gennemført** og budskabet: **Du har bogført juni og afstemt bogføringen pr. 30/6 mod lønsystemets tælleværker.** Den viser en readonly slutoversigt pr. 30/6 og handlingen **Se afsluttet opgave**. Gennemgangen viser elevens faktiske B1-B9 og Afstemning fra source og student state, bevarer split rows og har kun lokal navigation samt **Tilbage til afslutning**. Den kan ikke add/edit/remove/check/advance/complete, persistéres ikke og refresh vender tilbage til completed summary. Den indeholder ingen separat slutkontrol, ingen reason choices og ingen juli-saldi.

## 13. Historiske koncepter

**SUPERSEDED IN V2.1:** Progression over B10-B13 er fjernet fra den aktive state machine. V2.1 har ni bilag.

**SUPERSEDED IN V2.1:** Fasen `finalControl` indgår ikke i V2.1. `reconciliationReview` efterfølges af den eksplicitte afslutningshandling.

**SUPERSEDED IN V2.1:** Automatisk overgang efter korrekt bilagskontrol er erstattet af `documentReview` og **Gå videre**.

**SUPERSEDED IN V2.1:** Tidligere sessionschema og storage key kan ikke genbruges eller migreres lydløst.

## 14. Afgrænsning for senere jobs

Senere implementering skal etablere typer, reducer/controller, persistence, restore, UI og tests ud fra denne kontrakt. Den skal bevare frigivne tags og undgå ændringer i V2.0.1-sessioners historiske betydning.
