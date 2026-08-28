# Fix compilation TS de la spec browser mobile_field (#500)

**Date** : 2026-08-27

## Contexte

Le job CI `build` de la PR #566 échouait : `tsc` refusait `tests/browser/mobile_field.spec.ts` (le tsconfig backend n'embarque pas la lib DOM, donc `document`/`window`/`Element` sont inconnus dans les callbacks `page.evaluate`), plus un `distanceNm: 12` typé `number` alors que la colonne décimale est exposée en `string | null`.

## Modifications

- `tests/browser/mobile_field.spec.ts` :
  - les deux callbacks `page.evaluate(() => …)` sont remplacés par des évaluations **en string** (`HORIZONTAL_OVERFLOW_JS`, `TABLE_CARDS_STATE_JS`), même convention que `tests/browser/dark_mode.spec.ts` — aucun type DOM requis côté tsconfig ;
  - le résultat est typé via cast (`TableCardsState`) ;
  - `distanceNm: '12'` (string, conforme au modèle `NavigationLog`).

## Vérifications

- `tsc -b` sans erreur ;
- `pnpm test:e2e --files tests/browser/mobile_field.spec.ts` : 4 tests passés.
