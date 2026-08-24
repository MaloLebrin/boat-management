# 2026-06-28 — Composant BaseSegmentedControl + i18n BoatShowTabHistory (issue #144)

- Nouveau composant `inertia/components/base/BaseSegmentedControl.vue` : groupe de boutons jointifs avec `v-model` (`string | number`)
- Tests Vitest complets dans `tests/inertia/base_segmented_control.spec.ts` (rendu, option active, émission, valeurs numériques)
- `BoatShowTabHistory.vue` : remplacement des `<button>` bruts par `<BaseSegmentedControl>` ; toutes les chaînes (filtres, recherche, sidebar, toggle Masquer/Détail, export PDF) passent désormais par `t()` avec les clés `boats.show.historyTab.*` en FR et EN
