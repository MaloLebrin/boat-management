# Pagination : changer de page ne vide plus les filtres

**Date** : 2026-09-17 — correction relevée en marge du plan de refactorisation
TDD (vague 3.5), hors périmètre des composables extraits.

## Problème

`usePagination().goToPage(page)` visitait la liste avec `data: { page }`. Sur une
visite **GET** Inertia, `data` n'est pas un ajout à la query string : c'est la
query string envoyée. Passer `{ page }` seul revenait donc à visiter
`/liste?page=3` — la recherche et les filtres que le serveur venait de rendre
(`?q=quai&status=draft`) disparaissaient au premier clic sur « page suivante ».

Le défaut était **latent** : le seul appelant aujourd'hui,
`pages/notifications/index.vue`, n'a pas d'autre paramètre que `page`, et son
contrôleur ne valide que celui-là. Rien ne se voit donc dans l'app actuelle —
mais le composable est générique, et le prochain écran qui branche
`BasePagination` sous une barre `useListFilters` aurait perdu ses filtres sans
qu'aucun test ne s'en aperçoive.

## Changement

- `inertia/composables/use_pagination.ts` : `goToPage` réémet la query de l'URL
  courante avec la nouvelle page — `data: { ...currentQuery(), page }`.
  - `currentQuery()` lit `window.location.search` : ce sont les filtres tels que
    le serveur a rendu la page, pas un état local à resynchroniser ;
  - la **nouvelle page gagne** sur le `page` de l'URL courante (elle est
    fusionnée en dernier) ;
  - un paramètre répété (`?status=draft&status=sent`) est conservé en liste, au
    lieu de se réduire à sa dernière valeur.
- Aucun changement d'API : `usePagination(meta, baseUrl?)` et
  `{ currentPage, lastPage, total, perPage, hasPreviousPage, hasNextPage, goToPage }`
  sont inchangés, et l'écran des notifications ne bouge pas.

## Tests

- `tests/inertia/pagination_query_string.spec.ts` (6 tests), écrits **avant** le
  correctif et rouges sur le code d'origine pour les trois cas du défaut :
  filtres de l'URL courante conservés, nouvelle page prioritaire sur l'ancienne,
  page seule quand l'URL n'a pas de filtre, filtres conservés quand l'URL est
  déduite de `window.location`, paramètre répété gardé en liste, `preserveScroll`
  et `preserveState` toujours envoyés.
- `tests/inertia/use_pagination.spec.ts` (13 tests) inchangée et verte : ses
  assertions portaient sur une URL sans query, le correctif ne les touche pas.
- Suite Vitest complète (2455 tests), `pnpm lint` et `pnpm typecheck`
  (197 erreurs préexistantes, aucune nouvelle) verts.
