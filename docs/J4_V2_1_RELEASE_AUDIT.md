# J4 – V2.1.0 releaseaudit

Dato: 22. september 2026

## Releasekandidat

- Auditeret branch: `feature/v2.1-june-reconciliation`
- J3C-commit: `fd28cf1dc22988fc9abb66a8e92b1a03ab37a772`
- V2.0.1-baseline: `d04850966046a6a6a1c63449dae7f10095ce4918`
- Branch og upstream var identiske ved auditstart.
- `main` og `origin/main` peger begge på V2.0.1-baselinen; der er ingen main-divergens i forhold til featurehistorikken.
- Release-tags er intakte: `v1.0.0` = `634a0eb94f789b950879443b1fc6817aa501b479`, `v2.0.0` = `5b6c95e9af04a38add609bd9d19fb0d9bb43a387`, `v2.0.1` = `d04850966046a6a6a1c63449dae7f10095ce4918`.
- Tagget `v2.1.0` findes ikke.

## Diff og dependencies

Diffen fra V2.0.1 omfatter V2.1 normative dokumenter, domain, generator, state, session, controller, workspace, browser/runtime-integration, App/Home-integration, tests, fixtures og J0-J3-rapporter. Der er ingen ændringer i uventede subsystemer.

`package.json` og `pnpm-lock.yaml` er uændrede mod V2.0.1. Der er ingen nye runtime- eller dev-dependencies. Niveau 1-domæne, session, opgaveflow og UI er uændrede; den eksisterende YouTube-resource er fortsat `https://www.youtube.com/embed/A6XmMtNr5mM`.

README havde én forældet beskrivelse af 13 bilag og er alene rettet til den godkendte juni-only B1-B9-model.

## Faglig model

Niveau 2 starter i juni. B1-B3 betaler relevante maj-forpligtelser, B4-B8 er komplette juni-lønbilag og relaterede poster, og B9 regulerer feriepengeforpligtelsen pr. 30/6. Derefter følger afstemning pr. 30/6. B10-B13, juli-flow og gammel slutkontrol/finalControl findes ikke i det aktive V2.1-flow.

De håndfrosne R1-tests bekræfter alle specificerede B1-B9-posteringer, 9/9 balancerede bilag og disse slutsaldi: 2210 915.932 D, 2211 1.164.024 D, 2215 260.588 D, 2223 14.256 D, 2230 119.574 D, 2235 32.500 D, 5820 1.086.225 D, 6920 114.447 K, 6930 29.654 K, 6922 43.884 K, 6921 14.256 K, 6923 11.716 K og 6924 182.500 K. Summen af de seks driftskonti er 2.506.874.

Afstemning A giver 915.932 + 38.262 + 2.376 = 956.570 mod timelønnedes bruttolønstælleværk 956.570. Afstemning B giver 1.164.024 + 48.600 + 2.376 = 1.215.000 mod månedslønnedes bruttolønstælleværk 1.215.000. Begge differencer er 0.

Afstemning C sammenholder hele saldoen på 2215 med fire pensionstælleværker, hele saldoen på 2223 med fire ATP-tælleværker og saldoen på 2230 med bruttoferiepenge ÅTD. Alle differencer er 0, og de enkelte ATP-felter grades fortsat særskilt. Konto 2235 har ikke et kunstigt eksternt tælleværk i C. D er intern kontrol af 2210, 2211, 2215, 2223, 2230 og 2235. E afstemmer seks kreditposter mod synlige eksterne kontroloplysninger; alle differencer er 0, og D/K grades feltvist.

## Progression og visning

De eneste phases er `documentEntry`, `documentReview`, `checkpoint`, `checkpointReview` og `completed`. Et korrekt check avancerer ikke automatisk. B1-B8 kræver **Gå videre til næste bilag**, B9 kræver **Gå videre til afstemning**, og completed kræver **Afslut Niveau 2** efter checkpointReview. Complete-handlingen findes både øverst og nederst og kalder samme controllerhandling.

Tidligere godkendte bilag kan åbnes read-only; fremtidige bilag kan ikke åbnes. Historisk navigation er lokal presentation state, gemmer ikke, genererer ikke og ændrer ikke student phase. Retur bevarer raw elevinput, og T-konti vises as-of det valgte bilag.

Alle B1-B9-opgaveposteringer og split rows vises direkte i T-kontiene i document entry/review, checkpoint/review og completed review. Startsaldo, D/K og elevafledte saldi bevares. Ingen opgavepostering skjules bag `+ N tidligere`.

Checkpointlayoutet er A | B, derefter Pension | ATP med Feriepenge nedenunder, efterfulgt af D og E samt et separat referenceområde. Desktop har uafhængig scroll i afstemnings- og referenceområder. Under 900 px bruges naturligt stablet sideflow uden tvungne nested scrollbokse. CSS-kontrakten dækker 375×667, 768×1024, 900×768, 1280×720, 1366×768 og 1920×1080 via de relevante small, medium, default og wide breakpoints.

Live summer og differencer er alene presentation feedback. De persisteres ikke, grader ikke automatisk, låser ikke automatisk og avancerer ikke. Difference 0 før check vises neutralt; **Stemmer** vises først efter korrekt grading.

Completed viser **Niveau 2 gennemført**, 9 af 9 bilag, **Afstemning ✓**, slutoversigt pr. 30/6 og 13 slutsaldi. **Se afsluttet opgave** åbner en read-only gennemgang af B1-B9 og Afstemning med elevens faktiske rows, split rows, bilagsdata, tælleværker, T-konti og A-E-besvarelse. Reviewet har ingen mutationer, grading controls eller facitvisning og kan afsluttes med **Tilbage til afslutning**.

## Source/facit, B9 og runtime

Aktiv workspace/runtime modtager eller importerer ikke `caseSnapshot.answers`, `answers`, `expectedPostings`, `answerKey` eller `expectedCheckpoint`. Facit og grading ligger bag controller/state/domain-grænsen. Synlige source-tælleværker og eksterne kontroloplysninger er de eneste kontrolkilder i præsentationen.

B9 viser bogført saldo før regulering og systemopgjort saldo pr. 30/6, men ikke det direkte beregnede reguleringsbeløb. Der er ingen aktive V2.0.x runtimeimports i App, ingen `Math.random`, ingen generatorcall ved restore/continue og ingen B10-B13 eller finalControl i den aktive V2.1-UI.

Production source indeholder ingen query-parametre, window-globals, skjulte facitpaneler, localStorage seed-kommandoer eller brugeraktiverbar generatoroverride. Test dependency injection er ikke tilgængelig fra den deployede brugerflade.

## Session, legacy og random

Session schema er 2 med storage key `kontering-af-loen-paa-t-konti.level2.session.v2`. Payloaden indeholder schemaVersion, rulesetYear, rulesetVersion, generatorVersion, variant, caseSnapshot, studentState og savedAt. Restore bruger det persisterede authoritative snapshot uden regeneration.

Legacy key `kontering-af-loen-paa-t-konti.level2.session.v1` bruges kun til presence detection. Der er ingen silent migration, automatisk sletning eller fallback fra invalid V2 til V1. V1-only viser neutral vejledning og eksplicit ny V2.1; valid V2 vinder ved samtidig V1; invalid V2 falder ikke tilbage. Ny V2 skriver kun V2-key og ændrer ikke V1-bytes.

Random V2.1 bruger `crypto.getRandomValues`, unbiased rejection sampling og intervallet 1..999999. Eksplicit variant valideres i samme interval. Generatoren kaldes kun efter eksplicit brugerhandling; mount, render, StrictMode, restore og continue genererer ikke en case.

Den frosne generatorkontrakt er rulesetYear 2026, rulesetVersion 2 og generatorVersion 2. Seed er `payroll-level2:ruleset-2026-v2:generator-v2:<variant>`, RNG er FNV-1a32 + Mulberry32, og draw count er `10 + 9H + 3M`.

## Test- og generatorresultater

- Fuld suite: 66/66 testfiler, 545/545 tests, 0 failures.
- Niveau 1 særskilt: 13/13 testfiler, 133/133 tests.
- Målrettet V2.1 release-flow/session/workspace: 16/16 testfiler, 169/169 tests.
- Generator V1 stress: 4.000/4.000.
- Generator V2 stress: 4.000/4.000, alle ni bilag balancerer, og afstemninger, intern kontrol, balancekontroller og bank guardrail består.
- V2 økonomiske duplicate fingerprints: 0.
- Canonical V2 fixtures 1, 2, 3, 42 og 999999: PASS.
- V2.1 Generator V2 SHA-256: `e15ef7072a6ad7be0769860ac4907802a35e0227d990911a3f2d2402f0cadd46`.
- Generator V1 SHA-256: `a82a9de6f1c743ac170ae1d8870255434cdb9b7b91062855122d3dfdd6d26342`.
- V2.0.x R1 SHA-256: `9b61e27f04f9dbca0ae09de73d34a11a0c906bdf133ec23a12887ddb753c61e0`.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS; 121 moduler, JavaScript 335,97 kB og CSS 47,52 kB.

Variant 42 indgår i deterministic generator-, state-, controller-, persistence- og full-flow-dækningen gennem B1-B9, documentReview, checkpoint, checkpointReview, completed, remount og completed review. Der er ingen test-only production backdoor.

## Production, privacy og kvalitet

Vite base er `/kontering-af-loen-paa-t-konti/`. GitHub Pages-workflowet bygger på main med test, typecheck, build, artifact upload og deploy jobs. J4 deployer ikke.

Production preview HTTP-smoke gav 200 for projektstien, favicon, main JavaScript og main CSS. Alle asset paths brugte korrekt Pages-base. Auditpreview-processen blev stoppet bagefter.

Appen fungerer client-side og bruger localStorage til sessioner. Der er ingen analytics, tracking, nye eksterne API'er eller uventede requests i V2.1. Den eksisterende YouTube-video i Niveau 1 er den eneste eksterne indholdsresource.

Brugerrettet terminologi bruger omkostning/omkostninger og lønsystemets tælleværk/tælleværker. De forbudte `udgiftsføre`/`udgiftsføres` forekommer ikke. Tekniske versionslabels vises ikke i bruger-UI.

Accessibility-sanity er PASS: handlinger er rigtige buttons, inputfelter har labels, låste/read-only states er tydelige, dialogs har dialogrolle og navngivning, progress navigation bruger forståelige accessible names og keyboard-aktiverbare buttons, og korrekt status kommunikeres med tekst/symbol samt farve. Autosave failure bevarer seneste in-memory state, viser warning og tilbyder keyboard-tilgængelig retry; succes rydder failure uden rollback eller regeneration.

Den automatiserede Codex-browser blev ikke genkørt i J4 efter den tidligere hostfejl `CreateProcessWithLogonW failed: 1385`. Der er ikke tilføjet produktworkarounds. Build-, HTTP- og testsmokes er grønne.

## User-performed manual browser acceptance

Niveau 1 er manuelt gennemprøvet uden bemærkninger. Niveau 2 er endeligt manuelt gennemprøvet efter den sidste præsentationsrettelse. Den brugerudførte acceptance omfattede B1-B9, komplette lønbilag, documentReview, historiske bilag, alle task-posteringer i T-konti, afstemning A-E, uafhængig reference-scroll, top/bottom complete, completed, **Se afsluttet opgave** samt de afsluttende labels og rendering.

Brugeren bekræftede efter sidste gennemgang: “alt er nu som det skal være”. Dette er USER-PERFORMED MANUAL BROWSER ACCEPTANCE og ikke en maskinautomatiseret browserassertion.

## Blockers

Ingen outstanding releaseblockers blev fundet. J4 ændrer kun de to releaseaudit-dokumenter samt den minimale faktuelle README-rettelse. Merge til main, tag `v2.1.0`, GitHub release og deployment er reserveret til J5.

RELEASE AUDIT: PASS