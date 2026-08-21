# 2026-07-23 — Dashboard dédié « Mes interventions » pour le rôle mécanicien (#417)

Audit UX du 2026-07-19 : un mécanicien (capabilities limitées à `maintenance.view/create/edit`) atterrissait sur le même `/dashboard` que le staff — KPIs flotte, ports, voiles, gréements, CTA « Nouveau bateau » et lien `/boats`, tous hors de son périmètre.

- **Dashboard dédié** : `HomeController#index` détecte le rôle `mechanic` (comme il redirige déjà `boat_owner` vers `/owner/boats`) et rend une page `dashboard/mechanic` recentrée sur la maintenance, sans KPIs flotte ni CTA hors périmètre. Les autres rôles (admin, member) conservent le dashboard complet.
- **Contenu** : deux compteurs (interventions en retard / à venir), une alerte si des tâches sont en retard, et deux listes (en retard, à venir) alimentées par `PlanningService.getPlanningForOrg` (`overdueTasks` / `soonTasks`). Aucun lien vers la fiche bateau (le mécanicien n'a pas `boats.view`) : accès rapide au **planning** (`/planning`) et à l'**historique de maintenance** (`/maintenance/history`), tous deux déjà accessibles au mécanicien.
- **Composants** : `inertia/pages/dashboard/mechanic.vue` + `inertia/components/dashboard/MechanicInterventionRow.vue`.
- **i18n** : clés `dashboard.mechanic.*` (EN + FR, vouvoiement).
- **Seeder** : `test_plans_seeder` ajoute `pro-mecano@test.local` (rôle `mechanic`, mot de passe `Password1!`) dans la Pro org + 2 interventions ouvertes (1 en retard, 1 à venir, `dueAt` relatif au seed) pour tester le dashboard.
- **Tests** : `tests/functional/dashboard/mechanic_dashboard.spec.ts` (le mécanicien reçoit `dashboard/mechanic` avec les tâches réparties en retard/à venir ; admin & member gardent `dashboard`) et `tests/inertia/mechanic_dashboard.spec.ts` (compteurs, listes, états vides, liens planning/historique).
