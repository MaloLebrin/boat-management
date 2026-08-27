# Tests

## Backend (Japa)

Script: `pnpm test` (alias `node ace test`).
Répertoire: `tests/` (unit/functional, selon la suite).

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
