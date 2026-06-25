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
  └── DB : fleetide-offline-queue
        └── Store : actions (autoIncrement id)
              { type, url, method, payload, createdAt }

Composables
  ├── useNetworkStatus   — réactivité navigator.onLine
  └── useOfflineQueue    — enqueue / drainQueue / pendingCount
```

---

## Service Worker

Configuré dans `vite.config.ts` via `VitePWA` :

| Option           | Valeur                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `registerType`   | `autoUpdate` — mise à jour silencieuse au rechargement                 |
| `injectRegister` | `false` — enregistrement manuel dans `inertia/app.ts`                  |
| `manifest`       | `false` — manifest servi depuis `public/site.webmanifest`              |
| Précache         | `**/*.{js,css,ico,png,svg,woff2}`                                      |
| Runtime cache    | `/boats/*`, `/navigation/*`, `/planning/*` — NetworkFirst, 3 s timeout |

**Stratégie NetworkFirst** : le SW tente le réseau en priorité. Si la requête échoue ou dépasse 3 secondes, il sert le cache. Les pages non encore visitées (non cachées) restent inaccessibles hors-ligne.

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

| Export            | Type           | Description                                                |
| ----------------- | -------------- | ---------------------------------------------------------- |
| `pendingCount`    | `Ref<number>`  | Nombre d'actions en attente                                |
| `isSyncing`       | `Ref<boolean>` | Sync en cours                                              |
| `enqueue(action)` | `async`        | Ajoute une action en IndexedDB, affiche un toast info      |
| `drainQueue()`    | `async`        | Rejoue les actions une par une via `router.post/patch/put` |

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
- En cas d'erreur serveur : **l'action est ignorée** (supprimée sans retry) pour ne pas bloquer la file. Un toast error est affiché.
- `isSyncing` empêche les appels concurrents.

---

## Intégration dans le layout

`inertia/layouts/default.vue` — déclenche la synchronisation automatiquement :

```ts
const { isOnline } = useNetworkStatus()
const { drainQueue } = useOfflineQueue()

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

### Formulaires supportés

| Composant               | Type action             | URL                               |
| ----------------------- | ----------------------- | --------------------------------- |
| `NavigationLogForm.vue` | `create-navigation-log` | `POST /boats/:id/navigation-logs` |
| `BoatFuelLogForm.vue`   | `create-fuel-log`       | `POST /boats/:id/fuel-logs`       |

---

## Messages i18n

Clés dans `resources/lang/{fr,en}/common.json` :

| Clé                   | FR                                                                             | EN                                                                 |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `offline.banner`      | Vous êtes hors-ligne — les modifications seront synchronisées à la reconnexion | You're offline — changes will be saved and synced when reconnected |
| `offline.savedQueue`  | Enregistré hors-ligne — sera synchronisé à la reconnexion                      | Saved offline — will sync when reconnected                         |
| `offline.syncing`     | Synchronisation en cours…                                                      | Syncing…                                                           |
| `offline.syncSuccess` | {count} entrée(s) synchronisée(s)                                              | {count} entry(ies) synced                                          |
| `offline.syncError`   | Erreur de synchronisation — action ignorée                                     | Sync error — action discarded                                      |

---

## Tests

`tests/inertia/use_offline_queue.spec.ts`

Tests Vitest avec `fake-indexeddb` (IDB réinitialisé entre chaque test) et mocks `vue-sonner` + `@inertiajs/vue3`.

Cas couverts :

- `enqueue` ajoute en IDB et affiche un toast info
- `enqueue` incrémente `pendingCount` correctement
- `drainQueue` appelle `router.post` / `router.patch` selon la méthode
- `drainQueue` supprime l'entrée IDB et réinitialise `pendingCount` en cas de succès
- `drainQueue` ne fait rien si la file est vide

---

## Limites connues (V1)

| Limite                              | Note                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| **Last-write-wins**                 | Pas de détection de conflit — la dernière sync écrase.                             |
| **Pages non visitées**              | Inaccessibles hors-ligne (pas d'app-shell). Prévu en V2.                           |
| **Erreur serveur = discard**        | Une action rejetée par le serveur est supprimée sans retry pour débloquer la file. |
| **Modifications offline seulement** | Les formulaires de mise à jour (edit) ne sont pas encore offline-aware.            |

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
