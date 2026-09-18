# J5B – Release v1

## Status

**LIVE.** V1 er publiceret som et offentligt GitHub-repository og deployet til GitHub Pages. V1 er nu frosset; der er ikke inkluderet v2-arbejde.

## Git og GitHub

- Repository: `https://github.com/Lars-viber/kontering-af-loen-paa-t-konti`
- Visibility: Public
- Branch: `main`
- Initial release commit: `6df96db` (`Release v1`)
- Origin: `https://github.com/Lars-viber/kontering-af-loen-paa-t-konti.git`
- Pages base: `/kontering-af-loen-paa-t-konti/`
- Live URL: `https://lars-viber.github.io/kontering-af-loen-paa-t-konti/`

## Deployment

- Workflow: `.github/workflows/pages.yml`
- Trigger: push til `main` samt `workflow_dispatch`
- GitHub Pages source: GitHub Actions
- Workflow status: success
- Build job: success
- Deploy job: success
- Workflow gates: `pnpm test`, `pnpm typecheck` og `pnpm build` før Pages-artifact og deploy.

## Kvalitetsgrundlag

- `generatorVersion = 1`
- `schemaVersion = 1`
- Fixture SHA-256: `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`
- J5A tests: 133/133 PASS
- J5A typecheck: PASS
- J5A build: PASS
- J5A generatorstress: 4.000/4.000 PASS
- J5A privacy/security-audit: PASS

## Live-verifikation

Den manuelle live smoke er bekræftet af brugeren: “det virker”. Det omfatter godkendelse af det live deployede site. Workflowets status er oplyst som grøn/success.

Denne opgavekontekst kunne ikke selv hente live-URL'en via webværktøjet, så der er ikke opfundet ekstra HTTP-, asset- eller browserresultater.

## Tracked og ignored releaseindhold

Kilde, tests, fixtures, docs, public assets, packagefiler og konfiguration trackes. `artifacts/` forbliver ignored sammen med dependencies, build-output, coverage, browseroutput, cache/temp og lokale environment-filer. Lokale audit-screenshots og logs er ikke del af det offentlige repository.

## Dokumentationscommit

Denne fil dokumenterer den faktiske release efter initial commit. Commit-hash, push-resultat, final Git-state og eventuel efterfølgende workflowstatus tilføjes i committen, når den er oprettet og pushed.
