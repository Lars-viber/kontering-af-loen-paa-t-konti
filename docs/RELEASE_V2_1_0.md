# Release v2.1.0

Niveau 2 er omlagt til en samlet juni-only øvelse med B1-B9 og afstemning pr. 30/6.

- Hvert korrekt bilag går til et eksplicit review, før eleven vælger at fortsætte.
- B1-B3 betaler relevante maj-forpligtelser, B4-B8 omfatter juni-lønbilag og relaterede poster, og B9 regulerer feriepengeforpligtelsen pr. 30/6.
- Afstemning A og B sammenholder timelønnede og månedslønnede med lønsystemets tælleværker.
- Afstemning C sammenholder bogføringen på pension, ATP og feriepenge med legitime tælleværker.
- Afstemning D er en intern kontrol af de seks lønrelaterede driftskonti.
- Afstemning E sammenholder seks balanceposter med eksterne kontroloplysninger.
- Tidligere godkendte bilag kan åbnes read-only, og alle elevens opgaveposteringer er synlige direkte i T-kontiene.
- Den afsluttede opgave kan gennemgås fra B1-B9 og Afstemning via **Se afsluttet opgave**.
- Niveau 2 har robust lokal session persistence med eksplicit restore og retry ved gemmefejl.
- Legacy V1-sessioner registreres, men migreres eller slettes ikke automatisk.
- Niveau 1 er fagligt og funktionelt uændret.

Releasekandidaten er deterministisk, client-side og beregnet til GitHub Pages under `/kontering-af-loen-paa-t-konti/`.