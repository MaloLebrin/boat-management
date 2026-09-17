# 2026-09-17 — CI : découpage du job `test-backend` en 4 shards parallèles

Le job `test-backend` lançait `unit`, `integration` et `functional` (256 fichiers de
specs au total) en série sur un seul runner. `functional` (153 fichiers, cycles HTTP+DB
réels avec `truncate`) domine largement le temps du job, `boats/` à lui seul pesant
50 fichiers (33 % de `functional`).

- **Cause.** Un seul job séquentiel pour trois suites de coût très différent, sans
  parallélisation malgré des jobs déjà indépendants (`lint`, `build`, `test-frontend`,
  `test-e2e`) au niveau CI.
- **Correctif.** `test-backend` devient un job matriciel (`test-backend-shards`) à
  4 shards équilibrés par nombre de fichiers (seule donnée disponible, aucune mesure de
  timing n'existant) : `unit-integration` (103 fichiers, aucun `--files` nécessaire),
  `functional-boats` (50), `functional-core` (58, billing/settings/marketing/auth/
  invoices/maintenance/ports/routing), `functional-other` (45, 18 dossiers restants +
  `contact.spec.ts`/`simulator.spec.ts` à la racine de `tests/functional/`). Chaque shard
  a son propre conteneur Postgres éphémère. Le flag natif Japa `--files` matche par
  segment de chemin et ne supporte pas `**` : les filtres utilisent `"dossier/*"` (un
  seul niveau) plutôt qu'un glob récursif, avec un ancrage à 2 segments
  (`functional/contact`, `functional/simulator`) pour les 2 fichiers racine, sinon un
  filtre nu comme `simulator` matcherait aussi `boats/boat_simulator.spec.ts`. Un job
  d'agrégation `test-backend` (no-op, `needs` sur les 4 shards) préserve un unique check
  requis pour la protection de branche.
- **Tests.** `pnpm test` en local est inchangé (toujours `unit integration functional`
  en séquentiel). Couverture vérifiée par diff entre la liste complète des 256 fichiers
  et l'union des filtres des 4 shards (aucun trou, aucun doublon). Comportement du flag
  `--files` vérifié en conditions réelles (Postgres local) : `unit --files="helpers/*"`
  exécute bien seulement les 173 tests de `tests/unit/helpers/`.
