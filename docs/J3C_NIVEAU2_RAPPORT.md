# J3C – Niveau 2 checkpoint og slutkontrol, rapport

## Status

J3C er implementeret på branch `v2` oven på `ee8ad48 Implement Niveau 2 document workspace`. Der er ikke committed eller pushet noget J3C-arbejde.

Checkpoint-, final-control- og completed-placeholderne er erstattet. Der er ikke fundet en kontraktfejl eller blocker før gennemgang og senere final polish.

## Filer

Produktkode:

- `src/level2/workspace/CheckpointBalanceSection.tsx`
- `src/level2/workspace/CheckpointSection.tsx`
- `src/level2/workspace/CheckpointWorkspace.tsx`
- `src/level2/workspace/FinalControlWorkspace.tsx`
- `src/level2/workspace/Level2CompletedView.tsx`
- `src/level2/workspace/Level2Workspace.tsx`
- `src/level2/workspace/WorkspaceSaveStatus.tsx`
- `src/level2/workspace/YtdSpecificationDialog.tsx`
- `src/level2/workspace/checkpointPresentation.ts`
- `src/level2/workspace/finalPresentation.ts`
- `src/level2/workspace/index.ts`
- `src/styles.css`

Tests:

- `tests/level2/checkpoint-ui.test.tsx`
- `tests/level2/final-control-ui.test.tsx`
- `tests/level2/phase-controller-ui.test.tsx`
- `tests/level2/phase-presentation.test.ts`
- `tests/level2/workspace-ui.test.tsx`

Dokumentation:

- `docs/J3C_NIVEAU2_CHECKPOINT_FINAL.md`
- `docs/J3C_NIVEAU2_RAPPORT.md`

## Checkpoint-audit

Automatiske UI-tests og en faktisk Chrome-render bekræfter:

- A–E vises med de krævede labels og præcis 19 blanke beløbsinputs
- sektion E har seks poster i frossen rækkefølge og 12 keyboardtilgængelige D/K-radioknapper
- progression starter som `0 af 5 korrekte`
- forkert sektion viser neutral feedback og forbliver redigerbar
- edit efter forkert kontrol sætter status tilbage til unchecked via J2A
- korrekt sektion viser `✓ Korrekt`, har ingen aktive inputs og viser elevens værdier readonly
- sektion E kræver både korrekt beløb og korrekt D/K
- sektioner kan løses i forskellig rækkefølge
- alle A–E korrekte åbner B10 direkte uden et ekstra fortsættrin
- blank checkpoint-DOM indeholder ingen af de forventede facitbeløb

Browserflowet blev kørt med generatorvariant 42. Den faktiske overgang endte i `phase = document`, `activeDocumentId = B10`, og B10-panelet viste `Betaling via Samlet Betaling – ATP`.

## ÅTD-specifikation

Dialogen viste fire delposter og total for både Pensioner og ATP fra variantens caseSnapshot. Den havde `aria-modal="true"`, ingen inputfelter, var fuldt inden for viewport og ændrede ingen faglig state. Escape lukkede dialogen, og fokus vendte tilbage til `Vis ÅTD-specifikation`.

Presentation-tests dækker samme typed mapping mod både R1 og generatorvariant 42.

## Slutkontrol og completed

Den faktiske browserrender efter B13 viste præcis seks items og seks reason-selects. Saldene var `0`, `0`, `0`, `0`, `7.128 K` og `199.500 K`. Ingen option havde correct-metadata eller korrektmarkering i DOM.

Et forkert valg gav `Vælg en anden forklaring.` og forblev redigerbart. Edit nulstillede status gennem J2A. Et korrekt valg blev låst med `✓ Korrekt`. Efter seks korrekte items skiftede J2A til completed.

Completed view viste variant 42 og seks readonly saldi. Renderen indeholdt ingen input-, select- eller textarea-elementer. Reload beholdt `phase = completed`, variant 42 og completed view.

## Autosave og reload

Controller-/storage-UI-tests roundtripper gennem den faktiske J3A/J2B-vej for:

- partial checkpoint
- B10 efter gennemført checkpoint
- partial final control
- completed

De bekræfter samme phase, rå elevinput, locked statuses og caseSnapshot efter forsiden/resume samt 0 generatorcalls. Savefailure-tests bekræfter, at checkpointedit og final reason bevares i memory, at den globale warning vises, og at retry persisterer den aktuelle state uden rollback.

## Visuel browseraudit

Den integrerede browser kunne igen ikke starte på Windows-værten og returnerede `CreateProcessWithLogonW failed: 1385`. Som tilladt fallback blev lokalt installeret Chrome kørt headless med isoleret TEMP-profil mod Vite-serveren. Hele flowet B1–B13, checkpoint, ÅTD-dialog, slutkontrol, completed og reload blev udført gennem de renderede UI-kontroller.

Checkpoint og slutkontrol blev målt ved 900×768, 1280×720, 1366×768 og 1920×1080. Alle otte målinger havde ingen vandret page-overflow. Inputs, radioknapper, selects og kontrolknapper var nåbare via normal vertikal scroll, og dialogen lå inden for viewport.

J3B-regression ved 1366×768:

- bilagspanel: `position: sticky`
- T-kontogrid: 3 kolonner
- de første 6 kort: 2 komplette rækker, nederste kant 562 px i en 768 px høj viewport
- horisontal overflow: nej

Browserkonsol/netværk under hele flowet:

- console errors: 0
- console warnings: 0
- uncaught exceptions: 0
- HTTP-fejl: 0

Screenshots af de ti krævede auditstates blev gemt som midlertidige TEMP-artifacts og er ikke tilføjet til repositoryet.

## Tests og build

Den afsluttende J3C-kontrol omfatter hele testpakken, Niveau 1-regressioner, typecheck, production build og `git diff --check`. Resultaterne opdateres kun med de faktisk kørte slutkommandoer:

- `pnpm test`: PASS, 45 filer og 329/329 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 111 moduler transformeret
- `git diff --check`: PASS

## Source audit og frosne kontrakter

Nye J3C-kildefiler måles til nul forekomster af:

- `generateLevel2Case`
- `Math.random`
- `localStorage`
- `expectedPostings`

Diffen for følgende frosne lag er tom:

- `src/domain/level2/`
- `src/level2/state/`
- `src/level2/session/`
- `src/level2/controller/`

`v1.0.0` peger fortsat på `634a0eb94f789b950879443b1fc6817aa501b479`.

Låste canonical fixturehashes er uændrede og verificeres af regressionspakken:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

Niveau 1's tidligere godkendte typografifix er ikke implementeret i J3C. Der er ingen deployment, main-merge, commit eller push.

