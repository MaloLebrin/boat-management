# Tests

## Backend (Japa)

Script: `pnpm test` (alias `node ace test`).
Répertoire: `tests/` (unit/functional, selon la suite).

**CI** : le job `test-backend` tourne en 4 shards parallèles (`unit-integration`,
`functional-boats`, `functional-core`, `functional-other`), équilibrés par nombre de
fichiers via le flag natif `--files` de Japa, chacun avec son propre conteneur Postgres
éphémère. Un job d'agrégation `test-backend` (`needs` sur les 4 shards) reste l'unique
check requis pour la protection de branche. En local, `pnpm test` est inchangé et lance
toujours `unit`, `integration` et `functional` en séquentiel.

Le flag `--files` matche par segment de chemin et **ne supporte pas `**`** : `"dossier/\*"`cible tous les fichiers directement sous ce dossier (un seul niveau) — voir`.github/workflows/ci.yml` pour le détail des filtres par shard.

## Frontend Inertia (Vitest)

Script: `pnpm test:inertia` (alias `vitest run`).
Répertoire: `tests/inertia` (selon la structure du repo).

## Navigateur (Japa + Playwright)

Script : `pnpm test:e2e` (alias `node ace test browser`). Répertoire : `tests/browser`.

### Viewport mobile (#500)

`tests/browser/mobile_field.spec.ts` valide les écrans terrain en 390×844 : absence de
débordement horizontal, bottom nav visible sous `lg` seulement, replis carte des tableaux,
drawer pleine hauteur.

**Limite à connaître** : le `browserContext` injecté par `@japa/browser-client` est créé **sans
options** — impossible d'y passer `viewport`, `isMobile` ou `hasTouch`. La voie fiable est
`page.setViewportSize({ width, height })` après `visit()`. Conséquence : les breakpoints CSS sont
validés, mais **le tactile n'est pas émulé** — les cibles tactiles (#494) ne sont pas testées
comme un vrai doigt les atteindrait, et les variantes `pointer-coarse:` ne s'activent pas (le
pointeur émulé reste `fine`). Une mesure réelle demanderait un contexte Playwright dédié hors
`@japa/browser-client`.

## Typecheck / lint

- `pnpm typecheck`
- `pnpm lint`
