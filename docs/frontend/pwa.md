# PWA — Mode hors-ligne (Progressive Web App)

## Vue d'ensemble

Fleetide est une PWA installable sur mobile et desktop. Le mode hors-ligne permet de **consulter les pages déjà visitées** et de **saisir des données sans connexion** (journal de bord, avitaillement). Les entrées sont stockées localement et synchronisées automatiquement au retour de la connexion.

---

## Architecture

```
vite-plugin-pwa (Workbox)
  └── Service Worker généré automatiquement
        ├── Précache : JS, CSS, images, polices (globPatterns)
        └── Runtime cache (NetworkFirst) :
              /boats/*, /navigation/*, /planning/*
              → timeout 3 s → fallback cache (7 jours, 30 entrées max)

IndexedDB (via `idb`)
  └── DB : fleetide-offline-queue (v2)
        ├── Store : actions (autoIncrement id)
        │     { type, url, method, payload, createdAt }
        └── Store : failed (autoIncrement id) — refus 4xx conservés (#487)
              { type, url, method, payload, createdAt, failedAt, errors }

Composables
  ├── useNetworkStatus   — réactivité navigator.onLine
  ├── useOfflineQueue    — enqueue / drainQueue / pendingCount
  ├── usePwaUpdate       — notification "prête hors-ligne" + vérification périodique des mises à jour SW
  └── usePwaInstall      — prompt d'installation PWA (beforeinstallprompt)
```

---

## Service Worker

Depuis #496, le service worker est un **fichier source du projet** — `inertia/sw.ts` — bundlé par
`vite-plugin-pwa` en stratégie **`injectManifest`** (le plugin ne fait plus qu'injecter le
manifeste de précache dans `self.__WB_MANIFEST` et bundler le fichier). C'est ce qui permet d'y
écrire du code custom, notamment les gestionnaires `push`/`notificationclick` du Web Push
(#497/#498).

Configuration `VitePWA` (`vite.config.ts`) :

| Option                | Valeur                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `strategies`          | `injectManifest` — SW custom, plus de génération automatique                                                  |
| `srcDir` / `filename` | `inertia` / `sw.ts` — bundlé en `sw.js`                                                                       |
| `registerType`        | `autoUpdate` — mise à jour silencieuse au rechargement                                                        |
| `injectRegister`      | `false` — enregistrement manuel via `usePwaUpdate` (`useRegisterSW`)                                          |
| `manifest`            | `false` — manifest servi depuis `public/site.webmanifest`                                                     |
| `outDir`              | `build/public` — `sw.js` sort à la **racine web**, pas dans `/assets`                                         |
| `buildBase`           | `/` — le SW est enregistré à `/sw.js`                                                                         |
| `scope`               | `/` — le SW contrôle toutes les navigations                                                                   |
| `injectManifest`      | précache `assets/**` (`**/*.{js,css,ico,png,svg,woff2}`) + `/offline.html`                                    |
| `devOptions`          | `{ enabled: NODE_ENV !== 'test', type: 'module' }` — SW testable en `pnpm dev`, coupé pendant `node ace test` |

### Ce que `inertia/sw.ts` fait explicitement

La bascule `generateSW` → `injectManifest` a supprimé plusieurs comportements implicites, réécrits
dans le SW :

- **`self.skipWaiting()` + `clients.claim()`** (en natif, pas de workbox-core) — n'étaient plus
  injectés par `registerType: 'autoUpdate'` ;
- **précache** : `precacheAndRoute(self.__WB_MANIFEST)` + `cleanupOutdatedCaches()` ;
- **NetworkFirst** sur les navigations `/boats|/navigation|/planning` (3 s de timeout, 30 entrées,
  7 jours, réponses 200) — restreint à `request.mode === 'navigate'` : les visites Inertia (XHR
  `X-Inertia`) répondent du JSON sur les mêmes URLs, les cacher sous la même clé servirait du JSON
  brut à une navigation hors-ligne ;
- **`NavigationRoute(NetworkOnly)`** sur toutes les autres navigations (denylist `/api`, `/up`) :
  indispensable pour que le repli fonctionne — `setCatchHandler` ne rattrape que les requêtes
  **gérées par une route**, une navigation sans route irait au réseau et échouerait sans repli ;
- **repli hors-ligne** : `setCatchHandler` sert le `/offline.html` précaché pour tout `document`
  dont la requête échoue.

**Stratégie NetworkFirst** : le SW tente le réseau en priorité. Si la requête échoue ou dépasse 3 secondes, il sert le cache. Les pages non encore visitées (non cachées) tombent sur `offline.html`.

CSP : `config/shield.ts` garde `defaultSrc: ["'self'"]`, qui couvre `worker-src` par cascade — un
SW de même origine passe sans changement.

### Pourquoi le SW sort à la racine web (#482)

Le build client Vite écrit dans `build/public/assets` (imposé par `@adonisjs/inertia/vite`) et `base` vaut `/assets/`. Sans configuration explicite, `vite-plugin-pwa` émettait donc `sw.js` dans `/assets/` et l'enregistrait avec un scope `/assets/` : un tel SW **ne contrôle jamais** une navigation vers `/boats` ou `/planning`, et tout le mode hors-ligne était inopérant. Trois options le corrigent :

- `outDir: 'build/public'` — `sw.js` (et le runtime `workbox-*.js`) sortent à la racine web du build ;
- `buildBase: '/'` — `useRegisterSW` enregistre `/sw.js` (et non `/assets/sw.js`) ;
- `scope: '/'` — le SW contrôle toute l'origine.

Deuxième piège : `offline.html` vit dans `public/` et n'est copié dans `build/public` **qu'après** le build Vite (metaFiles de `adonisrc.ts`) — il est donc introuvable au moment où Workbox globbe le répertoire de sortie. Il est précaché explicitement via `additionalManifestEntries`, avec une révision MD5 calculée depuis `public/offline.html`.

> ⚠️ L'alternative « servir `/assets/sw.js` avec un en-tête `Service-Worker-Allowed: /` » a été écartée : elle casserait le jour où `assetsUrl` pointe vers un CDN (cross-origin).

En production, `sw.js` est servi par le middleware statique (`build/public` = racine du serveur statique). En dev, `devOptions` sert le SW en module — le comportement final se valide malgré tout sur build réel (`node ace build`), c'est ce que fait le garde-fou `pnpm check:sw` (#483).

---

## Web Push (#498)

Backend : voir `docs/domain/notifications.md` (#497). Côté front :

- **`inertia/lib/push_payload.ts`** — parsing du payload en **fonction pure** (testable sans
  contexte SW). Ne lève jamais : le SW doit **toujours** appeler `showNotification`, même sur un
  payload vide/invalide — Safari et Chrome désabonnent un endpoint qui reçoit des push muets. Un
  `tag` par type coalesce les alertes récurrentes ; une `actionUrl` non relative est remplacée par
  `/notifications` (pas d'ouverture hors app).
- **`inertia/sw.ts`** — gestionnaires `push` (showNotification systématique) et
  `notificationclick` : `clients.matchAll` → fenêtre existante `focus()` +
  `postMessage({ type: 'push:navigate', url })`, sinon `openWindow(url)`. Le layout
  (`default.vue`) écoute ces messages et fait un `router.visit(url)` — navigation Inertia, pas de
  rechargement complet.
- **`use_push_notifications.ts`** — `isSupported`, `permission`, `isSubscribed`, `subscribe()`,
  `unsubscribe()`, `urlBase64ToUint8Array`. **`subscribe()` n'est appelé que depuis un geste
  utilisateur** (exigence navigateur — jamais de prompt à froid, jamais au montage) ; la clé VAPID
  vient de la shared prop `vapidPublicKey`.
- **`PushOptInCard.vue`** — opt-in contextuel monté dans `default.vue` : n'apparaît qu'à partir de
  la **2e session** (compteur en localStorage, marqueur de session en sessionStorage), dismissible
  (`localStorage`), masqué si permission refusée ou déjà abonné. Sur iOS hors PWA installée, la
  carte montre `IosInstallHint.vue` à la place du bouton.
- **`IosInstallHint.vue`** — Web Push iOS exige la PWA installée (16.4+) et Safari n'émet jamais
  `beforeinstallprompt` : instructions illustrées « Partager → Sur l'écran d'accueil ». Détection
  via `isIos()` / `isStandalone()` (`use_pwa_install.ts`).
- **`SettingsNotificationsTab.vue`** (`/settings/notifications`) — gestion permanente : activer /
  désactiver cet appareil, liste des appareils abonnés (`user_agent`, dates) et retrait par
  appareil (`DELETE /push/subscriptions/:id`).

---

## Manifest (`public/site.webmanifest`)

```json
{
  "name": "Fleetide",
  "short_name": "Fleetide",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0066cc",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/web-app-manifest-192x192.png", "sizes": "192x192", "purpose": "maskable" },
    { "src": "/web-app-manifest-512x512.png", "sizes": "512x512", "purpose": "maskable any" }
  ]
}
```

L'app s'installe sur Android/iOS via le bouton « Ajouter à l'écran d'accueil » du navigateur.

---

## Composables

### `useNetworkStatus`

`inertia/composables/use_network_status.ts`

Expose `isOnline` (ref booléenne) synchronisée sur les événements `online` / `offline` du navigateur. Nettoyage automatique via `onUnmounted`.

```ts
const { isOnline } = useNetworkStatus()
```

### `useOfflineQueue`

`inertia/composables/use_offline_queue.ts`

État partagé au niveau module (une seule instance IndexedDB, `pendingCount` et `isSyncing` globaux).

| Export                    | Type                  | Description                                                     |
| ------------------------- | --------------------- | --------------------------------------------------------------- |
| `pendingCount`            | `Ref<number>`         | Nombre d'actions en attente                                     |
| `failedCount`             | `Ref<number>`         | Nombre d'actions refusées en 4xx, conservées (#487)             |
| `failedActions`           | `Ref<FailedAction[]>` | Actions en échec — payload + erreurs de validation conservés    |
| `isSyncing`               | `Ref<boolean>`        | Sync en cours                                                   |
| `enqueue(action)`         | `async`               | Ajoute une action en IndexedDB, affiche un toast info           |
| `drainQueue()`            | `async`               | Rejoue les actions une par une via `router.post/patch/put`      |
| `retryFailedAction(id)`   | `async`               | Remet une action en échec dans la file, puis relance la synchro |
| `discardFailedAction(id)` | `async`               | Abandon explicite — seule voie de suppression d'un échec        |

**Interface `QueuedAction`**

```ts
interface QueuedAction {
  id?: number
  type: string // identifiant lisible ex: 'create-navigation-log'
  url: string // URL Inertia cible
  method: 'post' | 'patch' | 'put'
  payload: Record<string, unknown>
  createdAt: string // ISO 8601
}
```

**Comportement de `drainQueue`**

- Traite les actions dans l'ordre d'insertion (FIFO).
- En cas de succès serveur : supprime l'entrée IDB, décrémente `pendingCount`, passe à l'action suivante (récursion).
- En cas de refus 4xx (validation) : l'action est **déplacée dans le store `failed`** avec les erreurs renvoyées — jamais détruite (#487) — puis la file continue avec l'action suivante. Un toast error est affiché.
- En cas de 5xx / erreur réseau : l'action reste en file et sera rejouée à la prochaine reconnexion.
- `isSyncing` empêche les appels concurrents.

### `usePwaUpdate`

`inertia/composables/use_pwa_update.ts`

Utilise `useRegisterSW` de `virtual:pwa-register/vue` (vite-plugin-pwa) pour :

- Afficher un toast `success` quand le SW s'active pour la première fois et que le précache est complet (`offlineReady`).
- Planifier une vérification des mises à jour SW toutes les heures via `registration.update()`.

```ts
usePwaUpdate() // appelé dans default.vue, aucune valeur retournée
```

### `usePwaInstall`

`inertia/composables/use_pwa_install.ts`

Gère l'événement `beforeinstallprompt` pour exposer un bouton d'installation natif.

État partagé au niveau module (un seul listener, `canInstall` global).

| Export          | Type           | Description                              |
| --------------- | -------------- | ---------------------------------------- |
| `canInstall`    | `Ref<boolean>` | `true` si le navigateur permet l'install |
| `promptInstall` | `async`        | Ouvre le prompt d'installation natif     |

Le bouton d'installation s'affiche dans `AsideMenu.vue` au-dessus du bouton « Déconnexion » quand `canInstall` est vrai.

---

## Intégration dans le layout

`inertia/layouts/default.vue` — déclenche la synchronisation automatiquement :

```ts
const { isOnline } = useNetworkStatus()
const { drainQueue } = useOfflineQueue()
usePwaUpdate() // notification offlineReady + vérification horaire des mises à jour

watch(isOnline, (online) => {
  if (online) drainQueue()
})
```

Un banner s'affiche dans le template quand `!isOnline` :

```
"Vous êtes hors-ligne — les modifications seront synchronisées à la reconnexion"
```

---

## Formulaires offline-aware

### Pattern d'implémentation

Les formulaires qui supportent la saisie offline suivent ce pattern dans `handleSubmit` :

```ts
function handleSubmit() {
  // Champs datetime-local : l'offset est relu ici, pas à la construction du
  // formulaire, pour qu'une saisie mise en file reparte avec le fuseau dans
  // lequel elle a été tapée (#452).
  form.tzOffsetMinutes = tzOffsetMinutes()

  if (!isOnline.value) {
    enqueue({
      type: 'create-navigation-log', // type lisible
      url: `/boats/${props.boat.id}/navigation-logs`,
      method: 'post',
      payload: form.data() as Record<string, unknown>,
    })
    emit('close')
    return
  }
  // Chemin normal (en ligne)
  form.post(`/boats/${props.boat.id}/navigation-logs`, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
```

> Un formulaire qui porte un `<input type="datetime-local">` doit inclure
> `tzOffsetMinutes` dans `useForm` : `payload: form.data()` l'embarque alors dans
> la file hors-ligne, et le serveur peut reconstruire l'instant visé au rejeu
> (`toUtcFromLocalInput`). Sans lui, la valeur naïve serait interprétée comme
> UTC et décalée de l'offset du fuseau.

### Formulaires supportés

| Composant                     | Type action              | URL                                             | Méthode |
| ----------------------------- | ------------------------ | ----------------------------------------------- | ------- |
| `NavigationLogForm.vue`       | `create-navigation-log`  | `POST /boats/:id/navigation-logs`               | post    |
| `BoatFuelLogForm.vue`         | `create-fuel-log`        | `POST /boats/:id/fuel-logs`                     | post    |
| `NavigationLogUpdateForm.vue` | `update-navigation-log`  | `PATCH /boats/:id/navigation-logs/:logId`       | patch   |
| `NavigationLogCloseForm.vue`  | `close-navigation-log`   | `PATCH /boats/:id/navigation-logs/:logId/close` | patch   |
| `EngineHoursQuickAddForm.vue` | `increment-engine-hours` | `PATCH /boats/:id/engines/:engineId/hours`      | patch   |

---

## Messages i18n

Clés dans `resources/lang/{fr,en}/common.json` :

| Clé                    | FR                                                                             | EN                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `offline.banner`       | Vous êtes hors-ligne — les modifications seront synchronisées à la reconnexion | You're offline — changes will be saved and synced when reconnected |
| `offline.savedQueue`   | Enregistré hors-ligne — sera synchronisé à la reconnexion                      | Saved offline — will sync when reconnected                         |
| `offline.syncing`      | Synchronisation en cours…                                                      | Syncing…                                                           |
| `offline.syncSuccess`  | {count} entrée(s) synchronisée(s)                                              | {count} entry(ies) synced                                          |
| `offline.syncRejected` | Refusée par le serveur — conservée dans les échecs                             | Rejected by the server — kept in failed actions                    |
| `offline.failed.*`     | Section « actions en échec » (titre, motif, réessayer, abandonner)             | Failed actions section (title, reason, retry, discard)             |
| `pwa.offlineReady`     | Application prête pour une utilisation hors-ligne                              | App is ready for offline use                                       |
| `pwa.install`          | Installer l'application                                                        | Install app                                                        |

---

## Tests

### Garde-fou de build — `scripts/check_sw_build.mjs` (#483)

Les specs Vitest ci-dessous testent les **composables**, jamais le service
worker généré par Workbox — c'est ce trou qui a laissé passer #482. Le
garde-fou s'exécute sur l'**artefact de build réel** (`node ace build`
préalable) via `pnpm check:sw`, et tourne en CI dans le job `build` :

- `build/public/sw.js` existe à la racine web (pas sous `/assets/`) ;
- le SW s'évalue sans lever dans un contexte mocké `node:vm` (le chunk AMD
  `workbox-*.js` voisin est résolu par un shim `importScripts` ; les erreurs
  Workbox comme `non-precached-url` arrivent en rejet de promesse asynchrone) ;
- les listeners `install`/`activate`/`fetch` sont enregistrés ;
- `/offline.html` figure dans le manifeste de précache ;
- le bundle client enregistre `/sw.js` avec un scope `/`.

### `use_offline_queue.spec.ts`

Tests Vitest avec `fake-indexeddb` (IDB réinitialisé entre chaque test) et mocks `vue-sonner` + `@inertiajs/vue3`.

Cas couverts : `enqueue`, `drainQueue`, gestion de `pendingCount`, succès et erreur serveur.

### `use_pwa_install.spec.ts`

Mock de `beforeinstallprompt` + `appinstalled`. Cas couverts :

- `canInstall` false par défaut, true après l'événement
- `promptInstall()` appelle `prompt()` sur l'événement différé
- `canInstall` repasse à false sur `accepted`, reste true sur `dismissed`
- `promptInstall()` sans prompt différé ne lève pas d'erreur
- Réinitialisation sur `appinstalled`

### `use_pwa_update.spec.ts`

Mock de `virtual:pwa-register/vue` via alias Vitest + mock de `vue-sonner`. Cas couverts :

- `useRegisterSW` appelé avec `immediate: true`
- Toast `success` affiché quand `offlineReady` passe à `true`
- Pas de toast si `offlineReady` reste `false`
- `registration.update()` appelé toutes les heures via `onRegisteredSW`
- `onRegisteredSW` avec `undefined` ne lève pas d'erreur

---

## Comportements et limites

| Comportement                    | Note                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pages non visitées**          | Servies par `public/offline.html` via `navigateFallback` Workbox — message bilingue + bouton "réessayer".                                               |
| **Erreur 5xx / réseau**         | L'action reste en file et `isSyncing` est réinitialisé via `onFinish`. Elle sera rejouée à la prochaine reconnexion.                                    |
| **Erreur 4xx (validation)**     | L'action passe dans le store `failed` avec ses erreurs (#487). L'UI propose « Réessayer » ou « Abandonner » — rien n'est détruit sans action explicite. |
| **Détection de conflit**        | Les actions PATCH incluent `_expectedUpdatedAt`. Le backend rejette (flash `conflict`) si la sortie a été modifiée entre-temps.                         |
| **Last-write-wins (créations)** | Les créations (POST) n'ont pas de conflit — chaque enregistrement est nouveau.                                                                          |

---

## Ajouter le support offline à un nouveau formulaire

1. Importer les composables :

   ```ts
   import { useNetworkStatus } from '~/composables/use_network_status'
   import { useOfflineQueue } from '~/composables/use_offline_queue'
   const { isOnline } = useNetworkStatus()
   const { enqueue } = useOfflineQueue()
   ```

2. Dans `handleSubmit`, brancher le chemin offline avant l'appel Inertia normal :

   ```ts
   if (!isOnline.value) {
     enqueue({ type: 'my-action', url: '/my/route', method: 'post', payload: form.data() })
     return
   }
   ```

3. Aucune modification backend nécessaire — la sync utilise les routes existantes.

4. Ajouter un test dans `tests/inertia/` couvrant les deux chemins (online + offline).
