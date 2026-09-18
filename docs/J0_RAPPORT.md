# J0-rapport

## 1. Oprettede filer

- docs/FAGLIG_SPECIFIKATION.md
- docs/J0_RAPPORT.md

## 2. Implementeret kode

Ingen. J0 indeholder kun analyse og dokumentation. Der er ikke oprettet app-, generator-, session- eller UI-kode.

## 3. Dependencies

Ingen dependencies er installeret, og ingen package- eller buildkonfiguration er oprettet.

## 4. Kontoplan

Låst til 2210, 2215, 2223, 6920, 6921, 6922, 6930 og 5820 med de angivne navne og typer. Alternative konti er uden for v1.

## 5. Generatorregler

Medarbejderantal, bruttoløn, ATP, pension, AM-grundlag, AM-bidrag, skatteprocent, fradrag og A-skat er låst til prototypens model og dokumenteret i fast beregningsrækkefølge.

## 6. Facit

Facit er låst felt for felt. 2210 debiteres med AM-grundlaget, pension og ATP debiteres særskilt, og de fem balanceposter krediteres.

## 7. Afrunding

Pension afrundes individuelt til nærmeste 25 kr. AM-bidrag og A-skat beregnes og afrundes individuelt til hele kroner før summering.

## 8. Deterministisk variantmodel

generatorVersion = 1 og variant 1–999999. J1 anbefales en dependency-fri seeded PRNG. Samme version og variant skal give samme snapshot/facit, og RNG-trækrækkefølgen er versionsbundet.

## 9. Kontrollér-adfærd

Debet/Kredit vurderes separat. Korrekte felter låses; forkerte forbliver redigerbare; ukontrollerede er neutrale. Gentagen kontrol er mulig, og facit afsløres ikke.

## 10. Debet/Kredit-totaler

Status skjules ved 0/0, er balancerer ikke ved ulige ikke-tomme summer og balancerer ved lige positive summer. Balance er ikke lig faglig korrekthed.

## 11. Blank/zero

Blank betyder 0 og er korrekt mod et facit på 0. Eleven behøver ikke skrive nul i ubrugte felter.

## 12. Session

schemaVersion starter på 1. Sessionen gemmer versioner, variant, autoritativt snapshot, student state, completion og tid. Restore regenererer aldrig. Meningsfulde ændringer autosaves.

## 13. Video

YouTube-videoen bevares sammenklappelig og lukket som default med tydelig advarsel om forældede ATP-satser og anden kontoplan. Videoen er ikke datakilde.

## 14. Design

Det blå regnskabsdesign og desktopmålene 1280×720, 1366×768 og 1920×1080 er låst. T-kontiene er kompakte, og horisontal sidescroll undgås.

## 15. Teststrategi

Dækker generator, individuel afrunding, summer, facit, parser, feltvis kontrol, ingen facitafsløring, totaler, session/restore, accessibility og browserlayouts. Fixtures planlægges for 1, 2, 3, 42 og 999999.

## 16. Invariants

Medarbejderinterval, ATP, satser, beløbsformler, AM-grundlag, individuel AM/A-skat, ikke-negative beløb, fast kontoplan og Debet = Kredit er hard invariants. Senere stress: mindst 4.000 varianter med distributionsrapport.

## 17. Faseplan

J0 dokumentation; J1 fundament/generator/facit/tests; J2 menu/variant/session; J3 funktionel øvelse; J4 completion/browser-polish; J5 audit og release.

## 18. Bevidste forskelle fra Lovable

Math.random, fejllåsning, automatisk facit, permanent videoblok, stort frameworktræ og beige/brunt design kopieres ikke. Faglig model, konti, facit, individuel beregning og totalhjælp bevares.

## 19. Uafklarede spørgsmål

Ingen faglige blockers. Senere faser kan fastlægge mikrotekst, confirmation-ordlyd og intern snapshotrepræsentation uden at ændre modellen.

## 20. Konsistenskontrol

Manuelt eksempel med tre medarbejdere:

- bruttoløn 105.475
- ATP 297
- pension 6.275
- AM-grundlag 98.903
- AM-bidrag 7.912
- A-skat 29.680
- nettoløn 61.311
- Debet = Kredit = 105.475

Eksemplet bekræfter rækkefølge, individuel afrunding, facit og dobbelt bogføring.

## 21. Git-status

Git er ikke initialiseret, og ingen Git-kommandoer er udført i projektet.

J0 KLAR TIL GODKENDELSE