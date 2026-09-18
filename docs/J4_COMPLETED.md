# J4 – Completion og afsluttet opgave

## Completion-kriteriet

J4 indfører ingen ny completion-model. `completed = true` kommer fortsat fra J3's atomiske check-transaction og kan kun opstå sammen med 16 felter, der er `correct` og låste. `schemaVersion` er fortsat 1, og completed-visningen er almindelig ephemeral React view-state.

Efter sidste korrekte kontrol bliver brugeren i den eksisterende exercise view. Alle felter er låste, og `Kontrollér` samt `Nulstil svar` er skjult. Succesområdet tilbyder `Se afsluttet opgave`, `Til hovedmenu` og `Generér ny opgave`. Reset-handleren har desuden en defensiv completed-guard, så completed state ikke kan gøres ufærdig gennem en skjult sti.

## Completed menu

En restored completed session vises på hovedmenuen med tekststatus `Afsluttet opgave`, variant, medarbejderantal og knappen `Se afsluttet opgave`. `Fortsæt opgaven` vises kun for ufærdige sessioner. Åbning, tilbage-navigation og genåbning ændrer hverken session, `savedAt` eller snapshot og kalder ikke generatoren.

`Generér ny opgave` og `Bestemt variant` erstatter en completed session direkte uden unfinished-dialog. Det gælder også samme bestemte variant: snapshotdata bliver deterministisk identiske, mens elevstate bliver ny, blank, unchecked og ulåst. Ufærdige sessioner kræver fortsat confirmation.

## Samlet read-only view

Completed view bruger:

- `exerciseSnapshot` til variant, generatorversion, medarbejderantal, lønbilag og kontoplan.
- `studentState` til alle viste Debet/Kredit-posteringer.

`answerKey` bruges ikke som display-source. Elevens rå tekst parses og normaliseres med de eksisterende J1/UI-funktioner, så både `405908` og `405.908` vises som `405.908`. Zero- og blanke sider vises konsekvent som `–`.

De otte completed T-konti består af almindelige tekst-/displayelementer. De indeholder ingen inputs, disabled-inputs, parserfeedback, røde fejlmarkeringer, `Kontrollér` eller `Nulstil svar`. Styling er neutral; succes kommunikeres samlet over visningen.

Elevtotalerne beregnes fortsat fra `studentState`. Ved completed variant 42 vises Debet og Kredit begge som 433.375 samt status `Balancerer`. Forklaringsteksten fastholder, at balance og faglig completion er to forskellige kontroller.

Completed view udelader videoen for et mere fokuseret regnskabsresultat. Navigationen tilbyder `Til hovedmenu` og `Generér ny opgave`. Et browser-refresh må returnere til menuen, hvor completed-card straks giver adgang igen.

## Responsive og visuel adfærd

Headeren er fortsat 60 px og viser variant, generatorversion, en tekstlig completed-status og hovedmenuknappen. Bilag, kontoplan, video og editable T-konti beholder J3's kompakte mål og højrestillede tabular numbers.

Ved 1280, 1366 og 1920 bruger T-kontiene tre kolonner. Dette gav bedst balance i browserauditten: kontonavne, typer, labels, værdier og statusser er læsbare uden vandret scroll. Under 980 px bruges to kolonner. Ved 900 px stacker bilag og kontoplan, mens T-kontiene forbliver i to brugbare kolonner. Ved endnu smallere bredder går layoutet til én kolonne.

Browserauditten dækker menu, normal exercise, video, partial check, invalid total, completed exercise, completed overview, completed menu, restore, ny/bestemt/samme variant og unfinished confirmation. Alle målte states har `scrollWidth <= clientWidth`, 0 console errors og 0 React warnings.
