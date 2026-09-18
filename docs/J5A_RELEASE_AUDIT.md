# J5A – Release-audit

Auditdato: 17. september 2026

## Resultat

**PASS.** Releasekandidaten er klar til J5B. Der er ikke fundet produktfejl eller release-blockers. J5A har ikke ændret faglig kode, generator, sessionmodel, kontrolflow eller UI-adfærd.

| Område | Status | Evidens |
|---|---|---|
| Test | PASS | 13 testfiler, 133 tests, 0 failures |
| TypeScript | PASS | 0 fejl |
| Production build | PASS | 51 moduler; HTML 0,48/0,32 kB gzip; CSS 11,19/2,97; JS 215,97/67,47 |
| Generatorstress | PASS | 4.000/4.000; 0 generator-, invariant-, balance-, negativ skat- og negativ nettolønsfejl |
| Fixture | PASS | Fem varianter deep-equal; SHA-256 `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25` |
| Domain/session freeze | PASS | 12 domainfiler og 11 sessionfiler byteidentiske med J4-baseline |
| J3/J4 browserregression | PASS | Alle flows; 0 console errors/warnings; intet vandret overflow |
| J5A releasebrowseraudit | PASS | Production preview, variant 42, persistence, completion, fire viewports |
| Static assets | PASS | HTML, JS, CSS og favicon svarer 200 med korrekte content types |
| Privacy/security | PASS | Ingen secrets, lokale personstier, eval, Function constructor eller dangerous HTML i releasekandidater |
| Dokumentation | PASS | README og J5A-dokumenter er aktuelle; historiske fasedokumenter er bevaret |

## Frosne kontrakter

- `generatorVersion = 1`.
- `schemaVersion = 1`.
- J1 payroll-domain, fixture og J2-sessionfiler er byteuændrede.
- Generator-fixturen indeholder varianterne 1, 2, 3, 42 og 999999 og matcher generatoroutput med deep equality.
- Variant 42 har 8 medarbejdere og totalerne 433.375 / 792 / 26.675 / 405.908 / 32.472 / 127.943 / 245.493. Debet og Kredit er begge 433.375.
- J0-eksemplet består fortsat med Bruttoløn 105.475, ATP 297, Pension 6.275, AM-grundlag 98.903, AM-bidrag 7.912, A-skat 29.680 og Nettoløn 61.311.

## Generatorfordeling

Stresskørslen genererede 25.815 medarbejdere. Alle medarbejderantal 3–10, pensionssatser 4/5/6/8/10, skattesatser 36–42 og fradrag 4.000–6.000 i 250-trin forekommer. Genereret bruttoløn spænder fra 28.000 til 72.475. Ingen tuning er udført.

## Browser- og produktionsaudit

J3- og J4-audits blev genkørt mod dev-server. J5A-flowet blev kørt separat mod det byggede `dist` via Vite preview. Det dækkede hovedmenu, bestemt variant 42, lønbilag, kontoplan, video, input, ugyldigt input, feltvis kontrol, menu/restore, reload, replacement, completion, completed menu og read-only overview. 900×700, 1280×720, 1366×768 og 1920×1080 havde intet vandret overflow. Tastaturåbning af variantdialog, Escape, videotoggle, kontrollér og completed card bestod. Console havde 0 errors og 0 warnings.

Automatiske UI-tests dækker desuden alle specificerede gyldige/ugyldige variantværdier, korrupt JSON, future schema, corrupt snapshot, variant- og generatorVersion-mismatch, blank-zero, locked mutation, repeated check, balanced-but-wrong, reset og nul generatorcalls ved restore. Production preview svarede 200 for `/`, JavaScript, CSS og `/favicon.svg`.

## Answer-leak, helpers og sikkerhed

`answerKey` findes som forventet internt i generator-, validerings- og gradingkoden og derfor også som et internt property-navn i minificeret JavaScript. UI-kilden bruger det ikke som display-source. Der findes ingen elevvendte `expectedValue`, `correctValue`, løsningsbeløb, developer snapshot, prepared state eller auto-solve. Completed-visningen læser elevens `studentState`. `tests/helpers` importeres ikke af produktionsgrafen.

Der er ingen `eval`, Function constructor, `dangerouslySetInnerHTML`, elevstyret HTML-eksekvering, `Math.random`, backendkald eller runtime-afhængighed af lokale filstier. Tilfældig variant bruger `crypto.getRandomValues`; selve generatoren er deterministisk.

## Privacy og artifacts

Prospektivt tracked materiale er scannet for lokale Windows-brugerstier og identitetsmarkører og credentialmønstrene fra J5A. Der er ingen fund og ingen `.env`-filer. Lokale browseraudit-scripts og screenshots under `artifacts/` indeholder maskinspecifik auditopsætning og er derfor gjort lokale via `.gitignore`.

Anbefalet J5B-strategi: track kilde, tests, `tests/fixtures`, docs, public assets, packagefiler og konfiguration. Ignorér `node_modules/`, `dist/`, `coverage/`, `artifacts/`, browserrapporter, cache/temp og lokale env-filer. Fixture, tests og docs ignoreres ikke.

## GitHub Pages-forberedelse

Forventet project-site base er `/kontering-af-loen-paa-t-konti/`, og forventet URL er `https://lars-viber.github.io/kontering-af-loen-paa-t-konti/`. Vite base og Pages-workflow er med vilje ikke oprettet i J5A; det hører til J5B.

## Auditfiler

Lokale logs og JSON ligger under `artifacts/j5a/`. Det krævede screenshot-sæt er:

- `artifacts/j5a/main-menu.png`
- `artifacts/j5a/exercise.png`
- `artifacts/j5a/video.png`
- `artifacts/j5a/partial-check.png`
- `artifacts/j5a/completed-exercise.png`
- `artifacts/j5a/completed-overview.png`

Projektet har fortsat ingen `.git`-mappe. Der er derfor ingen Git-status at rapportere, og ingen Git-kommando er kørt.

