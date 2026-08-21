# 2026-07-17 — Correctif : le deep-link `?tab=` de la fiche bateau est respecté au chargement (#359)

Charger directement `/boats/:id?tab=tasks` (nouvel onglet, F5) affichait toujours l'onglet Aperçu, alors que l'URL conservait bien `?tab=tasks`.

- **Cause** : `inertia/pages/boats/show.vue` initialisait le `ref` `tab` à `'overview'` puis ne lisait `window.location.search` que dans `onMounted` — un rendu initial sur Aperçu suivi d'une bascule reactive, au lieu d'une valeur correcte dès le premier rendu.
- **Correctif** : le `tab` initial est désormais calculé de façon synchrone, au moment de la création du `ref` (`getInitialTab()`), à partir de `window.location.search` (garde `typeof window !== 'undefined'` pour le SSR) et validé contre la liste des onglets connus (`VALID_TABS`) — une valeur inconnue ou absente retombe sur `'overview'`.
