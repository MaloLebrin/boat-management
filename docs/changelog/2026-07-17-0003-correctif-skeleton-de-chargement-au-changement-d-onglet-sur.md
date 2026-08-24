# 2026-07-17 — Correctif : skeleton de chargement au changement d'onglet sur la fiche bateau (#361)

Sur `/boats/:id`, chaque clic sur un onglet (History, Equipment, Tasks…) laissait la zone de contenu totalement vide pendant que Vue démontait/remontait le contenu (souvent volumineux) du nouvel onglet — perçu comme un plantage, surtout en dev.

- **Correctif** : `goToTab` (`inertia/pages/boats/show.vue`) affiche désormais un skeleton immédiatement au clic (`isTabLoading = true`), laisse le navigateur peindre cette frame (`nextTick` + `requestAnimationFrame`), puis bascule effectivement l'onglet — le montage lourd du contenu ne se produit donc jamais sur un écran vide.
- `BoatShowTabContent.vue` reçoit une nouvelle prop `isLoading` et affiche 4 `BaseSkeleton` à la place des onglets tant que la transition est en cours.
- `BaseTabs` est piloté par un event `@update:model-value="goToTab"` explicite (au lieu d'un `v-model` direct sur le `ref`), pour que tous les changements d'onglet (pills, boutons « + Ajouter »…) passent par ce même sas.
- Un clic sur l'onglet déjà actif ne déclenche aucun skeleton (no-op).
- **Tests** : `tests/inertia/boat_show_tab_loading.spec.ts`.
