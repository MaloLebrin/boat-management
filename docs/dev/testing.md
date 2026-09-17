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

## Tester l'ACL : deux niveaux, et pourquoi (#690)

Une policy se teste à **deux** endroits, et confondre les deux donne des tests qui passent sans
rien prouver.

### Niveau 1 — les méthodes de policy, en suite `unit`

Une policy ne touche jamais la base : `OrgScopedPolicy.can()` ne lit que `user.organizationId`
puis appelle `user.hasPermission()`, et tous les modèles y sont importés en `import type` (donc
effacés à la compilation). Un faux utilisateur littéral suffit —
`policyUser()` / `userWithCapabilities()` de `tests/support/policy_user.ts`, adossés au vrai
`ROLE_PERMISSIONS` plutôt qu'à des capabilities recopiées.

La matrice commune (capability exigée, refus sans elle, isolation entre organisations, compte
sans organisation) est générée par `testPolicyMatrix()` (`tests/support/policy_matrix.ts`) :
chaque spec **déclare** ses actions. Les particularités — argument optionnel, règle métier,
scope via une relation — restent écrites en clair dans leur spec, pas dans la matrice.

### Niveau 2 — le hook `before()`, en suite `integration`

**`before()` n'est jamais exécuté quand on instancie une policy à la main.** Seul le
`PolicyAuthorizer` de Bouncer l'appelle, et un retour booléen y court-circuite entièrement la
méthode de policy :

```js
hookResponse = await policyInstance.before(this.#user, action, ...args)
if (typeof hookResponse === "boolean" || …) return …   // la méthode n'est jamais atteinte
```

Conséquence : un `assert.isFalse(await new XPolicy().edit(admin, ressourceÉtrangère))` teste un
chemin d'appel qui n'existe pas en production. Il vérifie `sameOrg`, pas l'autorisation réelle.

Ce qu'un admin obtient vraiment se teste donc à travers un vrai `Bouncer` —
`tests/integration/permissions/policy_before_hook.spec.ts` :

```ts
const bouncer = new Bouncer(() => user, abilities, policies)
assert.isFalse(await bouncer.with(PortPolicy).allows('edit', portDUneAutreOrg))
```

Suite `integration` et non `unit` : `isAdminOf` fait une requête SQL.

### La garde

`tests/unit/hygiene/policies_covered.spec.ts` vérifie que toute policy a son spec et que toute
action publique y est nommée. Comme la garde des shards, elle **relit le disque** au lieu
d'importer une liste depuis le code testé : une garde qui partage sa source avec sa cible hérite
de ses angles morts.

### Les middlewares

`makeCtx()` (`tests/support/http_context.ts`) fournit un faux `HttpContext` qui **enregistre** ce
qu'on lui fait — flashes, redirections, appels d'authentification — au lieu de l'exécuter. Les
assertions portent sur ces journaux, ce qui rend visible aussi bien ce qui a été fait que ce qui
ne l'a pas été (`assert.equal(nextCalled, 0)`).

Ses journaux sont des **références vivantes**, jamais des accesseurs : un spec les déstructure
(`const { ctx, redirects } = makeCtx()`), ce qui figerait la valeur d'un getter au moment de la
déstructuration — le tableau resterait vide quoi que fasse le middleware, et le test passerait au
vert pour de mauvaises raisons.

## Tester les refus de validation (#688)

### `assertHasValidationError()` ne fonctionne pas — ne pas la chercher

`@adonisjs/session/plugins/api_client` expose bien la macro, mais elle lit le flash **`errors`** :

```js
ApiResponse.macro('assertHasValidationError', function (field) {
  this.assert.property(this.flashMessage('errors'), field) // → undefined
})
```

AdonisJS v7 range les erreurs de validation dans **`inputErrorsBag`**, et c'est ce sac que le
middleware Inertia relit pour construire la prop `errors` des pages. Passer par
`tests/support/validation.ts`, c'est donc asserter exactement ce que le formulaire Vue recevra.

### Deux familles d'échec, à ne pas confondre

| Nature               | Levée par                                  | Flash            | Rendu         | Assertion                     |
| -------------------- | ------------------------------------------ | ---------------- | ------------- | ----------------------------- |
| Contrainte de schéma | VineJS, avant le contrôleur                | `inputErrorsBag` | sous le champ | `assertFieldErrors`           |
| Règle métier         | le service (`ReservationValidationError`…) | `error`          | toast         | `assertBusinessRuleRejection` |

Une règle qui migre d'une couche à l'autre change donc de rendu pour l'utilisateur. Un test qui
confond les deux ne le verrait pas.

### Le patron : un témoin, puis une mutation par cas

```ts
const VALID = { name: 'Sea Breeze' }

test('the reference payload passes the validator and creates the boat', async ({
  client,
  assert,
}) => {
  assertNoFieldErrors(assert, await post(client))
  assert.lengthOf(await Boat.all(), 1)
})

test('rejects a navigationCategory outside A-D', async ({ client, assert }) => {
  assertFieldErrors(assert, await post(client, { navigationCategory: 'E' }), ['navigationCategory'])
})
```

Le témoin est ce qui rend les autres cas probants : il prouve que `VALID` franchit le validateur,
donc que tout refus qui suit vient de la seule mutation. Et `assertFieldErrors` exige l'**égalité
stricte** du jeu de champs fautifs — sans quoi un payload cassé ailleurs passerait pour la preuve
d'une contrainte jamais atteinte.

### Le piège des gardes en amont

Une route d'écriture traverse `auth`, la garde de plan ou de module, la policy et le quota **avant**
le validateur. Un utilisateur mal choisi produit alors une 302 sans la moindre erreur de champ, et
un test qui n'asserterait que le statut passerait au vert sans avoir jamais atteint le schéma.
C'est arrivé en écrivant `ports_validation.spec.ts` : `createEnterprisePlanUser()` n'a pas de
membership, donc pas la capability `ports.create` — il fallait `createEnterpriseAdminUser()`. Les
deux assertions ci-dessus le détectent ; un `assertStatus(302)` seul, non.

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
