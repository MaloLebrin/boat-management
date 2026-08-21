# 2026-06-16 — Comportement downgrade de plan

**Backend**

- `app/exceptions/quota_errors.ts` — `QuotaExceededError` enrichi d'un champ `alreadyOverLimit: boolean` pour distinguer "déjà au-dessus de la limite" (post-downgrade) de "cet upload dépasserait la limite".
- `app/services/quota_service.ts` — `assertCanUpload` vérifie d'abord `storageUsedBytes > limit` (pré-condition post-downgrade, throw avec `alreadyOverLimit: true`), puis `storageUsedBytes + bytes > limit` (cas normal).
- `app/exceptions/handler.ts` — Catch global de `QuotaExceededError` : flash `quota.storageOverflow` si `alreadyOverLimit`, sinon `quota.<feature>Exceeded`, puis redirect back. Couvre les routes upload non catchées localement.
- `app/services/subscription_service.ts` — `updateOrgPlan` détecte un downgrade (`PLAN_ORDER`) et émet l'event `OrganizationPlanDowngraded` après sauvegarde.
- `app/events/organization_plan_downgraded.ts` — Nouvel event avec `organization`, `fromPlan`, `toPlan`.
- `app/listeners/on_organization_plan_downgraded.ts` — Listener : envoie un email de notification à tous les admins de l'organisation via `EmailQueueService.sendPlanDowngradeNotification`.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendPlanDowngradeNotification` (bilingue FR/EN, déduplication par `orgId:fromPlan:toPlan:yyyy-MM`).
- `resources/views/emails/plan_downgrade.edge` — Template email de notification de downgrade.
- `start/events.ts` — Enregistrement du listener `OnOrganizationPlanDowngraded`.
- `resources/lang/{en,fr}/flash.json` — Clés `quota.storageExceeded` et `quota.storageOverflow` ajoutées.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Banner rouge si `storageUsedBytes > limitBytes` (post-downgrade).
- `resources/lang/{en,fr}/settings.json` — Clé `settings.billing.storageOverflow` ajoutée.
