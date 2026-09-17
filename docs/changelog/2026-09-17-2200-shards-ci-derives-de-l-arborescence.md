# 2026-09-17 — Shards de CI dérivés de l'arborescence (#687)

Le job `test-backend` découpait la suite fonctionnelle en shards dont les filtres `--files`
étaient une **allowlist de répertoires** écrite à la main dans `.github/workflows/ci.yml`.
Créer `tests/functional/reservations/` produisait des tests qui passaient en local — `pnpm test`
prend toute la suite — et ne tournaient **jamais** en CI, sans qu'aucun job n'échoue. C'est
l'angle mort qui bloquait toutes les campagnes de tests de l'épic #686, puisqu'elles créent de
nouveaux répertoires.

- **Cause.** Le flag `--files` de Japa ne supporte pas le glob récursif `**` ; la parade était
  d'énumérer les répertoires à la main, et rien ne signalait un répertoire oublié.
- **Correctif.** `scripts/ci_test_shards.mjs` génère la matrice depuis `tests/functional/`. Le
  job `test-backend-matrix` l'exécute et publie le JSON, que `test-backend-shards` consomme via
  `fromJson`. Un nouveau répertoire est shardé sans toucher au workflow.
- **Répartition au fichier près.** `tests/functional/boats/` pèse ~40 % des tests fonctionnels :
  tant qu'il était l'unité indivisible d'un shard, il fixait le chemin critique quel que soit le
  nombre de shards. Le packing se fait désormais fichier par fichier, pondéré par le nombre de
  `test(...)`, par LPT — le shard le plus lourd passe de 611 à ~323 tests. Les filtres émis sont
  des chemins relatifs complets, qui désignent un fichier unique (Japa retient un fichier dès que
  son chemin absolu `endsWith()` le filtre), là où un filtre par segment déborde.
- **Pour raccourcir la CI.** Augmenter `FUNCTIONAL_SHARD_COUNT` dans le script : la matrice, les
  noms de jobs et les filtres suivent. `node scripts/ci_test_shards.mjs --explain` affiche la
  répartition, `--shards=N` simule un autre découpage.
- **Tests.** `tests/unit/hygiene/ci_shards.spec.ts` rejoue l'algorithme de filtrage de Japa
  (`FilesManager#grep`) sur les filtres émis et échoue en nommant tout spec non couvert ou couvert
  deux fois. Le balayage du disque y est réimplémenté plutôt qu'importé du générateur : sinon la
  garde hériterait de l'angle mort qu'elle surveille (vérifié par mutation — sortir un répertoire
  du scan du générateur laissait le test vert tant qu'il partageait sa source).
- **Dette documentaire purgée au passage.** `CLAUDE.md` annonçait « SQLite pour les tests »
  (c'est PostgreSQL partout) ; `.env.test` pointait le Postgres de **dev** (`5431`,
  `3d-website_test`) au lieu du service `postgres_test` (`5432`, `test`), donc `pnpm test` local
  échouait sur une base inexistante ; `.claude/agents/tests.md` enseignait
  `withGlobalTransaction()` pour le fonctionnel (c'est `truncateDb()`, `tests/bootstrap.ts`
  explique pourquoi) et `@testing-library/vue`, qui n'est pas installé. `docs/dev/testing.md` et
  `docs/dev/setup.md` décrivent maintenant les quatre suites, la base de test et la sémantique
  exacte de `--files`.
