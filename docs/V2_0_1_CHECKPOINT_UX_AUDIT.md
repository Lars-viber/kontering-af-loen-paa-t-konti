# V2.0.1 – checkpoint UX-audit

## Status og afgrænsning

Patchen er implementeret på `hotfix/v2.0.1-checkpoint-ux` fra den frigivne `v2.0.0`-commit `5b6c95e9af04a38add609bd9d19fb0d9bb43a387`. Den er ikke committed, pushed, merged, tagget eller deployet.

Brugerfundet var, at checkpointformularen ikke kunne bruges samtidig med de nødvendige T-konti og ÅTD-oplysninger. Den hidtidige ÅTD-dialog dækkede formularen. Bilagsflowet manglede samtidig et kompakt overblik over gennemførte, aktive og kommende faser.

Patchen ændrer kun præsentationskomponenter, CSS, tests og dette dokument. Domæne, generator, fixtures, state, grading, progressionstransitions, session, controller, storage key og autosave er uændrede.

## Checkpointets reference-model

Desktop fra 1100 px bruger et split workspace:

- checkpoint A–E står til venstre og er fortsat fuldt interaktivt
- et åbent referencepanel står til højre med `position: sticky`
- panelet har viewportbegrænset højde og egen vertikal scroll
- panelet kan skjules og vises med lokal React presentation state
- der bruges ingen backdrop, `aria-modal` eller focus trap

Ved 900–1099 px og under 900 px står referencepanelet inline efter formularen. Det kan fortsat skjules og vises, og indstillingen persisteres ikke.

ÅTD-specifikationen er trukket ud i en fælles readonly-komponent. Den viser Pensioner og ATP med fire andele og totaler. Den eksisterende dialogwrapper er bevaret til mulig anden brug, men checkpointflowet kræver ikke længere dialogen.

## Readonly T-konti pr. 30/6

Referencepanelet viser alle 13 konti i den frosne kontoorden. Hvert minikort viser startsaldo, Debet/Kredit, elevens seneste godkendte rækker og `Saldo pr. 30/6`. Ved længere historik åbner `+ N tidligere` den eksisterende readonly historikdialog.

Datakilderne er alene:

- `selectApprovedHistory` for elevens korrekte, godkendte rækker
- `selectOpeningBalance` for startsaldo
- `selectCurrentAccountBalance` for saldo afledt af startsaldo og elevrækker

UI-koden bruger ikke `expectedPostings` eller `answerKey`. En DOM-test bygger B1 med en rigtig splitpostering og fører state gennem B1–B9. Begge elevrækker genfindes uændret i historikken. Saldi testes for en driftskonto, Bank og Skyldig A-skat.

Blank checkpoint-DOM er auditeret for facit i inputattributter. ÅTD-beløb er den udtrykkeligt tilladte readonly reference. Der er ingen autofill, kommende juli-posteringer eller checkpointfacit i referencekortene.

## Progressionsmodel

`presentLevel2Progress` afleder hele visningen fra eksisterende `studentState.phase` og dokumentstatusser. Komponenten har ingen egen domæne- eller persistence-state.

Den fælles semantiske liste vises i document workspace, checkpoint, final control og completed. Den dækker:

- B1, B3 og B9 som aktive dokumenteksempler
- checkpoint mellem B1–B9 og B10–B13
- B10, B11 og B13 efter checkpoint
- aktiv slutkontrol
- completed uden aktivt trin

Listen viser gennemførte ranges med `✓ gennemført`, aktivt trin med `aktiv` og kommende ranges med `kommende`. Aktivt trin bruger `aria-current="step"`. Bilagstælleren tæller kun B1–B13.

## Responsive browseraudit

Auditten blev udført i isoleret headless Chrome mod den lokale production-lignende Vite-rendering med variant 42. B1–B9 blev gennemført gennem den normale UI, så checkpointet blev nået med en reel session.

| Viewport | Resultat |
|---|---|
| 900×768 | Inline reference, 13 konti, input synligt, ingen vandret overflow |
| 1280×720 | Split, sticky og scrollbar reference, ingen vandret overflow |
| 1366×768 | Split, sticky og scrollbar reference, input og reference samtidige |
| 1920×1080 | Split, sticky reference, ingen vandret overflow |
| 375×667 | Én kolonne, inline reference, input synligt, ingen vandret overflow |
| 768×1024 | Én kolonne, inline reference, input synligt, ingen vandret overflow |

Ved 1366×768 blev der tastet i et checkpointfelt, mens referencepanelet stod åbent. Værdien blev bevaret, referencepanelet forblev mounted, og ingen modal blev oprettet.

Document workspace-regressionen ved 1366×768 viste fortsat sticky bilag, tre T-kontokolonner, de første seks kort fuldt synlige og ingen horisontal page overflow. Progressionslisten var synlig i bilagspanelet.

Browserauditten gav:

- console errors: 0
- console warnings: 0
- uncaught exceptions: 0
- HTTP-fejl: 0

## Verifikation

- `pnpm test`: PASS, 46 testfiler og 340/340 tests
- generatorstress: PASS, 4.000/4.000
- `pnpm typecheck`: PASS
- `pnpm build`: PASS, 114 moduler transformeret
- `git diff --check`: PASS
- Niveau 1-regression: PASS gennem den fulde suite
- controller/session restore og autosave-regression: PASS

Fixturehashes er uændrede og verificeret af regressionspakken:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

## Ændrede filer og blockers

Ændringerne omfatter nye presentation/components for progression, inline ÅTD og checkpointreference, integration i de fire Niveau 2-faser, responsive CSS, målrettede tests og dette auditdokument.

Der er ingen kendte release-blockers før en eventuel godkendelse af v2.0.1. Patchen afventer gennemgang og har ingen Git- eller deploymenthandlinger.
