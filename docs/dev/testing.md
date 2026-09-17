# Tests

## Suites

| Suite            | Répertoire          | Commande            | Isolation DB                             |
| ---------------- | ------------------- | ------------------- | ---------------------------------------- |
| `unit`           | `tests/unit`        | `pnpm test`         | aucune (pas de DB)                       |
| `integration`    | `tests/integration` | `pnpm test`         | `testUtils.db().withGlobalTransaction()` |
| `functional`     | `tests/functional`  | `pnpm test`         | `truncateDb()` (`tests/utils/db.ts`)     |
| `browser`        | `tests/browser`     | `pnpm test:e2e`     | `truncateDb()`                           |
| Inertia (Vitest) | `tests/inertia`     | `pnpm test:inertia` | —                                        |

`pnpm test` lance `unit`, `integration` et `functional`. **La suite `browser` n'en fait pas
partie** : elle demande Chromium (`pnpm exec playwright install chromium`) et se lance à part
avec `pnpm test:e2e`. En CI elle a son propre job, `test-e2e`.

La base de test est le service `postgres_test` du `docker-compose.yml` (profil `test`, port
hôte `5432`) : `pnpm test:db:up` avant, `pnpm test:db:down` après. Voir `docs/dev/setup.md`.

### Pourquoi `truncateDb()` et pas une transaction globale

Pour `functional` et `browser`, le serveur HTTP tourne bien dans le même process, mais ses
handlers passent par des **connexions DB distinctes** : une transaction globale ouverte côté
test leur est invisible, et les données créées par le test n'existent pas pour le handler.
D'où le truncate entre chaque test. `tests/bootstrap.ts` porte ce choix dans `configureSuite`.

## CI — shards générés depuis l'arborescence

Le job `test-backend` tourne en shards parallèles, chacun avec son propre conteneur Postgres
éphémère. Un job d'agrégation `test-backend` (`needs` sur la matrice et sur les shards) reste
l'unique check requis pour la protection de branche.

La matrice **n'est pas écrite à la main** : le job `test-backend-matrix` exécute
`scripts/ci_test_shards.mjs`, qui balaie `tests/functional/` et répartit les specs. Avant
(#687), les filtres `--files` étaient une allowlist de répertoires — créer
`tests/functional/reservations/` produisait des tests qui passaient en local et ne tournaient
jamais en CI, sans qu'aucun job n'échoue.

```bash
node scripts/ci_test_shards.mjs --explain     # la répartition, lisible
node scripts/ci_test_shards.mjs               # le JSON consommé par la CI
node scripts/ci_test_shards.mjs --shards=6    # simuler un autre découpage
```

**Répartition au fichier près, pas au répertoire.** `tests/functional/boats/` pèse à lui seul
~40 % des tests fonctionnels : tant qu'il était l'unité indivisible d'un shard, il fixait le
chemin critique quel que soit le nombre de shards. Le packing se fait donc fichier par
fichier, pondéré par le nombre de `test(...)` de chaque fichier, par LPT.

**Si la CI devient trop longue** : augmenter `FUNCTIONAL_SHARD_COUNT` dans
`scripts/ci_test_shards.mjs`. Rien d'autre à toucher — la matrice, les noms de jobs et les
filtres suivent. Le plancher reste l'installation des dépendances et le démarrage de Postgres
par shard (~1 min), donc au-delà d'une poignée de shards le gain se tasse.

`tests/unit/hygiene/ci_shards.spec.ts` garde l'invariant : il rejoue l'algorithme de filtrage
de Japa sur les filtres émis et échoue en **nommant** tout spec qui ne serait couvert par
aucun shard (ou par plusieurs).

### Sémantique de `--files`

Japa (`FilesManager#grep`) retient un fichier si son chemin absolu `endsWith()` le filtre, ou
si chaque segment du filtre, lu depuis la fin, est un **suffixe** du segment correspondant du
chemin privé de son `.spec.ts`. Deux conséquences :

- un chemin relatif complet (`tests/functional/boats/engines.spec.ts`) désigne exactement un
  fichier — c'est ce qu'émet le générateur ;
- un filtre par segment déborde : `boats/engines` matche aussi `boats/boat_engines`, et
  `dossier/*` ne couvre qu'**un seul niveau** (pas de glob récursif `**`).

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
