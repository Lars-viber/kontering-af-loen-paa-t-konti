# J3B – Niveau 2 bilagsworkspace og T-konti

## Afgrænsning

J3B implementerer arbejdsfladen for alle document-faser B1–B13. Checkpoint, slutkontrol og completed har sikre, read-only placeholders og får deres formularer i J3C. Niveau 1 og de frosne Niveau 2-lag i `src/domain/level2`, `src/level2/state`, `src/level2/session` og `src/level2/controller` er fagligt uændrede.

## Routing og controllerintegration

`App` viser `Level2Workspace`, når en valid Niveau 2-session er åben. Alle elevhandlinger bruger de eksisterende J2A-transitions:

- `addStudentPostingRow`
- `editStudentPostingRow`
- `removeStudentPostingRow`
- `checkActiveDocument`

Det returnerede `Level2StudentState` sendes én gang gennem J3A’s `applyLevel2StudentState`. Workspace-komponenterne bruger ikke `localStorage`, generatoren eller et autosave-`useEffect`. En savefejl beholder den nye state i memory, viser den globale warning og kan gemmes igen med J3A’s retry.

## Layout

Desktoplayoutet består af et sticky, read-only bilagspanel til venstre og en scrollende konto-workarea til højre. Bilagspanelet bruger `position: sticky`, viewportbegrænset `max-height` og egen vertikal overflow ved lav højde. T-kontokort har ingen permanent intern scrollbar.

Gridkontrakten er:

- mindst 1800 px: 4 kolonner
- 1280–1799 px: 3 kolonner
- 900–1279 px: 2 kolonner
- under 900 px: 1 kolonne og bilagspanelet over kontiene

Alle 13 konti vises på hvert bilag i `LEVEL2_ACCOUNTS`’ frosne rækkefølge. Kort filtreres, prioriteres eller markeres aldrig ud fra facit.

## Bilag B1–B13

`documentPresentation.ts` afleder read-only dokumentdata fra `caseSnapshot`:

- B1: betaling af A-skat og AM-bidrag vedrørende maj
- B2: pension vedrørende maj
- B3: FerieKonto vedrørende maj
- B4: lønsammendrag for timelønnede
- B5: arbejdsgiverbidrag for timelønnede
- B6: feriepenge for timelønnede
- B7: lønsammendrag for månedslønnede
- B8: arbejdsgiverbidrag for månedslønnede
- B9: bogført saldo før regulering og systemopgjort saldo, uden difference
- B10: ATP for første kvartal
- B11: A-skat og AM-bidrag vedrørende juni
- B12: pension vedrørende juni
- B13: FerieKonto vedrørende juni

Præsentationslaget bruger ikke `expectedPostings` og viser ingen konto-, side- eller facithints. Mappingen testes mod både R1 og generatorvariant 42.

## T-konti og elevrækker

Hvert kort viser kontonummer, navn, Drift/Balance, startsaldo, Debet/Kredit, elevrækker og aktuel saldo. Drift bruger labelen `Saldo ÅTD t.o.m. 31/5`; balance bruger `Saldo pr. 1/6`. Nonzero saldi vises med D/K og danske tusindtalsseparatorer.

`+ Postering` opretter en blank elevrække på den valgte konto og side. Beløbsfeltet er et tekstinput med `inputMode="numeric"`, bevarer rå dansk indtastning og viser ingen facitplaceholder. Unlocked rækker kan redigeres og fjernes.

Kontrol udføres udelukkende af J2A. En korrekt konto/side-gruppe bliver read-only og viser `✓ Korrekt`; modsatte side og øvrige grupper forbliver uafhængige. En forkert gruppe, som eleven selv har oprettet meningsfulde rækker i, viser `Ret postering`. En efterfølgende edit nulstiller gruppens status via J2A.

Manglende expected-grupper udpeges aldrig på T-kontiene. Bilagspanelet viser kun den generelle tekst: `Bilaget er ikke færdigt. Der mangler eller er fejl i en eller flere posteringer.`

## Elevtotaler og saldo

Bilagspanelets Debet/Kredit-totaler kommer fra `selectActiveDocumentTotals` og bruger kun elevrækker. Ingen rækker giver ingen aggressiv status. Positive ens totaler viser `Balancerer`; forskellige totaler viser `Ikke i balance`; et ugyldigt meningsfuldt beløb viser `Kontrollér ugyldigt beløb`.

Aktuel saldo afledes fra startsaldo plus elevens faktiske rækker i completed dokumenter og gyldige rækker i det aktive dokument. Pending dokumenters facit indgår ikke. Et meningsfuldt ugyldigt aktuelt beløb giver `Kan ikke beregnes`.

## Historik

Approved history består af elevens egne rækker i korrekte grupper fra completed dokumenter og eventuelle korrekte grupper i aktivt dokument. Splitrækker bevares som de faktisk blev indtastet og erstattes ikke af en summeret facitlinje.

Kortet viser højst tre seneste historikrækker. Hvis der findes ældre rækker, åbner `+ N tidligere posteringer` en read-only dialog med startsaldo, alle approved rækker i dokumentrækkefølge, side, beløb og løbende saldo.

## Overlays og accessibility

Bilagspanelet åbner:

- kontoplan med alle 13 konti i frossen rækkefølge
- Niveau 1-videogennemgang med tydelig afgrænsning til repetition
- fuld kontohistorik

Videoens iframe mountes kun, mens dialogen er åben. Den fælles `Dialog` har `role="dialog"`, `aria-modal`, tilgængeligt navn, Escape-lukning, focus trap, keyboard-close og focus return. Gruppe- og bilagsstatus har tekst/ikon og formidles ikke kun med farve.
