# J0 V2.1 – Rapport

## 1. Resultat

Det faglige redesign for Niveau 2 V2.1 er dokumenteret og frosset. J0 har alene tilføjet fem nye dokumenter. Eksisterende specifikationer, produktkode, tests, fixtures, workflows og release-tags er ikke ændret.

V2.1 er nu defineret som en juniopgave med ni bilag, lønsystemets synlige tælleværker, manuel bilagsreview, ét samlet afstemningscheckpoint A-E og eksplicit afslutning.

## 2. Baggrund for redesignet

Redesignet løser fire faglige og didaktiske problemer i det tidligere forløb:

1. Bilagsrækken blev for lang og flyttede fokus fra lønkontering til gentagelse.
2. Eleven fik ikke en tydelig pause til at gennemgå et korrekt bilag før næste opgave.
3. Lønsystemets akkumulerede oplysninger blev ikke brugt tydeligt som synlige kildedata.
4. Checkpoint og efterfølgende slutkontrol overlappede hinanden og gjorde afslutningen unødigt kompleks.

Den nye kontrakt samler disse hensyn i et kortere forløb, hvor eleven både bogfører og dokumenterer, at bogføringen stemmer.

## 3. Beslutninger

### Aktiv opgave

- Bilag B1-B9 er aktive.
- B1-B3 afvikler maj-forpligtelser.
- B4-B8 bogfører juni-løn, arbejdsgiverandele og feriepenge.
- B9 regulerer feriepengeforpligtelsen.
- Efter B9 følger checkpoint A-E.

### Review og progression

- Korrekt kontrol åbner review af det aktuelle bilag.
- Kontrol flytter ikke eleven videre.
- **Gå videre** er en separat, eksplicit handling.
- Efter korrekt A-E åbnes checkpoint-review.
- **Afslut Niveau 2** er den eneste handling, der skaber completed-status.

### Tælleværker og afstemning

- Tælleværker på B4-B9 er synlige kildedata.
- De er mærket med indhold og periode.
- A-E sammenholder bogføring med lønsystem og eksterne kontroloplysninger.
- Alle krævede R1-differencer er 0 kr.

### Historiske koncepter

- **SUPERSEDED IN V2.1:** B10-B13 er ikke aktive.
- **SUPERSEDED IN V2.1:** `finalControl` er ikke aktiv.
- **SUPERSEDED IN V2.1:** Automatisk progression efter korrekt bilag er erstattet af manuel review.

Historiske dokumenter og tags bevares som dokumentation for tidligere releases.

## 4. Numerisk kontrol af R1

Der er gennemført en uafhængig talkontrol af alle bilag og centrale afstemningssummer.

| Kontrol | Resultat |
|---|---:|
| B1 | Debet 143.539 = kredit 143.539 |
| B2 | Debet 43.741 = kredit 43.741 |
| B3 | Debet 11.632 = kredit 11.632 |
| B4 | Debet 163.200 = kredit 163.200 |
| B5 | Debet 13.848 = kredit 13.848 |
| B6 | Debet 20.400 = kredit 20.400 |
| B7 | Debet 202.500 = kredit 202.500 |
| B8 | Debet 16.992 = kredit 16.992 |
| B9 | Debet 8.500 = kredit 8.500 |

Resultat: **9 af 9 bilag balancerer**.

| Tværgående kontrol | Resultat |
|---|---:|
| Driftssaldi pr. 30. juni | 2.506.874 |
| Checkpoint D, eksterne tælleværker | 2.506.874 |
| Difference checkpoint D | 0 |
| Afledt banksaldo | 1.086.225 D |
| Checkpoint A | 956.570 mod 956.570; difference 0 |
| Checkpoint B | 1.215.000 mod 1.215.000; difference 0 |
| Arbejdsgiverpension | 173.726 mod 173.726; difference 0 |
| Arbejdsgiver-ATP | 9.504 mod 9.504; difference 0 |
| Checkpoint E | Seks af seks forpligtelser har difference 0 |

### Frosset final state pr. 30/6

| Konto | Ultimosaldo |
|---:|---:|
| 2210 | 915.932 D |
| 2211 | 1.164.024 D |
| 2215 | 260.588 D |
| 2223 | 14.256 D |
| 2230 | 119.574 D |
| 2235 | 32.500 D |
| 5820 | 1.086.225 D |
| 6920 | 114.447 K |
| 6930 | 29.654 K |
| 6922 | 43.884 K |
| 6921 | 14.256 K |
| 6923 | 11.716 K |
| 6924 | 182.500 K |

De åbne kreditposter er tilsigtede juni-forpligtelser. De står åbne, fordi V2.1 stopper pr. 30/6 før juni-afregningen.

## 5. Versions- og sessionskontrakt

| Felt | Frosset værdi |
|---|---:|
| `rulesetYear` | 2026 |
| `rulesetVersion` | 2 |
| `generatorVersion` | 2 |
| `sessionSchemaVersion` | 2 |
| localStorage key | `kontering-af-loen-paa-t-konti.level2.session.v2` |

Der må ikke ske silent migration fra tidligere Niveau 2-sessioner. Ældre keys må ikke slettes automatisk.

Ved fund af en v1-session uden en v2-session skal et senere UI kunne forklare, at eleven har en gemt opgave fra en tidligere version, og at Niveau 2 er ændret til juni-afstemningsmodellen. Sletning kræver eksplicit brugerhandling.

Generatorversion 2 må indføre en ny deterministisk seed-kontrakt. Variant 42 behøver derfor ikke give de samme tilfældige medarbejderdata som variant 42 i V2.0.x. R1 er fortsat den håndfrosne sammenligningscase. Ny fixture og hash hører til implementationsfasen.

## 6. Dokumenthierarki og supersession

| Nyt autoritativt dokument | Område | Historiske kilder, der fortsat bevares |
|---|---|---|
| `V2_1_FAGLIG_SPECIFIKATION.md` | Fagligt scope, bilag, konti og sluttilstand | `NIVEAU2_FAGLIG_SPECIFIKATION.md`, `NIVEAU2_UI_KRAV.md` |
| `V2_1_REFERENCE_R1.md` | Numerisk R1-reference og facit | `NIVEAU2_REFERENCE_R1.md` |
| `V2_1_AFSTEMNING_OG_TAELLEVAERKER.md` | Tælleværker og checkpoint A-E | `J3C_NIVEAU2_CHECKPOINT_FINAL.md` |
| `V2_1_PROGRESSION_OG_SESSION.md` | State, progression, autosave og restore | `J2A_NIVEAU2_STATE.md`, `J2B_NIVEAU2_SESSION.md`, `J3B_NIVEAU2_WORKSPACE.md`, `V2_0_1_CHECKPOINT_UX_AUDIT.md` |

Ved modstrid gælder V2.1-dokumenterne alene for V2.1. De historiske dokumenter er ikke redigeret.

## 7. Konsistensaudit

| Emne | Specifikation | Reference | Afstemning | Progression | Status |
|---|:---:|:---:|:---:|:---:|---|
| Præcis B1-B9 | Ja | Ja | Ja | Ja | Konsistent |
| B10-B13 fjernet | Ja | Ja | Ja | Ja | Markerede som superseded |
| Ingen `finalControl` | Ja | Ja | Ja | Ja | Markerede som superseded |
| Manuel bilagsreview | Ja | Ikke numerisk relevant | Ja | Ja | Konsistent |
| Checkpoint A-E | Ja | Ja | Ja | Ja | Konsistent |
| Eksplicit afslutning | Ja | Ikke numerisk relevant | Ja | Ja | Konsistent |
| Synlige tælleværker | Ja | Ja | Ja | Sessionsunderstøttelse | Konsistent |
| R1-start- og slutsaldi | Ja | Ja | Ja | Ikke numerisk relevant | Konsistent |
| Versionsfelter | Ja | Reference følger V2.1 | Generatorversion omtalt | Ja | Konsistent |
| Ny session key uden migration | Ja | Ikke relevant | Ikke relevant | Ja | Konsistent |

Der er ikke fundet indbyrdes modstrid mellem de fire normative V2.1-dokumenter.

## 8. Git- og releasebeskyttelse

J0-arbejdet er udført på branchen `feature/v2.1-june-reconciliation`, oprettet fra opdateret `main`.

Følgende frigivne tags er verificeret før dokumentarbejdet og er ikke flyttet:

| Tag | Commit |
|---|---|
| `v2.0.1` | `d04850966046a6a6a1c63449dae7f10095ce4918` |
| `v2.0.0` | `5b6c95e9af04a38add609bd9d19fb0d9bb43a387` |
| `v1.0.0` | `634a0eb94f789b950879443b1fc6817aa501b479` |

Der er ikke committed, pushet, merget eller deployet i J0.

## 9. Filer oprettet i J0

- `docs/V2_1_FAGLIG_SPECIFIKATION.md`
- `docs/V2_1_REFERENCE_R1.md`
- `docs/V2_1_AFSTEMNING_OG_TAELLEVAERKER.md`
- `docs/V2_1_PROGRESSION_OG_SESSION.md`
- `docs/J0_V2_1_RAPPORT.md`

Ingen eksisterende filer er ændret. Der er ingen produktkode-, test-, fixture-, package-, workflow- eller releaseændringer.

## 10. Blockers og næste fase

Der er ingen faglige blockers i J0. Specifikationen er tilstrækkelig til, at senere jobs kan implementere domænemodel, generator, state, session, controller, UI og tests i kontrollerede trin.

Implementering er planlagt efterfølgende arbejde og er ikke en del af J0.
