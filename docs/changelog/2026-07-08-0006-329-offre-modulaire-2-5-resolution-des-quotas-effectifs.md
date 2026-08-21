# 2026-07-08 — [#329] Offre modulaire 2/5 : résolution des quotas effectifs (tier + modules)

Les capacités clients/pricing/invoices peuvent désormais venir du tier **ou** d'un module add-on actif. Aucun changement visible tant qu'aucun module n'est souscrit.

- **Helper pur partagé** `shared/helpers/plan.ts` : `resolveEffectiveQuotas(tier, modules)` — quotas du tier fusionnés avec les `MODULE_FLAGS` des modules actifs ; seule source de vérité back/front.
- **Backend** : `OrganizationModuleService.getEffectiveQuotas(org)` ; les 5 checks `QuotaService` concernés (`assertCanManageClients`, `canManagePricing`, `assertCanManagePricing`, `canManageInvoices`, `assertCanManageInvoices`) deviennent **async** et passent par les quotas effectifs (7 sites d'appel mis à jour). Les autres checks restent tier-only tant qu'aucun module ne les accorde.
- **Props Inertia** : nouvelle prop partagée `activeModules: PlanModule[]` (middleware Inertia), à côté de `currentPlan`.
- **Frontend** : nouveau composable `use_plan.ts` (`currentPlan`, `activeModules`, `effectiveQuotas` — mêmes règles de validation que le backend) ; `use_nav_sections.ts` consomme les quotas effectifs au lieu de lire `PLAN_LIMITS` directement.
- **Tests** : unit (résolution pure, non-mutation de `PLAN_LIMITS`), fonctionnels (gating Pro sans module → redirection ; Pro + module → accès ; module `granted` équivalent ; prop `activeModules` exposée), Vitest nav (modules → entrées Clients/Factures/Périodes tarifaires).
