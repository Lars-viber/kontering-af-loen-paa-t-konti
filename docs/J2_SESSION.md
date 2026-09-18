# J2 – Sessionsarkitektur

## Versioner og storage

`SCHEMA_VERSION = 1` beskriver det persistente sessionsformat. `generatorVersion = 1` kommer fra det autoritative J1-snapshot og beskriver generatorens output; de to versioner har hver sit ansvar.

Sessionen gemmes som ren JSON under én central key:

`kontering-af-loen-paa-t-konti.session.v1`

Storage-adgangen ligger i `src/session/storage.ts`. `loadSession`, `saveSession` og `clearSession` arbejder mod det lille `StorageLike`-interface, så browserlager og isoleret testlager bruger samme kode. Read-, write-, quota- og clear-fejl fanges og returneres som typed resultater i stedet for at crashe appen.

## Sessionens form

```ts
interface PayrollSession {
  schemaVersion: 1;
  generatorVersion: 1;
  variant: number;
  exerciseSnapshot: ExerciseSnapshot;
  studentState: StudentState;
  completed: boolean;
  savedAt: string;
}
```

`studentState` har præcis de otte kendte konti og siderne `debit` og `credit`, altså 16 felter. Hvert felt gemmer:

```ts
interface StudentFieldState {
  rawInput: string;
  status: 'unchecked' | 'incorrect' | 'correct';
  locked: boolean;
}
```

En ny session starter med tom `rawInput`, `unchecked`, `locked: false` og `completed: false`. Elevens tekst gemmes uændret, så eksempelvis `145.812` overlever JSON-roundtrip uden normalisering.

## Snapshot og restore

`createSessionFromVariant` kalder `generateExercise(variant)` præcis én gang, gemmer resultatet som `exerciseSnapshot` og opretter den blanke elevstate. Snapshotet er derefter den autoritative opgave.

Restore parser og validerer det gemte snapshot direkte. Den kalder aldrig generatoren for at rekonstruere eller reparere en session. J1-funktionen `validateSnapshot` kontrollerer det gemte snapshots faglige hard invariants, herunder variant, generatorversion, medarbejderberegninger, totaler, konti, facit og balance. Sessionens variant og generatorversion skal matche snapshotet. Efter godkendt decode deep-freezes hele sessionen igen.

## Defensiv codec

`decodeSession` accepterer kun den eksakte top-level shape og den eksakte konto-/side-/field-shape. Den kontrollerer runtime-typer, enumværdier, ISO-timestamp og følgende invarianter:

- `correct` svarer til `locked: true`.
- `unchecked` og `incorrect` svarer til `locked: false`.
- `completed: true` kræver, at alle 16 felter er `correct` og låste.
- En ikke-komplet session må ikke indeholde 16 færdige felter.
- Session og snapshot har samme variant og generatorversion.

Korrupt JSON, ukendt schema, ugyldig session og beskadiget snapshot returnerer forståelige fejl. Hovedmenuen forbliver brugbar og tilbyder at fjerne den ugyldige storageværdi. Der oprettes aldrig en opdigtet erstatningssession.

## Mutation og autosave

`updateStudentField` laver immutable copy-on-write af session, konto og felt, opdaterer `savedAt` gennem en injicerbar clock og deep-freezer resultatet. Et låst felt returnerer samme session. Når et ulåst felt redigeres, sættes status til `unchecked`, så en tidligere fejlmarkering kan forsvinde ved rettelse.

`updateAndSaveStudentField` er J3's centrale transaction-helper: opdatér immutable, opdatér timestamp, gem gennem storage-laget og returnér både den nye session og write-resultatet. J2 har ingen elevinputflade, så React-state-koblingen udføres først, når J3-felterne bygges.

## Variantvalg og menuflow

`pickRandomVariant` ligger uden for generatoren. Browserkilden bruger `crypto.getRandomValues`, mapper til intervallet 1–999999 og bruger en afgrænset deterministisk nabo som fallback, hvis den aktive variant trækkes igen.

Hovedmenuen viser `Generér ny opgave` og `Bestemt variant`. Bestemt variant genbruger J1's validering og viser inline-fejl uden clamp eller afrunding. En gyldig ufærdig session giver et kort med `Fortsæt opgaven`. Continue, reload og `Til hovedmenu` bruger den eksisterende session uden generatorcall.

Hvis en ny opgave ønskes, mens en ufærdig session findes, vises en tilgængelig custom dialog. `Annuller` ændrer hverken session, variant, storage eller generator. Bekræftelse genererer ét nyt snapshot, opretter blank elevstate, gemmer straks og åbner øvelsesshellen. Completed-menuvisningen hører til J4; datamodellen og codec understøtter allerede en konsistent `completed: true` session.
