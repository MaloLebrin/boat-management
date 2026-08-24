# 2026-07-06 — [#279] Garde contre un utilisateur sans organisation sur les routes gatées

Un utilisateur authentifié dont `organizationId` est `null` (course à l'onboarding, org supprimée, fixture) qui atteignait une route gatée déclenchait un **500** : les contrôleurs chargent `user.organization` puis appellent `quotaService.assertCan*(user.organization)`, et `PLAN_LIMITS[null.plan]` levait une `TypeError` non gérée.

- **`app/services/quota_service.ts`** : les méthodes `assertCan*` / `can*` acceptent désormais `Organization | null` et passent par une garde privée `#assertOrganization()` (assertion TypeScript) qui lève une `UserNotInOrganizationError` métier si `org` est `null` — avant tout accès à `PLAN_LIMITS`.
- **`app/exceptions/handler.ts`** : `UserNotInOrganizationError` est traitée en flash + **redirection vers `/`** (au lieu d'un 500) et n'est plus journalisée comme erreur serveur. Bénéficie aussi aux `port_service`/`boat_hull_service` qui levaient déjà cette erreur sans traitement dédié.
- **i18n** : clé `flash.organization.required` (en/fr).
- **Tests** : `tests/functional/organization/no_organization_guard.spec.ts` — un user `organizationId = null` sur `/clients`, `/boats/:id/export/*.csv` et `/ai/chat` est redirigé vers `/` (pas de 500).
