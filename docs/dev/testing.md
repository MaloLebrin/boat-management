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

## Épingler une page Inertia (#689)

### Lire les props ne prouve pas quelle page a répondu

`@japa/api-client` délègue à superagent, qui suit **cinq redirections par défaut**. Un GET protégé
qui redirige vers `/login` est donc suivi, les en-têtes `x-inertia` sont rejoués sur la destination,
et le test reçoit un **200 Inertia parfaitement valide pour `auth/login`** :

```ts
// Sans loginAs() : 302 → /login, suivi, puis 200.
const response = await client.get('/settings/org').withInertia()
response.assertStatus(200) // ✅ passe
response.inertiaProps // ✅ des props, mais celles de la page de login
response.assertInertiaComponent('settings/org') // ❌ seule assertion qui le voit
```

C'est pour ça qu'une page se teste par son **composant**, pas seulement par ses props.

### La fabrique : `assertPageContract`

```ts
import { assertPageContract } from '#tests/support/inertia_page'

const response = await client.get('/boats').loginAs(user).withInertia()
assertPageContract(assert, response, 'boats/index')
```

Elle exige un 200, épingle le composant, puis **lit le `defineProps` de `inertia/pages/boats/index.vue`
sur le disque** et vérifie que le serveur envoie bien chaque prop requise. Le contrat vient donc de
la page elle-même : renommer `boats` en `items` côté contrôleur casse le test sans qu'on ait touché
au spec. Le nom de page est typé `keyof InertiaPages` — une faute de frappe ne compile pas.

Deux options, chacune à justifier à l'appel :

- `{ derive: false }` — n'épingle que le composant. Réservé aux pages marketing, seules à déclarer
  leurs props via un type nommé ; leurs props sont déjà figées, plus strictement, par les snapshots
  de `props_snapshot.spec.ts`.
- `{ ignore: [...] }` — pour une prop que le contrôleur omet légitimement.

Les props **différées** (`inertia.defer`, #463) sont lues dans `body().deferredProps` et jamais
exigées : elles sont absentes de la réponse initiale par construction.

### `assertInertiaPropsContains` ne prouve pas la présence d'une clé

Elle s'appuie sur `containSubset` de chai, dont la comparaison finale est
`actualValue === expectedValue`. Donc `{ maProp: undefined }` passe **même quand la clé est
absente**, et `assertInertiaPropsContains({})` est une tautologie. Sur un tableau, c'est un
`every`/`some` non ordonné et non exhaustif : `{ engines: [{ id: 3 }] }` passe contre
`[{id:9},{id:3},{id:7}]`. Elle reste bonne pour asserter une **valeur** ; pour une présence, utiliser
`assertPageContract` ou `Object.prototype.hasOwnProperty`.

### La garde

`tests/unit/hygiene/inertia_pages_covered.spec.ts` croise les `inertia.render('…')` de `app/` et les
`renderInertia('…')` de `start/` avec les pages épinglées dans `tests/`, et échoue en listant les
orphelines. Elle échoue aussi sur un rendu ou un épinglage **non littéral** : un nom construit à
l'exécution échappe au scan statique et la rendrait muette. C'est pourquoi un nom de page s'écrit en
toutes lettres au point d'appel, sans passer par une variable ni par un helper intermédiaire.

Trois pages sont exemptées, chacune avec son motif dans le code : les deux pages d'erreur ne sont
rendues qu'en production (`renderStatusPages`), et `home` est une branche morte.

## Tester un job et un listener (#699)

### Le piège : tester le service, croire tester le cron

Les sept crons de `start/scheduler.ts` **délèguent** tous à un service, et les services sont bien
couverts. Mais un spec qui instancie le service à la main —
`new NotificationScanService(new NotificationService())` — ne passe jamais par le job. Un
`execute()` vidé de son corps passerait alors toute la suite, et personne ne recevrait plus rien.

Un job se teste donc **par le conteneur**, comme la production l'exécute :

```ts
const job = await app.container.make(PurgeAuditLogs)
await job.execute()
```

Les jobs vivent dans `tests/integration/jobs/`, les listeners dans `tests/integration/listeners/` :
pas de serveur HTTP à démarrer, et la transaction globale de la suite suffit.

### Le piège de la suite `integration` : une transaction pour tout le fichier

`withGlobalTransaction()` est posé par `configureSuite`, donc **une** transaction enveloppe la suite
entière — pas un test. Les lignes insérées par un test restent visibles des suivants. Un test qui
réutilise une clé unique posée par son voisin mesure alors autre chose que ce qu'il croit (vécu sur
`queue_dedup.spec.ts` : le second `enqueueUnique` échouait sur la contrainte, et le tableau
d'appels observé restait vide). Donner à chaque test ses propres clés.

### Un listener se juge à son effet observable

Un événement est émis puis oublié : rien, côté appelant, ne constate qu'un listener a travaillé. On
asserte donc la trace — une `Notification` en base, un e-mail mis en file, un job dispatché — et
**pour qui** :

```ts
const listener = await app.container.make(OnOrganizationMemberJoined)
await listener.handle(new OrganizationMemberJoined(membership, org))

assert.sameMembers(
  notified.map((n) => n.userId),
  admins.map((a) => a.id)
)
```

Quand l'effet est une mise en file plutôt qu'une ligne, échanger le service par le conteneur
(`app.container.swap(EmailQueueService, …)`) et observer les appels ; ne pas oublier
`app.container.restore(…)` en `teardown`.

### La garde

`tests/unit/hygiene/scheduled_jobs_covered.spec.ts` vérifie que tout job est nommé par un spec, que
tout cron l'est aussi, et que l'ordre des deux crons IA est respecté. Une exemption est tolérable sur
un job à la demande, **jamais sur un cron** : personne ne constate l'absence de résultat d'une tâche
planifiée.

## Tester un téléchargement et son en-tête (#692)

### L'assertion utile porte sur l'en-tête, pas sur l'octet

`@japa/api-client` **n'expose pas le corps binaire** d'une réponse. Un test de téléchargement se juge
donc sur trois choses : le statut, `Content-Type`, et `Content-Disposition`. Le corps sert au mieux à
distinguer un vrai document d'une réponse vide, via `Content-Length` — et encore : le fake Cloudinary
renvoie 13 octets, donc un seuil de taille n'a de sens que sur un PDF réellement généré
(`crew_role_pdf.spec.ts`), pas sur un média servi par le fake.

### Le nom de fichier vient de l'utilisateur

Tout endpoint qui écrit `attachment; filename="${…}"` à partir d'une donnée stockée expose un
_header splitting_. `contentDisposition()` (`shared/helpers/content_disposition.ts`) est le seul
point qui a le droit de construire cet en-tête : il remplace les caractères de contrôle, le
guillemet et l'antislash par `_` dans `filename`, et transmet le nom complet percent-encodé dans
`filename*`.

Son test unitaire ne suffit pas : il prouve que le helper est correct, pas que la route l'appelle.
Le cas à écrire côté HTTP est un média dont le `originalFilename` contient `\r\n`, un guillemet et
des accents — et l'assertion est que l'en-tête ne contient **ni CR ni LF** et qu'aucun en-tête
parasite n'apparaît dans la réponse.

⚠️ À savoir avant d'écrire la mutation de contrôle : **Node refuse lui-même un en-tête contenant un
CRLF** (`ERR_INVALID_CHAR`). Remplacer le helper par une interpolation brute ne produit donc pas une
réponse corrompue mais une requête qui meurt — et, dans une suite Japa, une exécution qui **se
bloque** au lieu d'échouer. Pour une mutation à l'échec lisible, altérer plutôt l'argument passé au
helper (retirer l'extension, par exemple).

### Observer le service externe, pas seulement le statut

Un `assertStatus(200)` ne dit pas **quel** média a été servi : un scoping cassé renvoie 200 sur le
document d'autrui. `swapFakeCloudinary()` (`tests/support/fakes.ts`) enregistre les `publicId`
téléchargés et supprimés — c'est là que se prouvent l'IDOR fermé (`downloaded` vide) et la
suppression effective (`deletedPublicIds`).

### Le piège du plan sans membership

`createStarterPlanUser()` ne crée **pas** de membership. Sur une route gardée par une policy _puis_
par le plan, un tel utilisateur est refusé par la policy — le test passe au vert sans jamais
atteindre la garde de plan qu'il prétend vérifier. Utiliser `createStarterAdminUser()`. Même famille
de piège que « le piège des gardes en amont » plus haut (#688).

## Écrire un test qui ne se confirme pas lui-même (#693)

### Assertion littérale plutôt que formule rejouée

Un test qui calcule sa valeur attendue avec **la même expression que le code** ne teste que sa propre
arithmétique. `markDone` calcule la prochaine échéance par `doneAt.plus({ months: n })` ; un test qui
assert `doneAt.plus({ months: 12 })` reste vrai quelle que soit la valeur réelle de `doneAt`. Écrire
la date en clair (`'2027-02-10'`) coûte une ligne et donne un échec qui **nomme** la date lue et la
date voulue.

Le contre-exemple utile : ce test-là attrapait bien un changement de base de calcul
(`dueAt` au lieu de `doneAt`), parce que les deux dates diffèrent dans sa fixture. Mais il ne le doit
qu'à sa fixture, pas à son assertion.

### Vérifier le seuil, pas le milieu

Un test d'échéance « dans 3 jours → bientôt dû » reste vert si le seuil passe de 30 à 60 jours. Les
cas qui valent d'être écrits sont **les deux côtés de la borne** : J+30 et J+31, 50 heures et 51.
Vérifié par mutation — décaler `soonDateThreshold` d'un jour ne doit faire tomber **qu'un** test,
celui de la borne.

### Se placer dans le bon état amont

`TaskGroupingService` ne reçoit que `plannedTasks`. Deux tâches à J+3 et J+5, même bateau et même
sujet, sont donc dans `soon` et ne forment **aucun groupe** : un test de regroupement écrit avec ces
dates passe au vert en ne prouvant rien. Même famille que « le piège des gardes en amont » (#688) :
avant d'asserter un mécanisme, s'assurer que la donnée l'atteint.

Le contrôle qui le prouve : faire passer `tasks` au lieu de `plannedTasks` au grouper. Si **aucun**
test ne tombe, c'est que les tests de regroupement ne regardent rien.

### Une redirection identique des deux côtés ne sépare rien

`/settings/import/preview` redirige vers `/settings/import` en cas de succès **comme** d'erreur
d'en-têtes. Asserter la seule `location` ne distingue donc pas les deux — deux tests du dépôt
validaient ainsi un « CSV valide » qui était en réalité rejeté, faute d'être écrit avec le bon
séparateur. Ce qui sépare les deux cas, c'est l'effet : ici, la présence de `pendingImport` en
session (`response.session('pendingImport')`).

## Éprouver une garde (#694)

### Une garde prouvée sur des GET d'index ne prouve rien des écritures

Le refus du module Location était testé sur quatre pages d'index. C'est le cas où le refus coûte le
moins : une redirection sur un écran n'écrit rien de toute façon. Les treize routes d'**écriture** du
même sous-groupe n'étaient jamais éprouvées, alors que ce sont elles qui créent des réservations, des
états des lieux et des contrats.

### Le témoin qui sépare « refusé » de « redirigé »

Un test qui assert la seule `location` prouve une redirection. Il ne prouve pas que rien n'a été
écrit : la requête aurait pu écrire, **puis** rediriger. Le témoin tient en trois lignes — photographier
la base avant, après, et comparer :

```ts
const before = await domainState() // compte les six tables du domaine
const response = await face.call(client, user, ctx)
response.assertStatus(302)
assert.deepEqual(await domainState(), before, `« ${face.name} » a écrit malgré le refus`)
```

### Une garde posée sur un groupe se teste sur la table de routage

Les vingt-deux routes du domaine réservations n'ont pas leur garde : elles en **héritent** du groupe.
Une route déclarée d'un cran trop haut serait ouverte à tout le monde, et aucun test du domaine ne le
dirait — ils emploient tous un acteur qui a le module. La table de routage, elle, sait : les
middlewares **nommés** y restent introspectables avec leurs arguments.

```ts
router.commit()
for (const entry of route.middleware.all()) {
  if (entry.name === 'requireModulePlan') console.log(entry.args) // { feature: 'reservations' }
}
```

`tests/unit/hygiene/charter_routes_gated.spec.ts` s'en sert pour que la route ajoutée demain soit
couverte sans que personne n'y pense.

### Deux refus qui se ressemblent n'ont pas la même cause

Sur ces routes, la garde de module passe **avant** la policy. Tester la frontière d'un rôle dans une
organisation qui n'a pas le module mesure donc le module en croyant mesurer le rôle. Les deux refus ne
se ressemblent d'ailleurs qu'en apparence : un rôle sans capacité obtient **403** en lecture et
**302 vers `/`** en écriture, un module manquant **302 vers `/settings/billing`**.

### Un buffer de texte n'est pas une image

Le bodyparser détecte le type **réel** du fichier, pas le `contentType` déclaré :
`.file('files[]', Buffer.from('fake-jpeg'), { contentType: 'image/jpeg' })` est rejeté par le
validateur, et le test compte zéro envoi sans qu'aucune assertion ne dise pourquoi. Écrire les octets
magiques : `Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary')`.

## Mesurer avant d'asserter (#695)

### Une issue décrit une intention, pas un comportement

Sur #695, trois des scénarios demandés décrivaient un code qui n'existe pas : « place d'une autre
organisation → 403/404 » (c'est un **302 vers `/ports`**, sans flash), « member → création autorisée,
suppression refusée » (le member est refusé **sur les trois**), « place déjà occupée → refus » (c'est
une **éviction**). Les écrire de mémoire aurait produit trois tests rouges, puis la tentation de
« corriger » un code qui n'avait rien demandé.

La parade tient en un fichier jetable : une spec `zz_probe.spec.ts` qui appelle les routes visées et
`console.info` le statut, la `location`, le flash et l'état de la base. Dix minutes, puis
`rm`. Ce que la sonde renvoie devient l'assertion ; ce qu'on croyait savoir reste dehors.

### Nommer la couche qui tient vraiment l'invariant

Tester que l'`organizationId` d'une place ne se lit pas du payload semblait couvrir le service. La
mutation le dément : faire lire `payload.organizationId` au service ne change **rien** — VineJS ne
laisse passer que les clés déclarées. L'invariant est tenu par le **validateur**.

Même famille que l'unicité `(réservation, kind)` tenue par un index Postgres (#694). Dans les deux
cas, la bonne réaction n'est pas de retirer le test — il vérifie le comportement de bout en bout,
qui est ce qui compte — mais d'écrire dans le test **quelle couche** le porte, pour que la prochaine
personne ne déplace pas la garde en croyant la dupliquer.

### Un test de rôle a besoin de son contre-exemple

Un fichier qui n'assemble que des refus reste vert si l'organisation est mal montée, si un middleware
refuse trop large, ou si l'acteur n'a simplement pas de session. Le cas passant joué **dans le même
décor** — ici l'admin qui crée la place que le member n'a pas pu créer — est ce qui distingue « le
rôle est refusé » de « tout le monde est refusé ».

Attention au contre-exemple qui n'en est pas un : asserter qu'un member **lit** la page du port ne
prouve pas que sa capacité `ports.view` est lue, puisque cette route n'autorise rien du tout (#723).
Un contre-exemple doit porter sur le mécanisme qu'on prétend mesurer.

## Un flash ne franchit pas deux appels client (#696)

`SESSION_DRIVER=memory` en test. Le store vit le temps d'une requête : poser un flash puis appeler
`client.get(...)` pour lire `page.props.flash` renvoie **un objet vide**, même en reportant le cookie
`adonis-session` d'un appel à l'autre. C'est `response.assertFlashMessage(...)` — qui lit le store de
_cette_ réponse — qui existe pour ça.

Conséquence pratique : un test ne peut pas jouer « le contrôleur flashe, la page suivante le lit ».
Cette traversée se teste **là où elle est observable**, en appelant
`InertiaMiddleware.share()` sur un contexte dont la session porte les clés voulues
(`tests/unit/middleware/inertia_offline_protocol.spec.ts`). Sans utilisateur authentifié, tous les
résolveurs de plan, branding, notifications et assistant se court-circuitent, et les props
paresseuses ne sont pas évaluées : le contexte factice tient en vingt lignes.

Deux pièges dans ce contexte factice, tous deux rencontrés :

- `flashMessages.get(key, fallback)` prend un **second argument**. `getValidationErrors` du
  middleware de base appelle `get('inputErrorsBag', {})` et fait un `Object.entries` du résultat :
  un faux `get` à un seul argument fait tomber tout le fichier sur une cause sans rapport ;
- `request.header()` et `request.cookie()` sont appelés par le même chemin — les omettre donne la
  même erreur opaque.

### Asserter la présence d'une clé n'est pas asserter son contenu

`response.assertFlashMessage('conflictData')` prouve que la clé est là. Le front, lui, fait
`JSON.parse` dessus et y lit des champs nommés. Mesuré : remplacer la charge utile par
`JSON.stringify({})` laisse **23 tests de journal de bord verts** et n'en fait tomber que ceux qui
ouvrent réellement le JSON. Quand une valeur est consommée par du code, l'assertion doit la
consommer aussi.

### Un refus sans témoin ne prouve rien (#697)

`response.assertFlashMessage('error', 'Access denied')` prouve qu'un message a été posé. Il ne
distingue **pas** « le Bouncer a arrêté l'action » de « l'action a écrit, puis la réponse a
redirigé » : les deux rendent le même 302 et le même flash. Un refus doit donc toujours s'accompagner
d'un **témoin en base**, relevé avant et comparé après :

```ts
const before = await ledger(decor) // un cliché de tout ce que l'action peut écrire
const response = await confirm(client, token, user)
response.assertFlashMessage('error', ACCESS_DENIED)
assert.deepEqual(await ledger(decor), before, 'l’action a écrit malgré le refus')
```

Le cliché vaut mieux qu'un compteur sur la seule table attendue : une action mal rangée écrirait
ailleurs, et un compteur ciblé ne la verrait pas. Le journal d'audit en fait partie — une écriture
sans ligne d'audit est un bug distinct, et l'inverse aussi.

### Une matrice de refus a besoin de son contre-exemple

Neuf refus d'affilée sont compatibles avec une route cassée, un middleware trop large ou un décor
qui n'a jamais été valide. Il faut donc, **dans le même décor et avec les mêmes données**, au moins
un cas qui passe. Dans `action_confirmation_guard.spec.ts`, c'est le `mechanic` : il confirme
`create_task` — sa seule capability — et se fait refuser les huit autres. Sans lui, la matrice
resterait verte sur un `/assistant/conversations/:token/action/confirm` renvoyant 302 pour tout le
monde.

C'est la même règle que la mesure de #695 avait imposée : un refus vérifié sur un seul rôle n'est pas
une règle ACL, c'est une observation.

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
