# Barres de filtres de liste : composable `useListFilters`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (premier
composable).

## Problème

Les cinq barres de filtres de liste (bateaux, moteurs, clients, factures,
historique d'entretien) recopiaient le même socle : brouillon de recherche
`qDraft` synchronisé avec la prop, anti-rebond de 300 ms, remise à la page 1,
fusion des filtres partiels. Les barres clients et factures recopiaient en
plus la visite Inertia (`router.get` avec `preserveScroll`, `preserveState`,
`replace`) et le nettoyage des filtres vides (`|| undefined` clé par clé).

## Changement — comportement inchangé

- `inertia/composables/use_list_filters.ts` :
  - `useListFilters({ filters, apply, normalizeSearch?, debounceMs? })` →
    `{ qDraft, update, onSearchInput }`. Chaque liste garde sa convention de
    recherche via `normalizeSearch` : saisie telle quelle (moteurs, clients,
    factures), `undefined` si vide (bateaux), `trim()` (historique) ;
  - `compactQuery(query)` : `''` et `null` deviennent `undefined` ;
  - `visitList(url, query)` : visite de liste filtrée, historique remplacé.
- Les cinq barres adoptent le composable (−148 / +56 lignes).
  `@vueuse/core`, `router`, `ref` et `watch` ne sont plus importés par elles.
- `ClientListToolbar.onStatusChange` accepte `string | number`, comme la
  barre des factures : l'erreur vue-tsc préexistante sur ce fichier disparaît.
- Constat hors périmètre : `usePagination.goToPage` visite avec
  `data: { page }`, ce qui remplace toute la query string. Son seul appelant
  (notifications) n'a pas de filtre, donc rien n'est perdu aujourd'hui ; à
  corriger si une liste filtrée l'adopte.

## Tests

- **Caractérisation avant** : `tests/inertia/list_toolbars_filters.spec.ts`
  (10 tests, verts sur le code d'origine puis après migration) : anti-rebond,
  requête exacte de `/clients` et `/invoices` (filtres vides retirés, page 1,
  options de visite), suivi de la valeur serveur, filtres immédiats des
  sélecteurs et dates, charge utile émise par les barres bateaux, moteurs et
  historique avec leur normalisation respective.
- `tests/inertia/use_list_filters.spec.ts` (8 tests, écrits avant le
  composable) : brouillon initial et synchronisé, `update`, anti-rebond
  et page 1, `normalizeSearch`, délai configurable, `compactQuery`,
  `visitList`.
- Specs existantes des barres bateaux, moteurs et historique inchangées ;
  suite Vitest complète et `pnpm lint` verts.
