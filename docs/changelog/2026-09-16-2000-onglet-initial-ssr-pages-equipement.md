# 2026-09-16 — Pages d'équipement : l'onglet demandé dès le rendu serveur (vague 0.5)

Six pages à onglets (moteur, pièce moteur, voile, gréement, équipement de
sécurité, équipement générique) lisaient `?tab=` dans `onMounted`, avec le
même bloc copié six fois : le rendu SSR partait de l'onglet par défaut puis
basculait à l'hydratation — le flash que #463 avait corrigé sur la fiche
bateau, restait sur ses sous-pages.

- **Composable.** `inertia/composables/use_tab_deep_link.ts` : `useTabDeepLink({ tabs, defaultTab, initialTabParam })` — l'onglet initial vient de la valeur vue par le serveur (prop `initialTab`), `window.location` ne sert que si elle n'est pas fournie ; la synchronisation de l'URL (`history.replaceState`, paramètre retiré sur l'onglet par défaut) est celle de `useBoatShowTabs`.
- **Pages.** Les six pages remplacent leur `ref` + `onMounted` + `watch` par le composable et déclarent la prop `initialTab`.
- **Contrôleurs.** `app/utils/inertia_tab.ts#initialTabParam(request)` (extrait de `BoatsController.show`) alimente `initialTab` dans les six rendus : `showEngine`, `showSail`, `showRig`, `BoatGenericEquipmentController.show`, `BoatSafetyEquipmentController.show`, `BoatEngineParts.show`.
- **Tests.** `tests/inertia/use_tab_deep_link.spec.ts` (5 tests : serveur prioritaire, repli `window`, valeur inconnue, URL synchronisée), `tests/inertia/equipment_show_initial_tab.spec.ts` (3 tests, rouges avant : voile et équipement générique ouvrent l'onglet demandé sans lire `window`), `tests/functional/boats/equipment_show_initial_tab.spec.ts` (les six routes transmettent `initialTab`, `null` sans paramètre).
