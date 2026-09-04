# 2026-09-04 — CI rouge : `node ace` cassé sur Node ≥ 24.20 et verrou de migration perdu

Les jobs `test-backend` et `test-e2e` échouaient sur la branche alors que les
mêmes commits passaient en local. Deux causes distinctes, toutes deux dans
l'outillage de test — aucun code applicatif en jeu.

## 1. `RuntimeException: Invalid command exported from "check_pricing.js" file. Invalid URL`

- **Symptôme.** `node ace test …` s'arrêtait au boot du kernel Ace, avant le
  premier test (job e2e : 43 s, job backend : 39 s). Reproduit en local en
  passant de Node 24.4 à Node 24.20 — les runners GitHub suivent `node-version: 24`,
  donc la dernière 24.x publiée : le décalage de version explique le « ça passe
  chez moi ».
- **Cause.** Ace valide la métadonnée de chaque commande de `commands/` avec
  `jsonschema@1.5.0`. Pour résoudre le `$ref` du schéma, la lib fait
  `new URL(ref, 'thismessage::/')`. Node ≥ 24.20 (et Node 26) refusent désormais
  de résoudre une référence en chemin absolu (`/undefined#/definitions/CommandMetaData`)
  contre une base au chemin opaque : c'est un échec au sens de la spec WHATWG, et
  `new URL` lève `Invalid URL`. Les versions antérieures l'acceptaient.
  Conséquence : **toute** commande `node ace` (serve, migrations, build, tests)
  est cassée sur ces versions de Node, pas seulement les tests.
- **Correctif.** `patches/jsonschema@1.5.0.patch` (via `patchedDependencies`
  pnpm) : `Validator.prototype.resolve` lit le fragment directement dans la
  chaîne au lieu de re-parser la référence. `jsonschema@1.5.0` est la dernière
  version publiée et `@adonisjs/ace@14.1.1` embarque toujours le même code —
  il n'y a pas de montée de version qui corrige le problème.

## 2. `Exception: Migration completed, but unable to release database lock`

- **Symptôme.** 299 tests backend en échec d'un coup à partir de
  `tests/functional/maintenance/maintenance_log_pdf.spec.ts`, sans jamais
  repartir (run CI #33843733392).
- **Cause.** `testUtils.db().truncate()` rejoue un `migration:run` avant
  _chaque_ test : sur ~1900 tests, autant de `pg_advisory_lock(1)` /
  `pg_advisory_unlock(1)`. Le pool Lucid garde plusieurs connexions ouvertes ;
  dès que la prise et le relâchement ne tombent pas sur la même connexion,
  `pg_advisory_unlock` renvoie `false` et Lucid lève. Une fois le décalage
  installé, il persiste pour tous les tests suivants.
- **Correctif.** Nouvel helper `tests/utils/db.ts` → `truncateDb()`, qui exécute
  seulement `db:truncate`. Les migrations restent jouées une fois pour toutes
  par le hook global de `tests/bootstrap.ts`. Les 172 appels à
  `testUtils.db().truncate()` (131 fichiers de tests functional, integration et
  browser) ont été remplacés.

- **Portée production.** Le correctif doit suivre l'image Docker, qui lance
  `node ace migration:run` au démarrage : le `Dockerfile` copie `patches/` avant
  `pnpm install`, et `adonisrc.ts` ajoute `pnpm-workspace.yaml` + `patches/**`
  aux `metaFiles`, sans quoi le `pnpm install --prod --frozen-lockfile` du stage
  runner ne retrouve pas le `patchedDependencies` déclaré dans le lockfile.

- **Tests.** Suites complètes rejouées sous Node 24.20 : backend
  `node ace test unit integration functional` (1855 passés, ~5 min, contre 6 min
  avant), e2e `node ace test browser` (32 passés), front `pnpm test:inertia`
  (1716 passés), plus `pnpm lint`, `pnpm build`, `pnpm check:sw`, et un `pnpm install --prod --frozen-lockfile` depuis `build/` suivi de `node ace.js list` pour vérifier que le kernel Ace boote dans l'image de production.
