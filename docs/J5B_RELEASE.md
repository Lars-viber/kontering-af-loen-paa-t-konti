# J5B – Release

## Status

Releasekandidaten er klargjort til publicering. Denne journal opdateres med faktisk commit, push-, Pages- og live-status, når de eksterne GitHub-trin er gennemført.

## Releasekonfiguration

- Repository: `https://github.com/Lars-viber/kontering-af-loen-paa-t-konti`
- Branch: `main`
- Pages base: `/kontering-af-loen-paa-t-konti/`
- Forventet live URL: `https://lars-viber.github.io/kontering-af-loen-paa-t-konti/`
- Workflow: `.github/workflows/pages.yml`; push til `main` og manuel `workflow_dispatch`.
- Gates før artifact upload: test, typecheck og production build.
- Artifact: `dist/` via den officielle GitHub Pages Actions-model.

## Releaseindhold

Kilde, tests, fixtures, docs, public assets, packagefiler og konfiguration trackes. Lokale dependencies, build-output, coverage, browseroutput, cache/temp, environment-filer og `artifacts/` ignoreres.

Den seneste pre-Git-audit bekræfter fixture SHA-256 `c281b81d94d266c7091cdee262fabb97faada31417a0782725ea245860b23e25`, `generatorVersion = 1` og `schemaVersion = 1`.

## Afventende eksterne trin

- Git identity og første commit
- Repository-remote og push
- Aktivering af GitHub Actions som Pages-kilde, hvis nødvendigt
- Workflow- og live-smoke-status
