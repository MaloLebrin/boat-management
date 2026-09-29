# 2026-09-29 — Filet cross-org et organization_id sur les enfants chauds (#855)

Le cloisonnement multi-tenant ne tenait que par le `where('organizationId')` de chaque service. Une route nouvelle qui charge un enfant par id seul ne cassait aucun test.

- **Filet.** `tests/functional/security/cross_org_routes.spec.ts` parcourt les routes authentifiées du routeur. Un admin Entreprise de l'organisation A appelle chaque URL dont les paramètres pointent vers B. Attendu : 403, 404, 422, ou une redirection hors login et hors facturation. Un 200, ou un corps qui contient le marqueur de B, échoue. Les routes sans id d'entité sont ignorées. Les exclusions (appels Mistral, paramètre « fournisseur ») sont explicites : une route nouvelle non classée fait échouer le test.
- **Colonne.** `organization_id` indexée sur `boat_maintenance_events` et `boat_maintenance_tasks` (NOT NULL, reprise depuis le bateau) et sur `media` (nullable : un avatar peut n'avoir aucune organisation). Pleins et incidents l'avaient déjà. Les services la renseignent ; un hook `beforeCreate` couvre fabriques et seeders.
- **RLS.** Pas activée. `SET LOCAL` exige une transaction par requête, y compris les jobs, et la colonne manque encore sur le reste des enfants. La décision est dans `docs/architecture/multi-tenant.md`.
- **Correctif trouvé par le filet.** `POST` et `DELETE /boats/:id/owners` laissaient `BoatNotFoundError` remonter : un bateau d'une autre organisation répondait 500. Ils redirigent vers `/boats`, comme les autres routes de la fiche.
- **Tests.** Le filet ci-dessus ; l'héritage de l'organisation à la création d'une tâche ou d'un événement ; l'import CSV et l'upload photo posent la colonne ; les deux routes propriétaires redirigent.
