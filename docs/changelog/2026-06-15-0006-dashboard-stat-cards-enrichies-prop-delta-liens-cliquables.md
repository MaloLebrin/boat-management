# 2026-06-15 — Dashboard : stat-cards enrichies — prop delta, liens cliquables, icônes (#39)

**Amélioration UX — Dashboard**

Les 5 stat-cards du dashboard affichaient uniquement un chiffre sans contexte. La prop `delta` (déjà présente dans `BaseStatCard` mais jamais alimentée) est maintenant renseignée depuis le service.

- **`shared/types/dashboard.ts`** : ajout du type `DashboardStatDeltas` (5 compteurs contextuels) et du champ `deltas` dans `DashboardStats`
- **`app/services/dashboard_service.ts`** : calcul des deltas — `boatsInAlert` (bateaux avec maintenance urgente), `boatsWithEngine/Sail/Rig` (bateaux équipés), `overdueCount` (tâches en retard)
- **`inertia/components/base/BaseStatCard.vue`** : ajout prop `href` (rend la carte cliquable via `<a>`) + slot `#icon` pour icône contextuelle
- **`inertia/pages/dashboard.vue`** : chaque carte reçoit `delta`, `href` (/boats ou /planning) et une icône SVG (bateau, engrenage, voile, mât, clé)
- **i18n** : 10 nouvelles clés `dashboard.stats.delta.*` dans `fr/dashboard.json` et `en/dashboard.json`
