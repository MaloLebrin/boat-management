# 2026-06-16 — Limite de tokens IA mensuelle — Pro (1M tokens/mois) #64

**Backend**

- Table `ai_token_usages` (`organization_id`, `month` YYYY-MM, `tokens_used`, `created_at`, `updated_at`) avec contrainte unique `(organization_id, month)`.
- `app/models/ai_token_usage.ts` — modèle Lucid avec relation `organization`.
- `app/services/ai_token_quota_service.ts` — `getUsage()`, `assertCanUseTokens()`, `recordUsage()` (upsert atomique + dispatch événement seuils 80%/100%), `resetMonth()`.
- `app/services/ai_service.ts` — `chat()` retourne maintenant `{ content, tokensUsed }` au lieu de `string`.
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent `org: Organization`, vérifient le quota avant appel, enregistrent les tokens consommés.
- `app/jobs/run_ai_chat.ts` — ajout de `organizationId` dans le payload, vérification quota + enregistrement usage dans `execute()`.
- `app/services/ai_queue_service.ts` — ajout de `organizationId` dans `enqueueChat()`.
- `app/jobs/reset_ai_token_usage.ts` — job de reset mensuel (1er du mois à 01h00 Europe/Paris) qui supprime les entrées du mois précédent.
- `app/events/ai_token_threshold_crossed.ts` + `app/listeners/send_ai_token_quota_notification.ts` — notification email aux admins à 80% et 100% du quota.
- `app/services/email_queue_service.ts` — ajout de `sendAiTokenQuotaWarning()`.
- `resources/views/emails/ai_token_quota_warning.edge` — template email FR+EN alerte tokens IA.
- `shared/types/plan.ts` — ajout de `aiTokensPerMonth` dans `PlanQuotas` (Pro = 1_000_000, Enterprise/Starter = null) et `aiTokens` dans `QuotaUsage`.
- `app/exceptions/quota_errors.ts` — ajout de `'ai_tokens'` dans `QuotaFeature`.
- `app/controllers/settings_controller.ts` — `billing()` expose `aiTokens.used` + `aiTokens.limit` dans `quotaUsage`.
- Routes AI inchangées — quota token check intégré dans les services existants.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — jauge `SettingsBillingUsageGauge` pour les tokens IA, affichée uniquement si `canUseAI`.

**i18n** (FR + EN)

- `settings.billing.usage.aiTokens` — libellé jauge tokens IA.
- `flash.quota.aiTokensExceeded` — message flash quand le quota est dépassé.

---
