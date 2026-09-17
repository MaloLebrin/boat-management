# 2026-09-18 — Tests : le contrat de page Inertia (#689)

Les contrôleurs rendent **84 composants Inertia distincts** sur 92 call sites, et la suite
fonctionnelle compte 812 `assertStatus`. Mais seules **24** pages voyaient leur composant épinglé
par un `assertInertiaComponent` littéral. Le reste des tests lit `response.inertiaProps` — 121 fois
dans le dépôt — sans jamais figer **quelle page** reçoit ces props.

- **Le piège que ça laissait ouvert.** `@japa/api-client` délègue à superagent, qui suit **cinq
  redirections par défaut**. Un GET protégé qui redirige vers `/login` est donc suivi, les en-têtes
  `x-inertia` sont rejoués sur la destination, et le test reçoit un **200 Inertia parfaitement
  valide pour `auth/login`**. `assertStatus(200)` passe, lire `inertiaProps` passe. Vérifié par
  mutation : retirer le `loginAs()` d'un test de `/settings/org` donne
  `expected 'auth/login' to equal 'settings/org'` — l'épinglage du composant est la seule assertion
  qui le voit.
- **Une fabrique unique** — `tests/support/inertia_page.ts` : `assertPageContract(assert, response,
'page')` épingle le composant, puis lit le `defineProps` de `inertia/pages/<page>.vue` **sur le
  disque** et exige que chaque prop requise soit présente. Le contrat vient donc de la page
  elle-même : renommer une prop côté contrôleur casse le test sans que personne ait à toucher au
  spec. Le paramètre est typé `keyof InertiaPages` (union générée dans `.adonisjs/server/pages.d.ts`)
  — une faute de frappe sur un nom de page ne compile pas.
- **Pourquoi pas `assertInertiaPropsContains`.** Elle s'appuie sur `containSubset` de chai, dont la
  comparaison finale est `actualValue === expectedValue`. Donc `{ maProp: undefined }` passe **même
  quand la clé est absente** : elle ne sait pas asserter une présence. La fabrique utilise
  `Object.prototype.hasOwnProperty`.
- **Les props différées** (#463, onze sur `boats/show`) sont lues dans `body().deferredProps` plutôt
  qu'exigées : elles sont absentes de la réponse initiale par construction.
- **Une garde** — `tests/unit/hygiene/inertia_pages_covered.spec.ts`, même forme que celles de #687
  et #690 : elle relit le disque, croise les `inertia.render('…')` **et** les `renderInertia('…')`
  des routes avec les pages épinglées, et échoue en listant nommément les orphelines. Elle échoue
  aussi sur un rendu ou un épinglage **non littéral**, qui échapperait au scan et la rendrait muette.
- **Trois exemptions, chacune motivée dans le code.** `errors/not_found` et `errors/server_error` ne
  sont pas atteignables en test — les `statusPages` du handler ne sont montées que si
  `app.inProduction` ; vérifié, un GET sur une route inconnue rend du HTML nu, sans en-tête
  `x-inertia`. Et `home` est une **branche morte** : `HomeController#index` la rend quand
  `auth.isAuthenticated` est faux, mais sa seule route est `/dashboard`, derrière `middleware.auth()`
  — la condition ne peut jamais être vraie, et l'accueil public est servi par `marketing/home`.
- **Ce que l'issue annonçait.** #689 parlait de « 81 pages, 31 jamais assertées ». Mesuré sur le
  disque : 84 pages, 24 épinglées littéralement, 60 à couvrir. L'écart vient du critère — l'issue
  comptait aussi des assertions par variable et par `assert.equal(body().component, …)`, correctes
  mais qu'aucun scan statique ne peut compter.
- **Assertions remises dans le radar.** `equipment_show_initial_tab.spec.ts` couvrait ses six pages
  dans une boucle, le nom du composant lu dans un tableau : l'assertion était juste, mais illisible
  en cas d'échec (« une page a cassé, laquelle ? ») et incomptable. Déroulée en six tests nommés.
- **Tests.** 60 pages épinglées, réparties en treize fichiers de contrat plus deux specs existants
  enrichis, et 4 tests unitaires sur le parseur de `defineProps` — dont le mode de défaillance à
  craindre est de rendre une liste vide, donc d'exiger silencieusement plus rien.
- **Non-vacuité.** Quatre mutations, chacune restaurée : renommer `clientOptions` dans
  `invoices_controller` ⇒ `invoices/index` tombe en nommant la prop ; rendre `ports/list` au lieu de
  `ports/index` ⇒ l'épinglage tombe ; supprimer un fichier de contrat ⇒ la garde liste la page
  redevenue orpheline ; retirer un `loginAs()` ⇒ le contrat tombe en nommant `auth/login`.
