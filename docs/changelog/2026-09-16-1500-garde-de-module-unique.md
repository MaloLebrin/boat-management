# Une seule garde de module de plan : `requireModulePlan({ feature })`

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.3.

## Problème

Le gating par module (CRM & Facturation, Location) existait sous deux formes :
un middleware dédié aux réservations (`RequireReservationsPlanMiddleware`,
#595) et trois copies de `loadOrgForWrite` / `loadOrgAndAssertEnterprise`
dans les contrôleurs clients, factures et périodes tarifaires — même
séquence (charger l'organisation, `assertCanManage*`, attraper
`QuotaExceededError`, flasher `flash.quota.<feature>Exceeded`, rediriger vers
la facturation, renvoyer `null`) répétée sur 17 actions.

## Changement

- `app/middleware/require_module_plan_middleware.ts`, enregistré
  `requireModulePlan` dans `start/kernel.ts`, paramétré par la capacité :
  `middleware.requireModulePlan({ feature: 'clients' | 'invoices' | 'pricing' | 'reservations' })`
  (type `ModulePlanFeature` dans `shared/types/plan.ts`). Sortie identique
  partout : flash `flash.quota.<feature>Exceeded` + redirection
  `BILLING_SETTINGS_PATH`. Il remplace `RequireReservationsPlanMiddleware`
  (supprimé) sur `start/routes/reservations.ts` et le sous-groupe réservations
  de `start/routes/boats.ts`.
- `start/routes/invoices.ts` et `start/routes/clients.ts` : les routes
  d'écriture (création, édition, envoi, conversion, paiement, suppression,
  anonymisation) passent dans un sous-groupe gardé ; les lectures (index,
  fiche, PDF, export RGPD) restent hors garde pour préserver l'**accès
  résiduel en lecture seule après résiliation** (#332), toujours décidé par
  `loadOrgForRead` dans le contrôleur. `ClientMedia` garde sa propre garde.
- `start/routes/pricing.ts` : tout le groupe est gardé (aucun accès résiduel).
- Contrôleurs `invoices`, `clients`, `pricing_seasons` : les copies
  disparaissent, remplacées par un `loadOrg(auth)` minimal qui ne protège plus
  que l'utilisateur sans organisation (#279, `UserNotInOrganizationError`
  traduite par le handler global). 17 appels simplifiés, `QuotaService` retiré
  du constructeur de `PricingSeasonsController`.
- Hors périmètre volontaire : les `catch (QuotaExceededError)` des autres
  contrôleurs (IA, export, membres…) ne sont pas redondants au sens strict —
  clés de flash différentes du handler (`aiTokensExceeded` vs
  `ai_tokensExceeded`), cibles de redirection spécifiques. À traiter avec les
  domaines concernés (vague 2).

## Tests

- `tests/unit/middleware/require_module_plan_middleware.spec.ts` (9 tests,
  écrits avant le middleware) : passage et refus pour chacune des quatre
  capacités (message et cible), erreur inattendue propagée.
- Caractérisation existante conservée : `billing/module_gating`,
  `billing/module_readonly_access`, `billing/module_deactivation`,
  `billing/grandfathering`, `invoices/*`, `clients/*`, `pricing/*`,
  `boats/reservations`, `boats/rental_contracts`, `boats/inspections`,
  `reservations/*` (192 tests) ; suite backend complète, `pnpm lint`,
  `tsc -b`, `node ace build`.
