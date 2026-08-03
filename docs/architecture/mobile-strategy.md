# Stratégie mobile — faut-il une application mobile ?

> Analyse du 2026-08-03. Question posée : **comment ajouter une application mobile à ce repo, et est-ce une bonne idée ?**
> Motivations retenues : usage terrain / hors-ligne, notifications push, capacités natives. La présence sur les stores n'est pas un objectif.

---

## Verdict en trois phrases

**Non — pas d'application native, et pas tout de suite de nouveau chantier mobile.** La PWA qui existe déjà dans le repo est la bonne réponse à deux des trois motivations, mais **son service worker ne s'installe jamais en production** : il faut d'abord réparer ce qui est censé marcher avant d'ajouter quoi que ce soit. Une app native supposerait par ailleurs de construire une API qui n'existe pas (100 % Inertia, auth session uniquement), pour un bénéfice réel limité à deux fonctionnalités — GPS en tâche de fond et Bluetooth/NMEA.

---

## 0. Le point bloquant : le service worker est mort en production

C'est la découverte principale de cette analyse, et elle conditionne tout le reste.

### Ce qui a été mesuré

Sur un build réel (`node ace build`), en évaluant le service worker généré dans un environnement mocké :

```
RESULT: SW THREW -> non-precached-url :: [{"url":"/offline.html"}]
```

**Le service worker lève une exception à l'évaluation. Il ne s'installe donc jamais.**

### Deux causes distinctes, toutes deux vérifiées

**1. `offline.html` n'est pas précaché — d'où l'exception.**

`vite.config.ts` déclare `navigateFallback: '/offline.html'` et met `'offline.html'` dans `globPatterns`. Mais `globPatterns` est évalué depuis le répertoire de sortie de Vite, soit `public/assets` (`config/vite.ts` → `buildDirectory: 'public/assets'`). Or le fichier vit dans `public/offline.html`, **pas** dans `public/assets/`. Il n'entre donc jamais dans le manifeste de précache.

En stratégie `generateSW`, `navigateFallback` produit un `createHandlerBoundToURL('/offline.html')` appelé au niveau racine du service worker. Et `PrecacheController.createHandlerBoundToURL()` (`node_modules/workbox-precaching/PrecacheController.js:280-283`) lève `WorkboxError('non-precached-url')` de façon **synchrone** si l'URL n'est pas dans le manifeste. L'exception se produit à l'évaluation du script, avant tout `addEventListener`.

Vérifiable sans rejouer le test : le build contient `createHandlerBoundToURL("/offline.html")` alors que `offline.html` n'apparaît nulle part dans le manifeste de précache.

**2. Le scope est `/assets/` — le service worker ne verrait de toute façon aucune navigation.**

`config/vite.ts` fixe `buildDirectory: 'public/assets'` et `assetsUrl: '/assets'`. Le plugin `@adonisjs/vite/client` en dérive `base = '/assets/'`, donc `vite-plugin-pwa` émet `sw.js` dans `public/assets/` et l'enregistre à `/assets/sw.js`. Confirmé dans le bundle client construit :

```
build/public/assets/app-*.js : "/assets/sw.js"  … scope:"/assets/"
```

Un service worker de scope `/assets/` **ne contrôle jamais** une navigation vers `/boats`, `/navigation` ou `/planning`. Même si la cause n°1 était corrigée, la règle `runtimeCaching` NetworkFirst de `vite.config.ts` et le `navigateFallback` resteraient sans effet.

### Ce qui est cassé, et ce qui marche quand même

| Fonctionnalité                                                             | État réel                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File d'attente hors-ligne (`use_offline_queue.ts`)                         | ✅ **Fonctionne.** C'est du JS de page + IndexedDB, totalement indépendant du service worker. Onglet ouvert + perte de réseau = la saisie est bien mise en file et resynchronisée.                                                                   |
| Bandeau hors-ligne, `OfflinePendingQueue`, résolution de conflits          | ✅ Fonctionnent (même raison).                                                                                                                                                                                                                       |
| Consultation hors-ligne d'une page déjà visitée                            | ❌ Aucun cache. Recharger ou naviguer hors réseau = page d'erreur du navigateur.                                                                                                                                                                     |
| Page `offline.html`                                                        | ❌ Jamais servie.                                                                                                                                                                                                                                    |
| Précache JS/CSS/polices                                                    | ❌ Inexistant.                                                                                                                                                                                                                                       |
| Toast « prête hors-ligne » (`usePwaUpdate`)                                | ❌ `offlineReady` ne passe jamais à `true`.                                                                                                                                                                                                          |
| Bouton « Installer l'application » (`usePwaInstall`, dans `AsideMenu.vue`) | ❌ Sur Android/Chrome, `beforeinstallprompt` requiert un service worker avec gestionnaire `fetch` → `canInstall` reste `false`, le bouton n'apparaît jamais. _(À reconfirmer sur appareil réel — les critères d'installabilité de Chrome évoluent.)_ |
| « Sur l'écran d'accueil » iOS                                              | ⚠️ Fonctionne (Safari ne réclame pas de service worker pour l'ajout manuel), mais sans aucun bénéfice hors-ligne.                                                                                                                                    |

Autrement dit : **`docs/frontend/pwa.md` décrit fidèlement une intention, pas le comportement en production.** Aucun test ne couvre le service worker — les specs Vitest existantes testent les composables, pas Workbox — donc rien n'a jamais signalé la régression.

### Correctif recommandé

Sortir le service worker à la racine web tout en gardant les assets sous `/assets`, dans `vite.config.ts` : `outDir: 'public'`, `buildBase: '/'`, `scope: '/'`, `base: '/assets/'`, `injectManifest.globDirectory: 'public/assets'`. Ajouter `public/sw.js`, `public/sw.js.map` et `public/workbox-*.js` à `.gitignore` (aujourd'hui seul `public/assets` est ignoré). Et précacher `/offline.html` explicitement plutôt que de compter sur `navigateFallback`.

_Alternative écartée_ : servir `/assets/sw.js` avec un en-tête `Service-Worker-Allowed: /`. Ça marche, mais ça casse le jour où `assetsUrl` pointe sur un CDN — ce que le commentaire de `config/vite.ts` envisage explicitement.

**Effort : 1 à 2 jours**, dont la moitié en vérification sur build réel. **À faire avant toute autre chose** — sans service worker il n'y a ni cache hors-ligne, ni installabilité, ni Web Push.

---

## 1. État des lieux du code

| Constat                                                                                                                                                                                                                                                                                                                                  | Preuve                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Il n'y a aucune API.** 100 % Inertia, 68 `inertia.render()`, zéro route `/api`. La seule réponse JSON du projet est l'ack du webhook Stripe.                                                                                                                                                                                           | `start/routes/*.ts` (24 fichiers), `app/controllers/billing_controller.ts:296`                               |
| **L'auth est session-only.** `sessionGuard` + remember-me 30 j. Pas de token guard, pas de JWT, pas de refresh token. Un appel non authentifié renvoie un 302 vers `/login`, pas un 401. CORS en prod : `origin: []`.                                                                                                                    | `config/auth.ts`, `app/middleware/auth_middleware.ts:6`, `config/cors.ts`                                    |
| **Une PWA existe déjà**, et l'intention est sérieuse : service worker Workbox, manifest, file hors-ligne IndexedDB avec détection de conflits, UI de file en attente, prompt d'installation, 5 specs Vitest. Mais voir §0.                                                                                                               | `vite.config.ts`, `public/site.webmanifest`, `inertia/composables/use_offline_queue.ts`                      |
| **Le push n'existe pas.** Les notifications sont in-app uniquement, diffusées en SSE via Transmit. Zéro `web-push` / FCM / APNs dans le repo.                                                                                                                                                                                            | `app/services/notification_service.ts:23-31`, `start/transmit.ts`                                            |
| **Seuls 4 formulaires** savent fonctionner hors-ligne : journal de bord (création, mise à jour, clôture) et avitaillement.                                                                                                                                                                                                               | `docs/frontend/pwa.md` §« Formulaires supportés »                                                            |
| **Aucune capture caméra.** Aucun attribut `capture` sur les inputs fichier, alors que `.heic/.heif` est accepté — les photos d'iPhone sont attendues, mais l'appareil photo n'est jamais proposé.                                                                                                                                        | `inertia/components/media/MediaPhotoGallery.vue:68`                                                          |
| **La position est saisie à la main.** Deux champs texte lat/lng, et `distanceNm` est saisi manuellement à la clôture d'une navigation.                                                                                                                                                                                                   | `inertia/components/boats/show/tabs/overview/BoatOverviewPositionCard.vue`, `shared/types/navigation_log.ts` |
| **Le responsive est inégal.** 51/68 pages ont un breakpoint, mais les écrans de terrain en ont très peu (`planning/index.vue` : 1, `boats/show.vue` : 2, `reservation_inspection.vue` : 2). Deux drawers mobiles, pas de bottom nav. Plusieurs tableaux en `overflow-x-auto` sans repli carte. Aucun test navigateur en viewport mobile. | `inertia/pages/**`, `tests/browser/` (8 specs, aucune ne fixe de viewport)                                   |

Actif réel et sous-estimé : **38 fichiers de types dans `shared/types/`**, déjà isomorphes backend/frontend, plus `shared/helpers/` et `shared/constants/`. C'est le socle qui rendrait une API — ou un client natif TypeScript — beaucoup moins coûteux que la moyenne des projets de cette taille.

---

## 2. Ce que chaque motivation coûte vraiment

### Usage terrain / hors-ligne → **web, déjà bâti, mal couvert**

L'architecture est là et elle est bonne (file FIFO, détection de conflit par `_expectedUpdatedAt`, UI de file en attente). Deux manques : le service worker ne s'installe pas (§0), et **seuls 4 formulaires** sont concernés. Tout ce qu'un mécanicien saisit réellement sur un ponton — fiches d'entretien, défauts d'inspection, incidents, heures moteur — tombe dès qu'il n'y a plus de réseau. Aucun besoin de natif ici : c'est de la couverture à étendre.

### Notifications push → **web suffit**

Web Push fonctionne sur Android, et sur iOS 16.4+ pour une PWA installée sur l'écran d'accueil. Et le branchement côté serveur est particulièrement propre : **`NotificationService.create()` est le point de passage unique de toutes les notifications** — `createIfNotRecent()` y converge, le scan de flotte y converge, les listeners d'organisation l'appellent directement — et la méthode diffuse déjà en SSE. Le push s'insère juste après, dans son propre `try/catch`, sans rework.

Prérequis absolu : un service worker qui s'installe. Le push transite par lui, sans exception.

### Capacités natives → **la seule motivation réellement native, et elle est étroite**

Hors de portée du web :

- **GPS en tâche de fond** — tracer une navigation écran éteint. Aujourd'hui la position _et_ la distance parcourue sont tapées à la main. C'est le cas d'usage natif le plus défendable du produit.
- **Bluetooth / NMEA** vers les instruments du bord — Web Bluetooth n'existe pas sur iOS, et le NMEA passe souvent par TCP/UDP que le web ne sait pas ouvrir.

À portée du web, contrairement à une idée reçue : caméra (`capture` + `getUserMedia`), géolocalisation au premier plan, notifications, stockage hors-ligne, installation sur l'écran d'accueil.

Soit **deux fonctionnalités** qui justifient du natif — pas 68 écrans.

---

## 3. Les trois scénarios

### A — PWA de terrain _(recommandé)_

Réparer le service worker, puis étendre ce qui existe : Web Push greffé sur `NotificationService.create()`, file hors-ligne élargie aux formulaires de terrain, capture caméra, passe UX mobile sur les écrans utilisés à bord.

**4 à 6 semaines** pour un développeur, hors upload photo hors-ligne (voir §4).
Couvre intégralement les motivations « terrain » et « push ». Ne couvre pas le GPS de fond ni le NMEA.

### B — Présence store sans réécriture

Non retenu comme objectif ici (la présence store n'est pas une motivation), mais documenté pour mémoire.

**B1 — TWA / Bubblewrap sur Android + PWA installée sur iOS.** La TWA est un Custom Tab : cookies de session partagés avec Chrome, service worker opérationnel, Web Push délivré nativement. Tout le travail de la phase A est réutilisé tel quel. Prérequis : `public/.well-known/assetlinks.json`, un keystore, un compte Play, et un manifest conforme (voir §5). **2 à 4 jours**, essentiellement de la configuration.

**B2 — Capacitor chargeant l'URL distante.** Les risques, sans enrobage :

- **Un service worker dans un WebView ne reçoit pas de push** (pas d'APNs sans capability native). Conséquence directe : avec Capacitor on abandonne le Web Push et on ajoute un **second** pipeline (tokens FCM, `firebase-admin`, table d'abonnements bi-format). C'est le coût caché principal, et il annule une partie du travail de la phase A.
- **WKWebView ne partage pas son cookie store avec Safari** → reconnexion obligatoire au premier lancement, et la persistance du remember-me 30 j après longue inactivité est à tester, pas à supposer.
- **Le SSR Inertia n'est pas embarquable** : avec `server.url`, rien n'est bundlé localement, l'app est un écran blanc sans réseau au-delà de ce que le service worker a caché. On perd l'argument « app native » le plus tangible.
- **Guideline Apple 4.2 « minimum functionality »** : un wrapper chargeant un site distant est le cas d'école du rejet. Ce qui fait passer — caméra native, push APNs, Face ID, comportement hors-ligne réel — est faisable, mais injecte du code conditionnel Capacitor-only dans un front partagé.

**3 à 5 semaines**, plus une maintenance permanente (deux stores, deux pipelines de push, une review Apple à chaque bump natif).

**Si la phase B devient nécessaire, choisir B1.** Capacitor n'a de valeur qu'à partir du moment où on veut GPS de fond, BLE et hors-ligne au démarrage — c'est-à-dire quand on est prêt pour la phase C. Le lancer avant maximise le risque de rejet et minimise le bénéfice.

### C — Application native complète

**Prérequis API** — le vrai coût, avant la première ligne de Swift/Kotlin/RN :

1. **Guard tokens** cohabitant avec la session dans `config/auth.ts` (`tokensGuard` + `DbAccessTokensProvider` sur `app/models/user.ts`, `default: 'web'` inchangé), plus une migration `auth_access_tokens`.
2. **Trois pièges dans le pipeline HTTP existant** :
   - `config/shield.ts` monte le CSRF globalement (`exceptRoutes: ['/webhooks/stripe']`). Sans `/api/*` dans cette liste, **toute mutation API renvoie 403**.
   - `start/kernel.ts` applique globalement `silent_auth`, `check_demo_session` et `detect_user_locale`. Ce dernier devra retomber sur `Accept-Language`.
   - `app/exceptions/handler.ts` redirige les échecs d'auth vers `/login`. Il faut différencier par préfixe ou `Accept: application/json` → 401 JSON. Fichier sensible, à couvrir par des tests avant de le toucher.
3. **CORS** (`config/cors.ts`, `origin: []` en prod) et **rate limiting** (`@adonisjs/limiter` déjà en dépendance, table `rate_limits` existante).
4. **Transformers** — les 22 sont réutilisables _partiellement_. Directement neutres : `notification`, `user`, `media_row`, `port`, `spot`, `mouillage`, `client`, `invoice`. À dédoubler : `boat_transformer.ts` en tête, dont le `BoatShowContext` mélange les données avec 13 booléens de permission et agrège 12 collections dans un mégapayload « page ». Il faudrait un `toBoatResource(boat)` sans contexte, des sous-ressources adressables, et les droits déplacés dans un bloc `meta.permissions` — calculable par `PermissionService`, réutilisable tel quel.
5. **Tuyau** (`@tuyau/core`, déjà dépendance) donne gratuitement un client TS typé de bout en bout. Ce n'est **pas** un générateur OpenAPI : si l'app native est en Swift/Kotlin, Tuyau n'apporte rien.

**Estimation, sans complaisance :**

- API seule (guard tokens, 15-20 ressources, transformers neutres, tests) : **6 à 10 semaines**.
- Parité avec les 68 pages — planning drag & drop, carte Leaflet, graphes Chart.js, PDF (PDFKit + Ghostscript), assistant IA Mistral, facturation Stripe, design system complet, i18n bilingue : **9 à 15 mois-homme**, plus la charge permanente de deux fronts qui divergeront.

**La parité 68 pages n'est pas un objectif rationnel.** Le seul scénario défendable serait une app native volontairement réduite — 6 à 10 écrans de terrain — soit 3-4 mois d'app plus 4-6 semaines d'API. Or c'est exactement le périmètre que la phase A couvre déjà, pour environ un dixième du coût.

**Ne déclencher la phase C que sur un signal mesuré** (rétention mobile sous un seuil, exigence contractuelle d'un client majeur), jamais par principe.

---

## 4. Plan d'attaque recommandé (phase A)

Séquencement : **A.0 → (A.3 + A.5, quick wins) → A.2 → A.4 → A.1**, tests en continu.
A.1 dépend techniquement de A.0. A.4 précède A.1 parce que le taux d'installation conditionne entièrement le push iOS.

### A.0 — Réparer le service worker _(1-2 j, bloquant)_

Voir §0. Rien d'autre ne peut démarrer avant.

### A.1 — Web Push _(4-6 j + 2 j de validation sur appareils réels)_

Greffé sur `NotificationService.create()`, dans son propre `try/catch` — un échec de push ne doit jamais faire échouer la création de la notification, exactement comme le broadcast SSE aujourd'hui.

À créer : migration + modèle `push_subscriptions` (avec `endpoint_hash` unique — le navigateur renvoie le même endpoint à chaque appel), `shared/types/push.ts`, `shared/constants/push.ts` (sous-ensemble poussable de `NotificationType`), `app/services/push_subscription_service.ts`, `app/services/web_push_service.ts`, `app/exceptions/push_errors.ts`, `app/jobs/send_push_notification.ts`, un contrôleur + `start/routes/push.ts`, `config/push.ts`, un service worker custom, et les composables/composants front.

Points d'attention :

- **Clés VAPID en `Env.schema.secret.optional()`** — obligatoirement optionnelles, sinon `.env.test`, la CI et tous les environnements existants cassent au boot. Prévoir une garde `if (!config.push.enabled) return` en tête du job, sans quoi un `QUEUE_DRIVER=sync` en test tenterait un vrai push à chaque notification créée.
- **404/410 → suppression immédiate de l'abonnement.** Indispensable : si l'utilisateur retire la PWA de son écran d'accueil, le token APNs est révoqué sans que le serveur en soit informé.
- **Toujours appeler `showNotification`**, même sur un payload vide — Safari comme Chrome désabonnent un endpoint qui reçoit des push sans rien afficher.
- **`notificationclick`** : chercher une fenêtre existante, la focus et lui envoyer un `postMessage`, que l'app traduit en `router.visit(url)`. Sans ça, un clic sur notification provoque un rechargement complet et on perd le bénéfice Inertia.
- **`pushManager.subscribe()` doit être appelé dans un geste utilisateur.** Jamais au montage, toujours sur clic, et jamais à froid : n'afficher la demande qu'après un signal d'engagement.
- **Entonnoir iOS** : Web Push exige une PWA installée. `beforeinstallprompt` n'existe pas sur Safari, donc `canInstall` y sera toujours `false` — il faut un composant d'aide dédié avec les instructions « Partager → Sur l'écran d'accueil ».

**Le point dur, c'est la bascule en stratégie `injectManifest`** (nécessaire pour un service worker custom) : `registerType: 'autoUpdate'` n'injecte plus `skipWaiting()`/`clientsClaim()`, et `runtimeCaching`/`navigateFallback` disparaissent — tout est à réécrire à la main. Bonne nouvelle : `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `workbox-precaching` et `workbox-cacheable-response` sont **déjà** dans les devDependencies. Le push doit être validé sur un build réel, pas sur le serveur Vite.

### A.2 — Étendre la file hors-ligne _(4-6 j)_

Par ordre de rentabilité :

- **`EngineHoursQuickAddForm.vue`** — meilleur candidat, ~10 lignes. L'incrément est commutatif, aucun conflit possible. Vérifier que le contrôleur applique bien un incrément et non un `set` absolu : la migration `add_hours_monotonic_trigger_to_boat_engines` rejetterait un rejeu absolu obsolète.
- **`BoatMaintenanceSheetItemList.vue`** — deux problèmes réels. _(a)_ Deux toggles hors-ligne sur le même item produisent deux entrées FIFO dont la seconde écrase les notes → il faut une clé de déduplication et un upsert, donc une **migration IndexedDB v1 → v2** (la file des utilisateurs existants doit survivre). _(b)_ `item.isDone` vient des props Inertia : hors-ligne, cocher ne coche rien visuellement, l'utilisateur reclique, on crée des doublons. **C'est l'état optimiste qui est le vrai travail ici**, pas le `enqueue`. Le composant dépassera les 250 lignes → extraire une ligne en sous-composant.
- **`BoatIncidentForm.vue`** (et donc `QuickAddIncidentModal.vue`) — utilise `<Form :action>`, qui n'offre aucun `handleSubmit` interceptable : conversion en `useForm` + `@submit.prevent`. Piège silencieux : `tzOffsetMinutes` est un `<input type="hidden">` dont la valeur est calculée à l'affichage (`new Date().getTimezoneOffset()`). À la conversion, il faut la figer dans le `useForm` au moment de la saisie — si elle est recalculée au rejeu, un incident saisi hors-ligne puis synchronisé après un changement de fuseau est daté faux, sans aucun signal.
- **`InspectionDefectModal.vue`** — même conversion, mais **limite structurelle** : une inspection créée hors-ligne n'a pas d'`inspectionId`. Les défauts ne sont enfilables que sur une inspection déjà créée en ligne. Rendre la création d'inspection elle-même hors-ligne demanderait des IDs temporaires et une résolution de dépendances à la synchro — **hors périmètre v1**, à signaler dans l'UI.

**Deux limites à énoncer plutôt qu'à découvrir en route :**

1. `docs/frontend/pwa.md` promet « aucune modification backend nécessaire ». C'est vrai pour les créations seulement. La détection de conflit (`_expectedUpdatedAt` → flash `conflictData`) n'est implémentée que dans `app/controllers/navigation_logs_controller.ts`. Chaque `PATCH`/`PUT` rejoué ailleurs demande de reproduire ce motif dans son contrôleur — sinon on fait du last-write-wins silencieux sur des données saisies à plusieurs.
2. **L'upload photo hors-ligne est hors périmètre v1, et il faut l'assumer.** La file stocke du JSON ; les galeries postent des `File` en `forceFormData`. Il faudrait stocker des `ArrayBuffer` (Safari iOS a un historique de Blobs détachés après redémarrage), plafonner le quota (une photo HEIC ≈ 3 Mo), et compresser côté client — sauf que **le canvas ne décode pas le HEIC hors Safari**, donc la compression est impossible sur Android pour des fichiers que l'`accept` autorise déjà. → v1 : désactiver explicitement avec un message clair plutôt qu'un échec silencieux. Une file média séparée est un chantier de 4-6 jours à arbitrer à part.

**Amélioration transverse fortement recommandée** : `drainQueue()` supprime l'action sur 4xx. Avec 4 formulaires c'était tolérable ; avec 9, un 422 silencieux détruit une saisie faite au large. Remplacer par un store `failed` affiché dans `OfflinePendingQueue.vue`, avec la possibilité de rouvrir le formulaire prérempli. ~1 j — et c'est ce qui décide si un mécanicien refait confiance à la file après un premier échec.

_Ne pas renommer la base IndexedDB `fleetide-offline-queue` malgré la dette de marque : ça viderait les files en cours chez les utilisateurs._

### A.3 — Capture caméra _(0,5-1 j)_

Seuls **deux fichiers** portent des inputs photo : `inertia/components/media/MediaPhotoGallery.vue` et `inertia/components/boats/show/BoatPhotoGallery.vue`. `MediaPhotoGallery` est le composant partagé de toutes les galeries, y compris `InspectionPhotos.vue`. Les autres inputs fichier du projet sont des PDF/CSV — y mettre `capture` ouvrirait l'appareil photo à la place du sélecteur.

**Piège** : les deux inputs ont `multiple`, et `capture` **supprime** la sélection multiple depuis la galerie. Il ne faut donc pas ajouter l'attribut sur l'input existant, mais **un second bouton « Prendre une photo »** avec son propre input `capture="environment"` sans `multiple`.

À faire au passage : un bouton « Ma position actuelle » (Geolocation API) sur `BoatOverviewPositionCard.vue`, qui remplace la double saisie manuelle lat/lng. Effort dérisoire, gain immédiat, zéro natif.

### A.4 — Passe UX mobile _(5-8 j)_

Le poste le plus long et le moins spectaculaire, mais c'est lui qui décide si l'app est utilisée sur un ponton.

**Les deux correctifs les plus rentables ne sont pas cosmétiques :**

- `inertia/layouts/default.vue` utilise `h-screen overflow-hidden`. Sur iOS Safari, `100vh` déborde sous la barre d'URL → le contenu bas devient inaccessible. Passer à `h-dvh` (supporté par Tailwind v4).
- `resources/views/inertia_layout.edge` n'a pas `viewport-fit=cover` dans son `<meta name="viewport">` → `env(safe-area-inset-*)` vaut 0 sur iPhone à encoche, ce qui condamnerait la bottom nav.

**Bottom tab bar** — nouveau composant, 4 onglets max. Ne pas dupliquer la logique de droits : ajouter un computed dans `use_nav_sections.ts` qui réutilise `can()`. Pour `mechanic` : Dashboard / Planning / Historique / Bateaux. Pour `boat_owner` : masquer. Monter hors du `<main>` scrollable, avec `pb-[env(safe-area-inset-bottom)]`. **Garder `MobileSidebarDrawer.vue`** : bottom nav = 4 raccourcis, drawer = navigation complète.

**Tables → cartes** sur les écrans de terrain : `navigation/logbook.vue`, `navigation/fuel.vue`, `navigation/incidents.vue`, `maintenance/history.vue`. Pattern : une carte par domaine à côté des `*Row.vue` existants, `lg:hidden` pour les cartes / `hidden lg:block` pour la table. Mêmes props, zéro duplication de données.

**Cibles tactiles (44 px)** : le hamburger de `default.vue` fait 40 px ; surtout, **la case à cocher de `BoatMaintenanceSheetItemList.vue` fait 20 px** alors que c'est l'interaction terrain n°1, avec des gants, sur un pont mouillé.

**Écrans à faible couverture** : `reservation_inspection.vue` (le `lg:grid-cols-2` empile deux panneaux très longs sur mobile → basculer sur `BaseTabs` sous `lg`), `planning/index.vue`, et les onglets de `boats/show.vue` à rendre scrollables horizontalement — à traiter dans `BaseTabs.vue`, gain sur toutes les pages à onglets.

### A.5 — Tests

**Le manque le plus criant : rien ne couvre le service worker.** C'est ce qui a permis à §0 de passer inaperçu. Ajouter au minimum une assertion de build vérifiant que le service worker s'évalue sans lever et que son scope est `/`.

- **Playwright** (`tests/browser/`) : le `browserContext` injecté par `@japa/browser-client` est créé sans options, on ne peut pas y passer `viewport`. Passer par `page.setViewportSize({ width: 390, height: 844 })` avant `waitForLoadState`. `isMobile`/`hasTouch` ne seront pas émulés — suffisant pour valider les breakpoints CSS, **insuffisant pour le tactile**, à documenter plutôt qu'à masquer. Cas les plus rentables : absence de débordement horizontal (`scrollWidth <= innerWidth`) sur les 6 écrans de terrain, bottom nav visible/masquée selon le breakpoint, cartes substituées aux tables.
- **Vitest** : composable push (stub complet de `navigator.serviceWorker` + `PushManager`, absents de happy-dom), parsing du payload push extrait en **fonction pure** pour être testable hors service worker, rendu de la bottom nav par rôle, et extension de `use_offline_queue.spec.ts` (déduplication, migration IDB v1→v2, store `failed`).
- **Japa fonctionnel** : routes d'abonnement push (création, ré-abonnement idempotent, suppression, 401 sans auth, cloisonnement entre utilisateurs). Modèle : `tests/functional/notifications/notifications.spec.ts`.
- **Japa unit** : `web_push_service` avec `web-push` mocké — un 410 supprime bien la ligne.

---

## 5. Dette documentaire et incohérences relevées

À corriger dans un lot dédié (elles touchent le manifest et le README) :

- **`public/site.webmanifest` affiche « FleetAI »**, la seule graphie que `CLAUDE.md` interdit. La passe d'unification de marque #411 (changelog 2026-07-22) énumère les fichiers qu'elle a touchés — le manifest n'y est pas. Conséquence concrète : **l'app installée sur un écran d'accueil porte le mauvais nom.**
- Le même manifest a `theme_color: "#0066cc"` — une couleur qui n'appartient à aucune palette et qui contredit les deux `<meta name="theme-color">` de `resources/views/inertia_layout.edge` (`#faf6ee` / `#0f1a23`) — et `background_color: "#ffffff"`, qui donne un splash screen blanc à l'ouverture même en thème sombre.
- Ses icônes 192 et 512 sont déclarées `maskable` sans variante `any` distincte → rognées dans plusieurs contextes.
- **`docs/frontend/ui-map.md` annonce « SSR désactivé »** alors que `config/inertia.ts` et `vite.config.ts` l'activent, et que le `Dockerfile` s'en réclame.
- **`docs/frontend/pwa.md`** appelle l'app « Fleetide », et situe l'enregistrement du service worker dans `inertia/app.ts` alors qu'il se fait via `usePwaUpdate()` depuis `inertia/layouts/default.vue`. Son tableau « Comportements et limites » décrit un fonctionnement que §0 contredit.
- **`README.md` ne mentionne ni PWA, ni hors-ligne** — la fonctionnalité la plus différenciante du produit pour un usage à bord est invisible pour un lecteur externe.
- `inertia/layouts/default.vue` utilise une ancre `<a href="/dashboard">` pour le logo mobile — violation de `CLAUDE.md`, provoque un rechargement complet.
- `config/limiter.ts` référence `InferLimiters` dans son `declare module` sans l'importer. Sans effet aujourd'hui, mais ça remontera au `typecheck` dès qu'on touchera ce fichier — ce qu'exige la phase C.

---

## 6. Décision

**Faire la phase A.** Elle répond à « terrain » et « push » pour 4 à 6 semaines, et sa première étape (A.0) répare une fonctionnalité déjà payée mais non livrée.

**Ne pas faire de natif maintenant.** Le GPS en tâche de fond et le NMEA sont de vrais besoins, mais ce sont _deux_ fonctionnalités : elles ne justifient pas de construire une API pour 64 contrôleurs puis de réécrire 68 écrans. Les réévaluer une fois la phase A livrée et mesurée — si le GPS de fond reste le manque n°1 remonté par les utilisateurs, c'est à ce moment-là qu'une coquille native devient un arbitrage honnête, et pas avant.
