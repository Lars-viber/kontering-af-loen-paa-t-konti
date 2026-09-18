# J3 – Funktionel lønøvelse

## Layout og datakilder

Exercise view bruger det eksisterende blå designsystem og består af en kompakt header, instruktion, lønbilag, kontoplan, videogennemgang, otte T-konti, elevtotaler og kontrolområdet. På desktop står lønbilag og kontoplan ved siden af hinanden, mens T-kontiene ligger i tre kolonner. Layoutet stacker ved mindre bredder og bruger almindelig sidescroll.

Lønbilaget læser udelukkende `session.exerciseSnapshot.payslipTotals` og `employeeCount`. Det viser ingen medarbejderrecords og regenererer aldrig opgaven. Den centrale `formatAmount` bruger `Intl.NumberFormat('da-DK')` til hele kroner. Minusfortegn på ATP, pension, AM-bidrag og A-skat er kun præsentation; snapshotværdierne forbliver positive.

Kontoplanen læser snapshotets otte konti i J1-rækkefølge og er read-only. Der findes ingen drag/drop, dropdown eller ekstra konti.

## Videogennemgang

Videosektionen er lukket som standard. En rigtig button styrer `aria-expanded` og `aria-controls`. Iframen til `https://www.youtube.com/embed/A6XmMtNr5mM` mountes kun, når sektionen åbnes, har titlen `Videogennemgang af lønbogføring` og tillader fullscreen. Den fulde bemærkning om forældede ATP-satser og anderledes kontoplan vises sammen med videoen.

## T-konti og raw input

Hver konto viser kontonummer, navn, type og en tydelig T-form med Debet og Kredit. Inputs er `type="text"`, bruger `inputMode="numeric"`, har autocomplete slået fra og har en programmatisk label med konto, navn og side.

Inputværdien er altid den præcise `studentState.rawInput`. Der sker ingen formattering under indtastning. Hver meningsfuld ændring går gennem J2's immutable `updateAndSaveStudentField`, opdaterer `savedAt`, gemmer sessionen og opdaterer React-state. Hvis storage fejler, beholdes den aktuelle React-state, og en diskret fejl vises.

J1-parseren bruges både til umiddelbar formatfeedback og ved kontrol. Et nonblank ugyldigt beløb viser `Ugyldigt beløb`; faglig korrekt/forkert-status vises først efter `Kontrollér`.

## Central check-transaction

`src/session/exercise.ts` indeholder ét samlet checkflow:

1. Alle 16 rå inputs parses med J1's `parseAmount`.
2. Gyldige værdier samles til et elevsvar.
3. Svaret grades mod snapshotets interne `answerKey` med J1's `gradeAnswer`.
4. Ugyldige inputs tvinges til `incorrect`, også når facit er 0.
5. Korrekte felter bliver `correct + locked`; forkerte bliver `incorrect + unlocked`.
6. `completed` beregnes fra alle 16 felter.
7. Sessionen opdateres immutable, deep-freezes, får nyt `savedAt` og gemmes én gang.

Blank parses som 0. Ved første blanke kontrol låses derfor de otte zero-facit-felter, mens de otte nonzero-felter forbliver redigerbare. Debet og Kredit vurderes uafhængigt. Recheck bevarer allerede korrekte felter og kontrollerer rettede felter igen. Når et forkert felt redigeres, nulstiller J2-helperen status til `unchecked`.

UI viser kun `✓ Korrekt`, `Forkert – ret beløbet` eller `Ugyldigt beløb`. Forventet værdi, answer key og facitforklaringer gengives aldrig i DOM, attributter eller tooltips.

## Elevtotaler og balancestatus

Elevtotalerne beregnes kun fra elevens aktuelle inputs. Blank er 0, og både fagligt korrekte og forkerte gyldige beløb tæller med. Hvis en side har et nonblank ugyldigt beløb, vises `—` for den side, en formatbesked vises, og balancestatus skjules.

Når begge sider er valide, giver 0/0 ingen status, forskellige positive totaler giver `Balancerer ikke`, og ens positive totaler giver `Balancerer`. UI forklarer, at balance kun betyder lige Debet/Kredit og ikke korrekt kontering. Ved completion er begge sider lig bruttolønnen.

## Reset, completion og restore

`Nulstil svar` er disabled for en helt tom, ukontrolleret session. Ved eksisterende input eller status kræves en custom confirmation. Bekræftelse bevarer variant, generatorversion og det samme snapshot, opretter 16 blanke felter, sætter `completed: false`, opdaterer `savedAt` og gemmer én gang. Generatoren kaldes ikke.

Completion sættes atomisk sammen med de 16 korrekte, låste felter. Den aktuelle exercise view viser succesbeskeden og skjuler `Kontrollér`. En separat completed-visning og completed-menu-card er fortsat afgrænset til J4.

Til hovedmenu, Continue, reload og completion-restore bruger den gemte session og det autoritative snapshot uden generatorcall. Videoens åbne/lukkede state er bevidst ephemeral.
