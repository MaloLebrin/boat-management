# 2026-06-25 — PWA : notifications cycle de vie SW + prompt d'installation

Compléments aux recommandations vite-plugin-pwa non couverts en V1.

**Fonctionnalités :**

- **`usePwaUpdate`** : utilise `useRegisterSW` (`virtual:pwa-register/vue`) pour afficher un toast « Application prête pour une utilisation hors-ligne » au premier précache complet, et planifie une vérification horaire des mises à jour SW (`registration.update()`).
- **`usePwaInstall`** : capture l'événement `beforeinstallprompt` (état partagé au niveau module) et expose `canInstall` + `promptInstall()`. Le bouton d'installation s'affiche dans la sidebar (`AsideMenu.vue`) quand le navigateur autorise l'install, puis disparaît après `appinstalled`.
- **Alias Vitest** : `virtual:pwa-register/vue` résolu vers un stub de test pour isoler `usePwaUpdate` dans les tests unitaires.
- **i18n** : clés `pwa.offlineReady` et `pwa.install` ajoutées en FR et EN.
- **Types** : `/// <reference types="vite-plugin-pwa/client" />` ajouté dans `inertia/shims.ts`.

**Routes concernées :** aucune.

---
