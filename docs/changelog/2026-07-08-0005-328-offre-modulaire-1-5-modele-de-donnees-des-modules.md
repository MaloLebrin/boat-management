# 2026-07-08 — [#328] Offre modulaire 1/5 : modèle de données des modules

Socle du système de modules add-ons (épic #327). Aucun changement de comportement utilisateur : cette brique est consommée par les lots suivants (résolution des quotas effectifs #329, sync Stripe #330).

- **Types partagés** (`shared/types/plan.ts`) : `PlanModule` (`charter` | `crm_invoicing`), `ModuleSource` (`subscription` | `granted`), `PLAN_MODULES`, `MODULE_PRICES` (15 €/mois, 12 €/mois en annuel), `MODULE_FLAGS` (mapping module → flags de `PlanQuotas` accordés : `charter` → `canManagePricing` ; `crm_invoicing` → `canManageClients` + `canManageInvoices`), garde `isPlanModule`.
- **Migration** `create_organization_modules_table` : `organization_id` (FK cascade), `module`, `source` (défaut `subscription` ; `granted` = offert/grandfathering), `stripe_subscription_item_id` nullable, contrainte unique (`organization_id`, `module`), CHECK sur `module` et `source`.
- **Modèle** `OrganizationModule` + relation `Organization.modules` (hasMany).
- **Service** `OrganizationModuleService` : `getActiveModules`, `hasModule`, `grantModule` (idempotent, ne requalifie jamais la `source` d'une ligne existante), `revokeModule` (ne retire que les modules `subscription` par défaut — un module offert survit à la sync Stripe).
- **Tests** : taxonomie des modules (unit), service + contraintes DB + cascade (fonctionnels).
