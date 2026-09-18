# J3A – Niveau 2 controller, niveauvalg og autosave

## Status og afgrænsning

J3A integrerer de frosne Niveau 2-lag i appens controller- og livscykluslag. Niveau 1 bruger fortsat sin eksisterende domænemotor, sessionkontrakt, storage key, grading og views. J3A indeholder en minimal Niveau 2-shell, men ingen T-konti, bilagsworkspace, checkpointformularer, final-control-formularer, kontoplanmodal eller videomodal til Niveau 2.

## App modes

Appen har tre lokale single-page modes uden router:

- `home`
- `level1`
- `level2`

Forsiden viser to tydelige niveauvalg. Niveau 1 åbner den eksisterende menu og de eksisterende exercise/completed-views. Niveau 2 viser sessionafhængige handlinger. Navigation til forsiden ændrer eller fjerner ingen session.

## Session inspection

Ved App-initialisering kalder Niveau 2-controlleren J2B's `loadLevel2Session`. Controllerens lifecycle er en diskrimineret union:

- `none`
- `valid`
- `invalid`
- `storageError`

En valid session beholder det restorede `caseSnapshot` og `studentState`. Forsiden kan vise variant og aktuel fase, men viser ingen seed, schema-, ruleset- eller generatorversion og ingen facitdata.

En invalid session overskrives eller fjernes aldrig automatisk. UI viser en rolig fejl og tilbyder `Fjern ugyldig gemt opgave`. Fejlet remove bevarer invalid-status og viser en storageadvarsel.

Ved `storageError` blokeres oprettelse og resume. Appen starter ikke en skjult ephemeral opgave.

## Browser storage

`src/level2/controller/browserStorage.ts` er det eneste nye Niveau 2-modul med direkte kendskab til `window.localStorage`. Controller, codec, runtimevalidator og tests bruger kun J2B's lille `Level2Storage`-interface.

Niveau 2 bruger fortsat udelukkende:

`kontering-af-loen-paa-t-konti.level2.session.v1`

Niveau 1 bruger fortsat sin eksisterende key:

`kontering-af-loen-paa-t-konti.session.v1`

De to sessioner kan være aktive samtidig. Ingen Niveau 2-handling læser, skriver eller fjerner Niveau 1-key'en.

## Ny opgave og resume

Ny Niveau 2-opgave følger præcis denne pipeline:

1. valideret eller sikkert tilfældigt variantnummer
2. `generateLevel2Case(variant)`
3. `createInitialStudentState(caseSnapshot)`
4. `createLevel2PersistedSession(caseSnapshot, studentState, savedAt)`
5. save via J2B
6. åbn minimal Niveau 2-shell

Generatorimporten findes kun i `src/level2/controller/newSession.ts`. Load, inspect, resume, reset, autosave, retry og navigation har ingen generatorimport eller generatorparameter.

Resume returnerer den allerede loadede J2B-session. Det restorede snapshot, elevstate og variant bruges direkte, og generatorcall count er 0.

## Variantinput og secure random

`parseLevel2VariantInput` accepterer kun decimalcifre, der udgør et heltal fra 1 til 999999. Blank, 0, 1000000, decimaler, fortegn og tekst afvises uden clamp eller exception i UI.

`randomLevel2Variant(source)` modtager en testbar uint32-kilde. Den bruger rejection sampling:

- intervalstørrelse: 999999
- uint32-rum: 2^32
- acceptance limit: `floor(2^32 / 999999) * 999999`
- værdier ved eller over grænsen kasseres
- resultat: `(value % 999999) + 1`

Browserkilden bruger `crypto.getRandomValues`. Nye Niveau 2-filer bruger aldrig `Math.random`.

## Replacement confirmation

Hvis en valid Niveau 2-session findes, åbner `Ny Niveau 2-opgave` setup uden at ændre storage. Når brugeren har valgt en ny specifik eller tilfældig variant, kræves en confirmation, før den eksisterende session erstattes.

`Annuller` ændrer ingen controllerstate, kalder ikke generatoren og skriver ikke storage. `Start ny opgave` udfører den eneste tilladte new-case pipeline.

## Central autosave

`applyLevel2StudentState` er den centrale vej for alle kommende J3B-transitions:

1. modtag `nextStudentState`
2. behold in-memory state, variant og samme `caseSnapshot`-reference
3. opdatér `savedAt` med den injicerede clock
4. valider den nye persisted session mod J2B
5. forsøg én save

Ved succes bliver `saveStatus = saved`.

Ved savefejl bliver den nye elevstate i memory, og `saveStatus = error`. Der foretages ingen rollback, regeneration eller retry-loop. `retryLevel2Save` gemmer præcis den aktuelle in-memory session og ændrer ikke `savedAt` eller snapshot.

Hvis en J2A-transition returnerer samme student-state-reference, returnerer controlleren samme controllerstate uden clockcall og uden save.

## Reset

Reset kræver confirmation. `resetLevel2Session` bruger:

`resetStudentState(current.caseSnapshot)`

Reset bevarer den samme variant og den samme `caseSnapshot`-reference, opdaterer `savedAt` og autosaver den blanke elevstate. Generatorcall count er 0.

Ny opgave og reset er derfor adskilt:

- reset: samme snapshot og variant, blank state
- ny opgave: valgt variant, nyt genereret snapshot, blank state

## Minimal Niveau 2-shell

Shellen viser kun:

- Niveau 2
- variant
- aktuel fase som bilag, checkpoint, slutkontrol eller færdig
- save-status eller savefejl med retry
- `Til forsiden`
- `Nulstil opgave`
- note om at arbejdsfladen kommer i næste fase

Shellen viser ingen forventede posteringer, fixturehashes, seed, versioner, snapshot-JSON eller answer key.

## Accessibility

Nye handlinger er rigtige buttons, variantfeltet har label og fejlrelation, dialogs bruger `role=dialog`, `aria-modal` og label. Escape lukker uden handling. Den fælles Dialog returnerer fokus til elementet, der åbnede dialogen, når dette stadig findes. Eksisterende focus-visible styling genbruges.