# J5A – Rapport

1. **Samlet status.** PASS; releasekandidaten er klar til J5B.
2. **Kodeændringer.** Ingen produktkode er ændret; kun README, `.gitignore` og J5A-dokumentation er opdateret.
3. **Faglige ændringer.** Ingen.
4. **generatorVersion.** Fortsat 1.
5. **schemaVersion.** Fortsat 1.
6. **Fixture SHA.** `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`.
7. **Test count.** 133 tests.
8. **Test files.** 13 testfiler.
9. **Failures.** 0.
10. **Typecheck.** PASS med 0 TypeScript-fejl.
11. **Build.** PASS, 51 moduler; HTML 0,48 kB/0,32 gzip, CSS 11,19/2,97, JS 215,97/67,47.
12. **Stress 4000.** 4.000/4.000 successful; alle fem fejlkategorier er 0.
13. **Distribution.** 25.815 medarbejdere; alle krævede kategorier forekommer; bruttoløn 28.000–72.475.
14. **Domain freeze.** 12 af 12 payroll-domainfiler matcher J4-baseline; 0 ændrede.
15. **Session/schema freeze.** 11 af 11 sessionfiler matcher J4-baseline; schemaVersion er 1.
16. **Manual J0 regression.** PASS med totalerne 105.475, 297, 6.275, 98.903, 7.912, 29.680 og 61.311.
17. **Variant 42 regression.** PASS: 8 medarbejdere, forventede syv totaler og Debet = Kredit = 433.375.
18. **Parser.** PASS for de krævede gyldige og ugyldige formater uden silent fallback.
19. **Menu flows.** Ingen, ufærdig og completed session viser de korrekte primære handlinger.
20. **Replacement confirmation.** Ufærdig session kræver confirmation; cancel bevarer og confirm erstatter blankt; completed erstattes direkte.
21. **Restore.** Variant, snapshot, raw input, status, locks og completed bevares gennem menu og reload.
22. **Zero generator calls.** Spy-tests bekræfter 0 generatorcalls ved valid restore og completed restore.
23. **Corrupt storage.** Broken JSON, future schema, corrupt snapshot samt variant- og generatorVersion-mismatch afvises uden crash eller regeneration.
24. **Payslip.** Syv linjer, medarbejderantal, enhed, minusvisning, danske beløb og tydelig nettoløn består.
25. **Account plan.** Præcis otte konti i låst rækkefølge med korrekt nummer, navn og type.
26. **Video.** Lukket uden iframe initialt; aria-expanded, lazy mount, warning og removal består.
27. **T-accounts.** Otte konti med header, Debet/Kredit, skillelinje og korrekt rækkefølge.
28. **Field grading.** Korrekt bliver tekstligt grøn og låst; forkert bliver tekstligt rød og editable.
29. **Blank-zero.** Første blanke check låser 8 zero-sider, mens 8 nonzero-sider forbliver editable; completed er false.
30. **No answer reveal.** Ingen elevvendt answerKey, expectedValue, correctValue, tooltip, dataattribut eller “Korrekt: beløb”.
31. **Totals.** Debet/Kredit-totaler beregnes kun af elevinput og dækker 0/0, ensidigt, ulige og lige.
32. **Invalid totals.** Ugyldig nonblank side viser `—`, og balancestatus skjules.
33. **Balanced-but-wrong.** Lige, fagligt forkerte totaler viser Balancerer uden completion.
34. **Reset.** Confirmation, cancel, blank reset, samme snapshot og 0 generatorcalls består.
35. **Completion.** 16 correct + locked og completed=true gemmes atomisk med korrekt succesbesked.
36. **Completed menu.** Viser Afsluttet opgave, variant og Se afsluttet opgave; ingen Fortsæt.
37. **Completed overview.** Viser bilag, kontoplan, otte T-konti, totaler, balance og successtatus.
38. **studentState display source.** Completed-posteringer læses eksplicit fra elevens studentState.
39. **Completed restore.** Reload og genåbning bevarer snapshot/state og kalder ikke generatoren.
40. **New/specific after completion.** Nye og bestemte varianter starter blankt uden unfinished-dialog; samme variant giver identisk snapshot.
41. **Accessibility.** Labels, buttons, synligt fokus, tekststatus, dialogfokus, Escape, aria-expanded og tekstværdier består.
42. **Keyboard.** Menu, bestemt variant, inputs, video, Kontrollér, dialog, Til hovedmenu og completed card kan betjenes med tastatur.
43. **900 viewport.** Topcards stacker, T-konti er anvendelige, og der er intet vandret overflow.
44. **1280 viewport.** Menu, normal øvelse, delvis kontrol og completed overview består uden overflow.
45. **1366 viewport.** Alle krævede primære tilstande, inklusive invalid total og completed menu, består.
46. **1920 viewport.** Max-width holder indholdet læsbart uden unaturligt brede cards eller overflow.
47. **Console.** 0 errors og 0 warnings i J3-, J4- og J5A-flowene.
48. **Production preview.** PASS mod bygget `dist`: menu, variant 42, input, Kontrollér, localStorage, reload og completion.
49. **Production answer leak.** Kun internt answerKey-property til grading; ingen elevvendte facitfelter eller løsningsværdier i UI.
50. **Helper audit.** Ingen import fra `tests/helpers` eller prepared completed sessions i produktionsgrafen eller bundle.
51. **Security audit.** Ingen eval, Function constructor, dangerous HTML eller elevstyret HTML-eksekvering.
52. **Dependencies.** Runtime er kun `react` 19.2.8 og `react-dom` 19.2.8.
53. **README.** Kort og opdateret med J4/v1-funktionalitet samt bestået J5A-status.
54. **Docs audit.** FAGLIG_SPECIFIKATION og J1–J4 er indbyrdes konsistente; historiske fasebeskrivelser er bevaret.
55. **Privacy/secret audit.** Ingen lokale identitetsstier, credentials eller `.env` i prospektivt tracked materiale.
56. **Local-path audit.** Ingen lokale person- eller maskinstier i releasekandidater; lokale audit-artifacts forbliver ignored.
57. **Artifact recommendation.** Track ikke lokale logs/screenshots/scripts; behold tests, fixture og docs som offentlig evidens.
58. **.gitignore status.** Udvidet med dependencies, build, coverage, artifacts, browseroutput, cache/temp, env og lokale filer.
59. **Recommended Pages base.** `/kontering-af-loen-paa-t-konti/`; forventet URL er `https://lars-viber.github.io/kontering-af-loen-paa-t-konti/`.
60. **Screenshots.** Alle seks krævede 1366×768 J5A-screenshots findes lokalt under `artifacts/j5a/`.
61. **Git status.** Ikke relevant i J5A: projektet har ingen `.git`-mappe, og ingen Git-kommando er kørt.
62. **Release blockers.** Ingen.
63. **Fixture deep equality.** Varianterne 1, 2, 3, 42 og 999999 matcher den låste fixture.
64. **Kontoplan/facit.** Alle otte konti, posteringssider, beløbskilder og nul-modfelter er uændrede.
65. **Individuel afrunding.** Pension, AM-bidrag og A-skat afrundes fortsat pr. medarbejder før summering.
66. **Random source.** Variantvælgeren bruger `crypto.getRandomValues`; `Math.random` forekommer ikke i produktionskilden.
67. **Static SPA.** Ingen backend, routerkrav eller runtime-afhængighed af lokal filsti.
68. **Asset smoke.** HTML, JavaScript, CSS og favicon svarer alle HTTP 200 med korrekt type.
69. **Right alignment.** Bilagsbeløb, inputs, completed-værdier og totaler er højrestillede; labels forbliver venstrestillede.
70. **Status layout.** Audit ved fire bredder viser ingen clipping, vandret overflow eller generende status-hop.
71. **J3 regression.** PASS.
72. **J4 regression.** PASS.
73. **J5A releasebrowseraudit.** PASS mod production preview.
74. **No Git/deployment.** Ingen Git-init, commit, push, repository, Pages-workflow eller deployment er udført.
