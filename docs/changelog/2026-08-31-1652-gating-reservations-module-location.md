# 2026-08-31 — Réservations gatées par le module Location (#595)

Le bouton « Réservations » du menu menait au calendrier de la flotte pour toute organisation ayant `boats.view`, alors que le catalogue de l'offre modulaire (`docs/offre-modulaire.md`) range tout le domaine — réservations, états des lieux, contrats de location — dans le module **Location (charter)**, dont le gating était noté « partiel : le reste est ouvert ». Une organisation Pro sans le module voyait donc l'entrée de menu et accédait librement à la fonctionnalité.

## Nouveau flag `canManageReservations`

- `shared/types/plan.ts` : nouveau flag booléen dans `PlanQuotas` — `false` sur Starter et Pro, `true` sur Entreprise, accordé par `MODULE_FLAGS.charter` (comme `canManagePricing`). La résolution des quotas effectifs (`resolveEffectiveQuotas`) le fusionne sans changement.
- `QuotaService.canManageReservations` / `assertCanManageReservations` (quotas effectifs tier + modules) ; nouvelle valeur `reservations` dans `QuotaFeature` (`app/exceptions/quota_errors.ts`).

## Garde serveur

- Nouveau middleware `RequireReservationsPlanMiddleware` (`app/middleware/require_reservations_plan_middleware.ts`), sur le modèle de `RequirePortsPlanMiddleware` (#604) : flash `flash.quota.reservationsExceeded` + redirection vers `/settings/billing` (pattern #456, jamais de redirection muette vers le marketing).
- Enregistré dans `start/kernel.ts` (`middleware.requireReservationsPlan`), posé sur :
  - la route flotte `GET /reservations` (`start/routes/reservations.ts`) ;
  - le groupe des routes réservations par bateau (`start/routes/boats.ts`) : CRUD réservations, inspections (checklist, défauts, actions équipement, photos) et contrats de location — un deep-link ne contourne pas le module.

## Navigation

- `use_nav_sections.ts` : l'entrée « Réservations » (section business **et** raccourci bottom nav mobile) n'apparaît que si `effectiveQuotas.canManageReservations` — même garde que le serveur, sinon lien mort. Conséquence : sur Starter et Pro sans module, la section business peut désormais disparaître entièrement (elle était auparavant toujours présente grâce à cette entrée).

## i18n

- `flash.json` (EN/FR) : `quota.reservationsExceeded` nomme le module Location et les deux façons de l'obtenir (inclus en Entreprise, add-on sur Pro).
- Descriptions du module Location alignées sur son périmètre réel (réservations, états des lieux, contrats, tarifs) : `settings.json` (`billing.modules.charter.desc`) et `marketing.json` (`charter_desc`, `modules_charter_desc`) dans les deux locales.

## Tests

- `tests/functional/billing/module_gating.spec.ts` : `/reservations` ajouté aux écrans gatés (redirection billing + message nommant le module), accès rétabli avec le module `charter`, non accordé par `crm_invoicing`, routes par bateau gatées aussi, Entreprise sans module OK — 8 tests.
- Nouveaux helpers `createCharterAdminUser()` (admin Pro + module `charter`) et `createEnterprisePlanUser()` (`tests/functional/helpers.ts`). Les specs du domaine réservations (`reservations`, `reservation_type`, `reservation_pricing`, `reservation_client_link`, `rental_contracts`, `inspections`, `inspection_items`, `inspection_equipment_actions`, `staff_index_access`) basculent sur ces helpers : les tests cross-org utilisent une org Entreprise pour continuer de vérifier l'isolation entre organisations, pas le gating.
- `tests/inertia/use_nav_sections.spec.ts` : la section business est retrouvée par label (elle peut être absente), 5 nouveaux cas de gating de l'entrée réservations ; Starter rend désormais 3 sections.
- `tests/inertia/mobile_bottom_nav.spec.ts` : le raccourci réservations disparaît sans le module.
