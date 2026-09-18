# J4 – Rapport

1. **Filer oprettet/ændret.** Oprettet `src/ui/completed/*`, `tests/helpers/completedSession.ts`, `tests/completed-ui.test.tsx`, J4-dokumentation og audit-artifacts. Ændret `src/App.tsx`, `src/ui/exercise/ExerciseView.tsx`, `src/styles.css` og `README.md`.
2. **Dependencies.** Ingen nye dependencies; runtime er fortsat React og ReactDOM.
3. **schemaVersion.** Fortsat 1; ingen migration eller ny persisted view-state.
4. **generatorVersion.** Fortsat 1.
5. **Domain freeze.** Alle 12 payroll-domainfiler er byteidentiske med J4-før-hashene.
6. **Fixture SHA.** `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`.
7. **Completed criterion.** Eksisterende J3-kriterium: alle 16 felter er `correct + locked` i samme atomiske session som `completed = true`.
8. **Completion actions.** Completed exercise viser `Se afsluttet opgave`, `Til hovedmenu` og `Generér ny opgave`.
9. **Completed app view.** Ny ephemeral `completed` view-state; ingen router eller schemaændring.
10. **Completed header.** Kompakt titel, variant/generator, tekstlig `Afsluttet opgave` og `Til hovedmenu`.
11. **Completed payslip.** Samme read-only summerede bilag og syv linjer som J3 med danske, højrestillede beløb.
12. **Completed account plan.** De samme otte konti og typer i J1-rækkefølge.
13. **Completed T-accounts.** Otte neutrale read-only T-konti med tekstbaseret Debet/Kredit.
14. **studentState som display-source.** Alle completed-posteringer parses og vises fra elevens egen gemte rawInput.
15. **answerKey ikke display-source.** Production-facing UI har ingen `answerKey`, `expectedValue` eller `correctValue`.
16. **Zero-side display.** Otte zero-/blanke sider vises konsekvent som `–`.
17. **Completed totals.** Variant 42 viser Debet 433.375 og Kredit 433.375 fra studentState.
18. **Completed balance status.** Viser `Balancerer` med separat forklaring af balancebegrebet.
19. **Ingen inputs completed.** Browser- og UI-test finder 0 inputs i overview.
20. **Ingen Kontrollér completed.** Hverken overview eller completed exercise viser knappen.
21. **Ingen reset completed.** Reset skjules i completed exercise/overview, og handleren har defensiv guard.
22. **Main menu completed card.** Diskret success-accent, tekststatus, variant, medarbejdere og completed action.
23. **Se afsluttet opgave.** Åbner overview direkte fra menu og exercise.
24. **Completed restore.** Save/remount viser completed-card og samme session.
25. **Nul generatorcalls completed restore.** Spy-test og menu/overview-flow forventer 0 calls.
26. **Til hovedmenu completed.** Ændrer kun ephemeral view; storage og `savedAt` bevares byteidentisk.
27. **Ny opgave efter completion.** Starter uden warning, vælger anden variant og opretter blank, ufærdig session.
28. **Bestemt variant efter completion.** Variant 1 starter direkte med blank state.
29. **Samme variant restart.** Variant 42 giver identisk snapshot og ny blank state.
30. **Unfinished confirmation regression.** Partial session viser fortsat dialog; Escape/cancel bevarer storage.
31. **Completed immutability.** Mutation af locked felt returnerer samme session og giver 0 storage-writes.
32. **Visuel polish.** Completed success, headerbadge, menu-card, neutrale T-konti, kompakte actions og 900-stack er tilføjet uden redesign af J3.
33. **T-account column choice.** Tre kolonner ved 1280/1366/1920; to ved 900. Valget er visuelt auditeret.
34. **Right alignment.** Bilag, editable inputs, completed amounts og totaler er højrestillede med tabular numerals.
35. **Accessibility.** Completed fields er tekst, status er tekstlig, navigation er buttons; keyboard Enter/Escape og dialogfocus består.
36. **900 viewport.** Topcards stacker, T-konti bruger to kolonner, ingen fundamental break eller vandret scroll.
37. **1280 viewport.** Menu, normal, partial og completed overview har ingen vandret scroll eller clipped actions.
38. **1366 viewport.** Alle syv centrale states og flows er auditeret uden overflow.
39. **1920 viewport.** Max-width 1180 holder cards og linjer samlet.
40. **Horizontal overflow.** 0 i alle målte states; `scrollWidth === clientWidth`.
41. **Screenshots.** Ni krævede J4-screenshots plus 900-sanity er gemt.
42. **Browser completion flow.** Sidste check → success → completed exercise → completed overview består.
43. **Completed menu flow.** Overview → menu-card → keyboard-åbnet overview består uden storageændring.
44. **New-after-completion flow.** Ingen unfinished-dialog; 16 blanke inputs og `completed=false`.
45. **Unfinished regression flow.** Confirmation vises, Escape lukker, og sessionen bevares.
46. **Video regression.** Lukket default, keyboard-open, iframe/warning, keyboard-close og unmount består.
47. **Partial-check regression.** Grøn/locked, rød/editable, edit→unchecked og restore består.
48. **Invalid-total regression.** Kredit-total bliver `—`, og balancestatus skjules.
49. **Console errors/warnings.** 0 errors og 0 warnings i alle browserkontekster.
50. **Production answer-leak audit.** 0 matches i `src/ui` og `src/App.tsx` for facit-/employee-internaler.
51. **Production helper audit.** 0 imports fra `tests/helpers`; prepared completion findes kun i test/audit-script.
52. **Test files.** 13 testfiler plus én ikke-eksekverbar helperfil.
53. **Total tests.** 133.
54. **Failures.** 0.
55. **Typecheck.** `pnpm typecheck`: 0 errors.
56. **Build.** 51 modules; HTML 0.48 kB/0.32 kB gzip; CSS 11.19 kB/2.97 kB gzip; JS 215.97 kB/67.47 kB gzip.
57. **J1 stress.** 4.000/4.000 varianter; samme uændrede generatorfamilie og 25.815 medarbejdere.
58. **Fixture verification.** Varianterne 1, 2, 3, 42 og 999999 består deep-equality-regressionen.
59. **Domain freeze.** Før/efter-hashes viser 0 ændrede domainfiler.
60. **Session/schema status.** Alle 11 eksisterende sessionfiler, inklusive J3-checkservice, er byteuændrede; schema er fortsat v1.
61. **Docs.** `docs/J4_COMPLETED.md`, `docs/J4_RAPPORT.md`, kort README-status samt browser/freeze/final audits.
62. **Git status.** Intet `.git`-katalog; ingen Git-kommando kørt.
63. **Problemer/kompromiser.** Ingen blockers. Completed overview udelader video som anbefalet. Refresh vender til menuens completed-card. Ekstern YouTube-afspilning er netværksafhængig; lokal gate validerer embed, warning og lifecycle.

## Screenshots

- `artifacts/j4/1366-main-menu.png`
- `artifacts/j4/1366-exercise-normal.png`
- `artifacts/j4/1366-video-open.png`
- `artifacts/j4/1366-partial-check.png`
- `artifacts/j4/1366-completed-exercise.png`
- `artifacts/j4/1366-completed-overview.png`
- `artifacts/j4/1366-main-menu-completed.png`
- `artifacts/j4/1280-completed-overview.png`
- `artifacts/j4/1920-completed-overview.png`
- `artifacts/j4/900-completed-overview.png`
