# Kontering af løn på T-konti

En statisk træner med to niveauer:

- Niveau 1: grundlæggende kontering af et summeret lønbilag på T-konti.
- Niveau 2: avanceret lønkontering med 13 bilag, periodisering, afstemning pr. 30/6 og slutkontrol.

Opgaverne er deterministiske. Niveau 1 og Niveau 2 gemmer hver sin session lokalt i browseren, så arbejdet kan fortsættes efter refresh eller et besøg på forsiden.

Stack: React, TypeScript og Vite.

Live: https://lars-viber.github.io/kontering-af-loen-paa-t-konti/

Lokal udvikling:

    pnpm install
    pnpm dev

Kontrol:

    pnpm test
    pnpm typecheck
    pnpm build
