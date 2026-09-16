# Middleware Inertia : organisation et modules lus une seule fois par requête

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.2.

## Problème

À chaque rendu Inertia, `InertiaMiddleware.share()` rechargeait
`user.organization` trois fois (chargement initial, `resolveSharedCurrentPlan`,
`resolveSharedOrganizationType`) et lisait `organization_modules` deux fois
(`getActiveModules` puis `getActiveAddons`), après que le contrôleur et les
policies avaient déjà fait le même travail. Les paires `canX` / `assertCanX`
de `QuotaService` recalculaient aussi les quotas effectifs à chaque appel.
Mesuré sur `GET /boats/:id` : **4 SELECT** sur `organizations`, **3** sur
`organization_modules`.

## Changement

- `app/middleware/inertia_middleware.ts` : nouveau helper exporté
  `ensureOrganizationLoaded(user)` — ne charge la relation que si elle n'a
  jamais été hydratée (`undefined`), une relation chargée mais absente (`null`)
  n'est pas relue. Les deux résolveurs et `share()` passent par lui ; le
  middleware appelle `OrganizationModuleService.sharedProps(org)` au lieu des
  deux lectures séparées.
- `app/services/organization_module_service.ts` : les lignes
  `organization_modules` sont mises en cache **par instance d'`Organization`**
  (`WeakMap`), partagées entre `getEffectiveQuotas` et le nouveau
  `sharedProps(org)` (`{ activeModules, activeAddons }`, même contenu et même
  ordre que `getActiveModules` / `getActiveAddons`, conservés pour leurs autres
  appelants). Le cache se périme sur `OrganizationModule.generation`.
- `app/models/organization_module.ts` : compteur `generation` incrémenté par
  les hooks `afterSave` / `afterDelete` et par `invalidate()`, que le service
  appelle après ses deux suppressions en masse (`revokeModule`,
  `setAddonQuantity(…, 0)`), invisibles pour les hooks.
- Aucune prop partagée ne change de forme ; aucun contrôleur n'est modifié.

## Tests

- `tests/unit/middleware/inertia_middleware.spec.ts` : les résolveurs ne
  rechargent pas une organisation déjà hydratée, et la chargent une seule fois
  sinon (rouges avant : 2 chargements).
- `tests/integration/services/organization_module_cache.spec.ts` (6 tests) :
  une seule lecture pour `getEffectiveQuotas` ×2 + `sharedProps` sur la même
  instance, parité de `sharedProps` avec `getActiveModules` / `getActiveAddons`,
  pas de partage entre deux instances, invalidation sur `grantModule`,
  `revokeModule` (suppression en masse) et `setAddonQuantity`.
- `tests/functional/boats/boat_show_queries.spec.ts` : `GET /boats/:id` lit
  `organizations` et `organization_modules` **au plus une fois** chacune
  (rouge avant : 4 et 3).
- Suites `services/quota_service`, `billing/*`, backend complète inchangées.
