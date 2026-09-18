# J2 – Rapport

1. **Filer oprettet/ændret.** Oprettet `src/session/*`, `src/ui/Dialog.tsx`, `tests/session.test.ts`, `tests/variant.test.ts`, `tests/app.test.tsx`, `public/favicon.svg`, `docs/J2_SESSION.md`, denne rapport og J2-audit/screenshot-artifacts. Ændret `src/App.tsx`, `src/styles.css`, `index.html`, `vite.config.ts`, `package.json`, `pnpm-lock.yaml` og `README.md`. J1-domænet er ikke ændret.
2. **Dependencies.** Runtime er fortsat kun React 19.2.8 og ReactDOM 19.2.8. De udtrykkeligt tilladte dev-dependencies `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7 og `jsdom` 30.0.1 er tilføjet til konkrete UI-tests.
3. **schemaVersion.** Central konstant `SCHEMA_VERSION = 1`.
4. **localStorage key.** `kontering-af-loen-paa-t-konti.session.v1`, defineret ét sted.
5. **Session shape.** `schemaVersion`, `generatorVersion`, `variant`, `exerciseSnapshot`, `studentState`, `completed`, `savedAt`; ren JSON.
6. **studentState shape.** Read-only record med otte `AccountId`-keys, hver med eksakt `debit` og `credit`; felter har `rawInput`, `status`, `locked`.
7. **16 field states.** 8 konti × 2 sider verificeres eksplicit i test.
8. **Raw input persistence.** Rå tekst gemmes; `145.812` bevares præcist gennem save/load.
9. **Initial state.** Alle felter er blanke, `unchecked` og ulåste; `completed = false`.
10. **Locked invariant.** Codec accepterer kun `correct + locked`; andre statusser kræver `locked: false`.
11. **Completed invariant.** `completed` er kun sand, når alle 16 felter er `correct` og låste; codec afviser inkonsistens begge veje.
12. **Session codec.** Eksplicit runtime-decode med eksakte keys, typed resultater og uden type-cast af uvalideret JSON til session.
13. **Snapshot validation.** Det gemte snapshot valideres med J1's `validateSnapshot`; ingen regeneration eller silent repair.
14. **Snapshot deep-freeze.** Hele den godkendte session, inklusive nested snapshotdata, deep-freezes efter restore.
15. **Autoritativ restore.** `exerciseSnapshot` er den gemte sandhed ved reload, Continue og tilbage/videre-flow.
16. **Nul generatorcalls ved restore.** Spy-regression gemmer variant 42 med ændret elevstate, loader igen og forventer præcis 0 generatorcalls samt identisk snapshot/state.
17. **Korrupt JSON.** Returnerer `corrupt-json`; menuen vises og tilbyder `Fjern gemt opgave`.
18. **Future schema.** Fx schema 99 returnerer `unsupported-schema`; der findes ingen implicit migration.
19. **Korrupt snapshot.** Manipuleret ATP-total afvises af de faglige snapshot-invarianter.
20. **generatorVersion mismatch.** Afvises af codec/invariantkontrol.
21. **Variant mismatch.** Afvises, når session og snapshot ikke matcher.
22. **Storage failure.** Read-, write- og clear-exceptions fanges og vises/returneres uden app-crash.
23. **Random variant picker.** Separat session/UI-utility, testbar via injiceret uint32-kilde og med afgrænset fallback ved gentagelse.
24. **crypto.getRandomValues.** Browserkilden bruger `globalThis.crypto.getRandomValues`; spy-test bekræfter kaldet.
25. **Bestemt variant.** J1's `isValidVariant` kræver heltal 1–999999; blank, tekst, decimal og værdier uden for intervallet starter ikke en session.
26. **Ufærdig replacement.** Både tilfældig og bestemt ny variant kræver custom confirmation ved eksisterende ufærdig session.
27. **Cancel.** Lukker dialogen og bevarer session, storage, variant og generator-call count.
28. **Confirm.** Genererer ét nyt snapshot, blank elevstate og `completed: false`, gemmer og åbner shell.
29. **Menu uden session.** Viser de to startmuligheder og ingen Continue-knap.
30. **Menu med aktiv session.** Viser tekstlig status, variant, medarbejderantal, gemmetid og Continue.
31. **Continue.** Åbner samme snapshot og state uden generatorcall.
32. **Exercise shell.** Viser titel, variant, generator v1, medarbejderantal og neutral J2-placeholder uden J3-funktioner eller facitdata.
33. **Til hovedmenu.** Skifter kun ephemeral view-state; session og storage bevares.
34. **Autosave/update architecture.** `updateAndSaveStudentField` samler immutable mutation, `savedAt` og storage-write; J3 kan sætte den returnerede session i React-state.
35. **Locked mutation protection.** Edit af låst felt returnerer samme session og udfører ingen write.
36. **Incorrect edit.** Ny tekst i et ulåst `incorrect` felt nulstiller status til `unchecked`.
37. **No answer leak.** Menu og shell viser hverken `answerKey`, korrekte beløb, medarbejderdetaljer eller snapshot-JSON.
38. **Design system.** Alle krævede blå, baggrunds-, surface-, text-, success- og error-tokens er defineret; UI bruger almindelig CSS.
39. **Viewport sanity.** Headless Edge kontrollerede 1280×720, 1366×768 og 1920×1080: menu/actions synlige, 0 vandret/vertikal overflow, max menu-bredde 960 px og 0 console errors. Resultat: `artifacts/j2-viewport-audit.json`.
40. **Testfiler.** J2 tilføjer `session.test.ts`, `variant.test.ts` og `app.test.tsx`; alle syv J1-testfiler bevares.
41. **Total tests.** 106 tests i 10 filer.
42. **Failures.** 0.
43. **Typecheck.** `pnpm typecheck`: 0 errors.
44. **Build.** `pnpm build`: 39 modules; JS 202.99 kB / 64.26 kB gzip; CSS 3.90 kB / 1.40 kB gzip; HTML 0.48 kB / 0.32 kB gzip. Alle buildtal er fra den afsluttende gate.
45. **J1 fixture verification.** Varianterne 1, 2, 3, 42 og 999999 består fortsat deep-equality-regressionen.
46. **Fixture SHA-256.** `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`, præcis som frozen baseline.
47. **J1 stress.** 4.000/4.000 varianter, 0 generator-, invariant-, balance-, negativ-skat- eller negativ-nettoløn-fejl; 25.815 medarbejdere.
48. **Generator/domain freeze.** Alle 12 filer i `src/domain/payroll/` er byteidentiske med før-hashene. Se `artifacts/j2-domain-before.json` og `artifacts/j2-domain-freeze.json`.
49. **Math.random audit.** Ingen forekomst i `src`; variantudvælgelse bruger Web Crypto.
50. **Dependencies audit.** Ingen TanStack, Tailwind, Radix, router, state-, form- eller CSS-framework-dependency.
51. **Docs.** `docs/J2_SESSION.md`, `docs/J2_RAPPORT.md`, kort README-status, freeze-audit, viewportaudit og tre valgfrie 1366×768 screenshots.
52. **Git status.** Projektet har fortsat intet `.git`-katalog. Ingen Git-kommando er kørt; Git er udskudt til J5 som krævet.
53. **Problemer/kompromiser.** Ingen faglige blockers. Completed-visning er bevidst udskudt til J4, og J2-shellen har ingen funktionel lønøvelse. UI-testlibraries blev tilføjet som dev-only efter specifikationens tilladelse. Et lokalt SVG-favicon fjerner browserens automatiske favicon-404.

## Artifacts

- `artifacts/j2/main-menu.png`
- `artifacts/j2/active-session.png`
- `artifacts/j2/specific-variant.png`
- `artifacts/j2-viewport-audit.json`
- `artifacts/j2-domain-before.json`
- `artifacts/j2-domain-freeze.json`

