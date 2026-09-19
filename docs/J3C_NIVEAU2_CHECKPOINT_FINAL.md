# J3C – Niveau 2 checkpoint, slutkontrol og completed flow

## Afgrænsning

J3C erstatter J3B's fase-placeholders med præsentationslaget for checkpoint pr. 30/6, slutkontrol og completed view. De frosne lag i `src/domain/level2`, `src/level2/state`, `src/level2/session` og `src/level2/controller` ændres ikke. Præsentationslaget beregner ikke løn, facitposteringer eller grading.

## Routing og central autosave

`Level2Workspace` router direkte efter `studentState.phase`:

- `checkpoint` viser `CheckpointWorkspace`
- `document` viser det eksisterende J3B-workspace, herunder B10 efter checkpoint
- `finalControl` viser `FinalControlWorkspace`
- `completed` viser `Level2CompletedView`

Alle edits, D/K-valg og kontroller kalder de eksisterende J2A-transitions. Den returnerede `Level2StudentState` sendes gennem J3A's `applyLevel2StudentState`, som er den eneste autosavevej. En savefejl bevarer den nye state i memory, viser den globale advarsel og lader brugeren gemme den aktuelle state igen. Ingen J3C-komponent tilgår `localStorage` eller generatoren.

## Checkpoint pr. 30/6

Checkpointet viser progressionen som antal korrekte sektioner ud af fem. Sektionerne kan løses i vilkårlig rækkefølge og kontrolleres separat.

### Sektion A – Bruttoløn ÅTD, timelønnede

- Lønninger – timelønnede, saldo ÅTD
- Medarbejderpension ÅTD
- Medarbejder-ATP ÅTD
- Bruttoløn ÅTD

### Sektion B – Bruttoløn ÅTD, månedslønnede

- Lønninger – månedslønnede, saldo ÅTD
- Medarbejderpension ÅTD
- Medarbejder-ATP ÅTD
- Bruttoløn ÅTD

### Sektion C – Øvrige lønomkostninger ÅTD

- Arbejdsgiverpension ÅTD
- Arbejdsgiver-ATP ÅTD
- Feriepenge – timelønnede ÅTD
- Regulering af feriepengeforpligtelse ÅTD

### Sektion D – Samlede lønrelaterede omkostninger ÅTD

- Samlede lønrelaterede omkostninger

### Sektion E – Skyldige poster pr. 30/6

Sektionen viser beløb og et tilgængeligt D/K-valg for præcis:

1. 6920 Skyldig A-skat
2. 6930 Skyldig AM-bidrag
3. 6922 Skyldig pension
4. 6921 Skyldig ATP
5. 6923 Skyldige nettoferiepenge – FerieKonto
6. 6924 Feriepengeforpligtelse

Beløbsfelter er tekstinputs med `inputMode="numeric"`, rå elevstrenge og den neutrale placeholder `Beløb`. D/K indgår i J2A's kontrol af sektion E.

## Grading, locking og feedback

Hver sektion har sin egen kontrolknap og bruger `checkCheckpointSection`. En korrekt sektion viser `✓ Korrekt`, erstatter input med readonly elevværdier og kan ikke redigeres. En forkert sektion forbliver redigerbar og viser neutral feedback. En efterfølgende edit sætter status tilbage til `unchecked` gennem J2A.

Forkert checkpointinput afslører ingen korrekte beløb. Der findes ingen facitdata i placeholder, `title`, `aria-label`, skjult tekst, data-attribut eller CSS-klassenavn. Når alle fem sektioner er korrekte, udfører J2A automatisk overgangen til document B10; UI'et tilføjer ingen fortsætknap eller ekstra fase.

## ÅTD-specifikation

`Vis ÅTD-specifikation` åbner den fælles `Dialog` med readonly case-afledte delsummer og totaler for Pensioner og ATP:

- timelønnede, medarbejderandel
- timelønnede, arbejdsgiverandel
- månedslønnede, medarbejderandel
- månedslønnede, arbejdsgiverandel
- total

Dialogen kan ikke autofylde, grade eller ændre elevstate. Den har `role="dialog"`, `aria-modal`, tilgængelig titel, Escape-lukning, focus trap, keyboard-close og focus return.

## Slutkontrol

Efter korrekt B13 viser `FinalControlWorkspace` seks items med readonly slutsaldo fra casens final ledger:

1. Skyldig A-skat
2. Skyldig AM-bidrag
3. Skyldig pension
4. Skyldige nettoferiepenge – FerieKonto
5. Skyldig ATP
6. Feriepengeforpligtelse

Hvert item bruger det samme typed sæt af J2A reason IDs, som præsentationslaget mapper til dansk tekst. Ingen option markeres som korrekt i DOM. `selectFinalControlReason` håndterer valg og edit-reset; `checkFinalControlItem` håndterer grading. Forkert valg viser kun `Vælg en anden forklaring.`. Korrekt valg låses og viser `✓ Korrekt` med den valgte forklaring.

Når alle seks items er korrekte, sætter J2A `phase = completed` og `completed = true`.

## Completed view

Completed view viser `Niveau 2 gennemført`, variantnummer og en readonly oversigt over de seks slutsaldi. Nonzero saldi har D/K; nul vises som `0`. Der findes ingen checkpoint- eller final-control-inputs. App-shellens eksisterende `Til forsiden` og bekræftede `Nulstil opgave` genbruges; reset bevarer caseSnapshot og variant og kræver ingen generatorcall.

## Reload og write protection

Checkpoint-, B10-, final-control- og completed-state serialiseres af J2B-sessionen og restores gennem J3A-controlleren. Rå inputs, statuses og låse bevares. Resume bruger det gemte `caseSnapshot` og kalder ikke generatoren. Completed-state forbliver skrivebeskyttet i UI'et og følger J2A's no-op-semantik.

## Accessibility og responsive kontrakt

Alle checkpointinputs har synlige programmatiske labels. Sektioner har headings, D/K bruger radioknapper med legend, final-control-selects har labels, og status formidles med tekst samt farve. Feedback annonceres først ved kontrol og ikke ved hvert tastetryk.

Checkpoint og slutkontrol må ikke give vandret page-scroll ved 900×768, 1280×720, 1366×768 eller 1920×1080. Dialogen skal være inden for viewport. J3B's 1366×768-kontrakt for document-workspacet forbliver sticky bilag, tre T-kontokolonner, to komplette synlige kortrækker og ingen vandret overflow.
