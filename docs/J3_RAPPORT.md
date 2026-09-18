# J3 – Rapport

1. **Filer oprettet/ændret.** Oprettet `src/session/exercise.ts`, `src/ui/formatAmount.ts`, seks filer under `src/ui/exercise/`, to J3-testfiler, J3-dokumentation og audit-artifacts. Ændret `src/App.tsx`, `src/styles.css` og `README.md`. Eksisterende J1-domain- og J2-sessionfiler er byteuændrede.
2. **Dependencies.** Ingen nye dependencies; runtime er fortsat kun React og ReactDOM.
3. **schemaVersion.** Fortsat 1.
4. **generatorVersion.** Fortsat 1.
5. **Domain freeze.** Alle 12 filer i `src/domain/payroll/` matcher før-hashene.
6. **Fixture SHA.** `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`.
7. **Exercise layout.** Kompakt header, instruktion, bilag/kontoplan, video, T-konti, totaler og kontroller i eksisterende blå design.
8. **Header.** Titel, `Variant X · Generator v1` og `Til hovedmenu` på en 60 px topbar.
9. **Payslip source.** Kun det autoritative `exerciseSnapshot.payslipTotals` og `employeeCount`; ingen regeneration eller medarbejderdata.
10. **Payslip labels.** De syv krævede linjer vises præcist; fradrag har præsentationsminus, og Nettoløn er slutlinje.
11. **Amount formatting.** Central `Intl.NumberFormat('da-DK')`, hele kroner, højrestillet og tabular numerals.
12. **Account plan.** Otte read-only konti med nummer, navn og type direkte ved siden af bilaget.
13. **Video collapse.** Lukket som standard, rigtig button, `aria-expanded`, `aria-controls` og lazy-mounted iframe.
14. **Video warning.** Den fulde bemærkning om forældede ATP-satser og anden kontoplan vises ved åbning.
15. **T-account layout.** Tydelig vandret headerlinje og lodret Debet/Kredit-linje i hvide cards; tre desktopkolonner.
16. **Account order.** Præcis J1-rækkefølge; browser og UI-test bekræfter otte cards.
17. **Input labels.** Hvert input har konto, navn og side i accessible name.
18. **Raw input behavior.** Elevens tekst vises og gemmes uden autoformattering.
19. **Parser feedback.** Nonblank ugyldigt input viser tekstlig `Ugyldigt beløb` før og efter kontrol.
20. **Autosave per edit.** J2's immutable update-helper bruges på hver meningsfuld ændring; React-state bevares ved write failure.
21. **Central check transaction.** Alle 16 felter parses/grades, status og completion beregnes samlet, og sessionen gemmes én gang.
22. **Correct field behavior.** Grøn, `✓ Korrekt`, locked og disabled.
23. **Incorrect field behavior.** Rød, tekstlig fejl og fortsat editable; ingen forventet værdi.
24. **Field-level independence.** Debet og Kredit vurderes og låses separat.
25. **Blank-zero behavior.** Første blanke check giver 8 korrekte/låste zero-felter og 8 forkerte/redigerbare nonzero-felter.
26. **Invalid-input behavior.** Invalid bliver altid incorrect og unlocked, også mod zero-facit.
27. **No answer reveal.** UI-sourceaudit har 0 matches for `answerKey`, `expectedValue`, `correctValue`, `Korrekt:`, snapshot-JSON eller medarbejderrecords.
28. **Repeated check.** Locked fields bevares; rettede unchecked fields vurderes igen.
29. **Totals behavior.** Beregnes løbende kun fra elevinput; blank er 0, og alle gyldige beløb tæller.
30. **Invalid total behavior.** Den berørte side viser `—`; formatbesked vises, og balancestatus skjules.
31. **Balanced/unbalanced behavior.** 0/0 er neutral, ulige positive totaler viser `Balancerer ikke`, lige positive viser `Balancerer`.
32. **Balanced-but-wrong regression.** 100 Debet/100 Kredit viser balance, men check giver incorrect og ikke completed.
33. **Reset confirmation.** Custom dialog ved input/status; tom session har disabled reset uden dialog.
34. **Reset behavior.** Blank/unchecked/unlocked state, `completed: false` og nyt `savedAt`; variant og snapshot bevares.
35. **Reset zero generator calls.** Unit- og UI-regression forventer 0 generatorcalls.
36. **Completion.** Alle 16 correct/locked og `completed: true` opstår i samme transaction og samme storage-write.
37. **Completed invariant.** J2-codec accepterer den gemte completed-session; intet inkonsistent mellemstadie persistentes.
38. **Success message.** Den aktuelle view viser de tre krævede succesbudskaber og skjuler `Kontrollér`.
39. **Continue restore.** Exact rawInput/status/locks bevares gennem Til hovedmenu og Continue.
40. **Reload restore.** Browser- og UI-test bekræfter samme state og snapshot efter reload/remount.
41. **Restore generator calls.** 0 ved Continue, reload og completed restore; J2-regressionen består fortsat.
42. **Storage failure UI.** Appen crasher ikke, beholder elevens React-state og viser `Ændringen kunne ikke gemmes lokalt.`
43. **Accessibility.** Rigtige buttons, labels, logisk DOM/tab-order, visible focus, aria-expanded/controls, aria-invalid samt tekst ud over farve.
44. **1280 viewport.** Ingen horizontal overflow; bilag, kontoplan og 8 konti verificeret; screenshot gemt.
45. **1366 viewport.** Normal-, video-, partial- og completed-flow verificeret; tre kolonner er læsbare uden horizontal overflow.
46. **1920 viewport.** Ingen horizontal overflow; max-width 1180 px forhindrer unaturlig udstrækning.
47. **Screenshots.** Alle seks krævede billeder findes under `artifacts/j3/`.
48. **Browser normal flow.** Main menu → bestemt variant 42 → exercise; korrekte bilagsværdier, kontoplan og lukket video verificeret.
49. **Browser partial-check flow.** Korrekt grønt locked felt, forkert rødt editable felt, edit til unchecked, menu/Continue og reload verificeret.
50. **Browser completion flow.** Testscript uden for production bundle indtastede de otte nonzero-beløb; completed, 16 disabled inputs, balance og persisted completed blev verificeret.
51. **Console errors/warnings.** 0 errors og 0 warnings på alle tre viewports og flows.
52. **No-answer-leak audit.** 0 production-facing UI-matches; facit bruges kun internt i sessionens check-service. Browserens completiondata ligger kun i audit-scriptet under `artifacts/`.
53. **Test files.** 12 filer: de 10 eksisterende plus `exercise-session.test.ts` og `exercise-ui.test.tsx`.
54. **Total tests.** 124.
55. **Failures.** 0.
56. **Typecheck.** `pnpm typecheck`: 0 errors.
57. **Build.** 48 modules; HTML 0.48 kB/0.32 kB gzip; CSS 9.25 kB/2.66 kB gzip; JS 212.67 kB/67.05 kB gzip.
58. **J1 fixture verification.** Varianterne 1, 2, 3, 42 og 999999 består deep-equality-regressionen.
59. **Fixture SHA-256.** `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`.
60. **J1 stress.** 4.000/4.000 varianter, 0 generator-, invariant-, balance-, negativ-skat- eller negativ-nettoløn-fejl; 25.815 medarbejdere.
61. **Dependencies audit.** Ingen nye runtimepakker og ingen TanStack, Tailwind, Radix, router, state- eller formbiblioteker.
62. **Docs.** `docs/J3_EXERCISE.md`, `docs/J3_RAPPORT.md`, kort README-status samt browser/freeze-audits.
63. **Git status.** Projektet har intet `.git`-katalog; ingen Git-kommando er kørt.
64. **Problemer/kompromiser.** Ingen faglige blockers. Browserauditten validerer iframe-mount, URL, warning og toggle; ekstern YouTube-afspilning er netværksafhængig og er ikke en del af den lokale gate. J4 completed-menu/read-only-view er ikke implementeret.

## Screenshots

- `artifacts/j3/1366-exercise-normal.png`
- `artifacts/j3/1366-video-open.png`
- `artifacts/j3/1366-partial-check.png`
- `artifacts/j3/1366-completed.png`
- `artifacts/j3/1280-exercise.png`
- `artifacts/j3/1920-exercise.png`

