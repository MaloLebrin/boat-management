# 2026-06-24 — PWA / mode offline (journal de bord et carburant)

Support hors-ligne pour les pages de navigation, permettant de consulter et saisir des données sans connexion.

**Fonctionnalités :**

- **Service Worker** généré par `vite-plugin-pwa` (Workbox) : précache des assets statiques (JS/CSS/images), cache NetworkFirst pour les pages `/boats/*`, `/navigation/*`, `/planning/*`
- **Manifest PWA** mis à jour (nom Fleetide, thème #0066cc, display standalone) — app installable sur mobile
- **Saisie offline** : les formulaires de création journal de bord (`NavigationLogForm`) et avitaillement (`BoatFuelLogForm`) détectent la connexion et enregistrent en IndexedDB si hors-ligne (toast informatif)
- **Sync automatique** au retour de connexion : le layout déclenchent `drainQueue()` qui rejoue les actions via `router.post/patch` et affiche un toast de succès/erreur
- **Composables** : `useNetworkStatus` (réactivité `navigator.onLine`) et `useOfflineQueue` (IndexedDB via `idb`)

**Routes concernées :** aucune nouvelle route — le SW cache les pages existantes.

**Notes :** En V1, last-write-wins pour les conflits. La navigation Inertia entre pages non-visitées reste bloquée offline (app-shell prévu en V2).
