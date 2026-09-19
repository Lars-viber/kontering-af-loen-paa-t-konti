# J3B – Niveau 2 workspace rapport

## Status

J3B’s document-workspace er implementeret på branch `v2`. Der er ikke committed eller pushet noget J3B-arbejde.

J3B omfatter bilagspræsentation B1–B13, sticky bilagspanel, alle 13 T-konti, elevrækker, partial locking, historik, løbende saldo, kontoplan, video og sikre fase-placeholders. Checkpoint A–E og final-control-inputs er fortsat J3C-scope.

## Filer

Produktkode:

- `src/App.tsx`
- `src/styles.css`
- `src/ui/Dialog.tsx`
- `src/level2/workspace/AccountHistoryDialog.tsx`
- `src/level2/workspace/AccountPlanDialog.tsx`
- `src/level2/workspace/DocumentPanel.tsx`
- `src/level2/workspace/Level2Workspace.tsx`
- `src/level2/workspace/PostingRow.tsx`
- `src/level2/workspace/TAccountCard.tsx`
- `src/level2/workspace/VideoDialog.tsx`
- `src/level2/workspace/documentPresentation.ts`
- `src/level2/workspace/format.ts`
- `src/level2/workspace/index.ts`
- `src/level2/workspace/workspaceSelectors.ts`

Tests:

- `tests/level2/workspace-autosave-ui.test.tsx`
- `tests/level2/workspace-presentation.test.ts`
- `tests/level2/workspace-selectors.test.ts`
- `tests/level2/workspace-ui.test.tsx`

Dokumentation:

- `docs/J3B_NIVEAU2_WORKSPACE.md`
- `docs/J3B_NIVEAU2_RAPPORT.md`

## Funktionel audit

Følgende er dækket af de nye tests og den reelle browseraudit:

- præcis 13 kontokort i frossen rækkefølge
- samme kontosæt uafhængigt af bilag/facit
- add, edit og remove med rå dansk beløbsstreng
- splitrækker og korrekt gruppelås
- partial locking med forkert gruppe fortsat redigerbar
- forkert selvvalgt konto uden udpegning af urørte facitkonti
- ingen Debet/Kredit-netting
- generel feedback ved manglende eller forkert bilag
- elevtotaler og invalid total
- startsaldolabels og D/K-format
- student-derived aktuel saldo og unavailable ved invalid input
- højst tre kompakte historikrækker og fuld historikdialog
- alle 13 konti i kontoplandialogen
- iframe 0 → 1 → 0 ved video open/close
- Escape, focus return og fælles focus trap
- central J3A-autosave for add/edit
- savefejl bevarer den nye in-memory state, og retry gemmer den
- checkpoint-placeholder uden stateændring

## Document presentation audit

R1 og generatorvariant 42 testes gennem samme typed mapping for B1–B13. Alle dokumenter har titel, periode og source-derived rækker. B9 har præcis de to tilladte rækker og viser ingen difference. Presentation-koden indeholder ingen R1-beløb og læser ikke `expectedPostings`.

## Browser- og responsive audit

Den integrerede CUA-browser kunne ikke starte og returnerede to gange:

`windows sandbox failed: CreateProcessWithLogonW failed: 1385`

Som reel browserfallback blev lokalt installeret Chrome kørt headless med isoleret TEMP-profil mod Vite-serveren. DevTools-målinger og screenshots blev taget af den renderede app.

Resultat:

| Viewport | Kolonner | Komplette synlige kortrækker | Horisontal overflow | Bilagspanel |
|---|---:|---:|---|---|
| 900×768 | 2 | 2 | Nej | sticky |
| 1280×720 | 3 | 2 | Nej | sticky |
| 1366×768 | 3 | 2 | Nej | sticky |
| 1920×1080 | 4 | 4 | Nej | sticky |

Ved 1366×768 bestod hard requirement: 3 kolonner, 2 komplette kortrækker, sticky bilagspanel og nåbar kontrolknap. Browseraudit bekræftede også:

- baseline B1 med 13 konti
- partial state med 1 korrekt og 1 forkert gruppe
- korrekt gruppe vist read-only
- generel feedback uden `Mangler postering`
- B5 med fire bankhistorikrækker, tre kompakte og `+ 1 tidligere posteringer`
- fuld historikdialog med fire elevrækker
- video iframe lazy mount
- kontoplan med 13 konti
- dialogs inden for viewport
- save warning med bevaret input
- 0 browser console errors
- 0 browser console warnings

Screenshots blev kun gemt som midlertidige audit-artifacts og er ikke tilføjet til repositoryet.

## Regression og build

- `pnpm test`: PASS, 41 filer og 307/307 tests
- Niveau 1 React/session/menu-regressioner: PASS som del af hele pakken
- J3A controller/dialog-regressioner: PASS
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- production build: 102 moduler transformeret

Frosne lag er kontrolleret med en tom diff for:

- `src/domain/level2/`
- `src/level2/state/`
- `src/level2/session/`
- `src/level2/controller/`

Låste canonical fixturehashes er uændrede og bekræftet af regressionspakken:

- J1A R1: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`
- J1B Generator v1: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`

`git diff --check` er grøn.

## Før J3C

Der er ingen fundet kontraktfejl i J0–J3A. J3C skal erstatte de tre sikre placeholders med checkpoint A–E, slutkontrol og completed-flow. J3B har ingen checkpoint- eller final-control-formfelter.
