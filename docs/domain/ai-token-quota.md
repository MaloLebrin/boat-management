# Quota de tokens IA — Documentation technique

> Limite mensuelle de consommation Mistral AI par organisation. Pro : 1 000 000 tokens/mois. Enterprise : illimité.

---

## 1. Limites par plan

Source de vérité : `shared/types/plan.ts` → `PLAN_LIMITS[plan].aiTokensPerMonth`.

| Plan       | `canUseAI` | `aiTokensPerMonth` |
| ---------- | ---------- | ------------------ |
| Starter    | `false`    | `null` (N/A)       |
| Pro        | `true`     | `1 000 000`        |
| Enterprise | `true`     | `null` (illimité)  |

`null` signifie illimité — `AiTokenQuotaService.assertCanUseTokens()` court-circuite sans vérifier si la limite est `null`. Le plan Starter ne peut pas accéder à l'IA du tout (`canUseAI: false`), donc `assertCanUseTokens()` n'est jamais atteint pour ce plan.

---

## 2. Architecture

```
AiAnalysisService.generateFleetAnalysis()
AiAnalysisService.generateBoatSuggestions()
RunAiChat.execute()
       │
       │  assertCanUseTokens()  ← throw QuotaExceededError si dépassé
       ▼
AiTokenQuotaService
       │
       │  recordUsage()  ← upsert atomique PostgreSQL
       ▼
Table ai_token_usages (organization_id, month, tokens_used)
       │
       │  seuil 80% ou 100% franchi ?
       ▼
AiTokenThresholdCrossed.dispatch(org, percent)
       │
       ▼
SendAiTokenQuotaNotification.handle()
       │
       ▼
EmailQueueService.sendAiTokenQuotaWarning()
       │
       ▼
Email admins  (template: resources/views/emails/ai_token_quota_warning.edge)
```

---

## 3. Base de données

### Table `ai_token_usages`

Migration : `database/migrations/1793000000000_create_ai_token_usages_table.ts`

| Colonne           | Type               | Notes               |
| ----------------- | ------------------ | ------------------- |
| `id`              | PK auto-increment  |                     |
| `organization_id` | FK → organizations | `ON DELETE CASCADE` |
| `month`           | `varchar(7)`       | Format `YYYY-MM`    |
| `tokens_used`     | `bigint unsigned`  | Défaut `0`          |
| `created_at`      | datetime           |                     |
| `updated_at`      | datetime           |                     |

Contrainte unique : `(organization_id, month)` — une seule ligne par organisation par mois.

### Modèle Lucid

`app/models/ai_token_usage.ts` — relation `belongsTo Organization`.

---

## 4. `AiTokenQuotaService`

`app/services/ai_token_quota_service.ts`

### `currentMonthKey(): string`

Retourne la clé du mois courant au format `YYYY-MM` (ex: `2026-06`).

### `getUsage(organizationId, month?): Promise<number>`

Lit `tokens_used` depuis `ai_token_usages` pour le mois donné (mois courant par défaut). Retourne `0` si aucune ligne n'existe. La colonne `bigint` est castée en `Number()`.

### `assertCanUseTokens(org, currentUsage): void`

Synchrone. Court-circuite si `aiTokensPerMonth === null` (Enterprise). Throw `QuotaExceededError('ai_tokens', { limit, current, upgradeTo })` si `currentUsage >= limit`.

Le `currentUsage` est passé en paramètre (pré-lu) pour éviter une deuxième requête.

### `recordUsage(org, tokensUsed): Promise<void>`

Ignore les appels à `tokensUsed <= 0`.

Exécute un **upsert atomique PostgreSQL** :

```sql
INSERT INTO ai_token_usages (organization_id, month, tokens_used, created_at, updated_at)
VALUES (?, ?, ?, NOW(), NOW())
ON CONFLICT (organization_id, month)
DO UPDATE SET tokens_used = ai_token_usages.tokens_used + EXCLUDED.tokens_used,
             updated_at = NOW()
RETURNING tokens_used
```

L'upsert retourne `tokens_used` post-mise-à-jour. `oldUsed` est dérivé de `newUsed - tokensUsed` pour évaluer les seuils de notification. Cette approche est race-condition-safe : deux appels concurrents (ex. analyse flotte + suggestions bateau pour la même org) ne peuvent pas violer la contrainte unique.

Après l'upsert, si `limit !== null`, évalue si un seuil a été franchi :

```
oldPercent = (oldUsed / limit) × 100
newPercent = (newUsed / limit) × 100

si oldPercent < 80 && newPercent >= 80  → dispatch AiTokenThresholdCrossed(org, 80)
si oldPercent < 100 && newPercent >= 100 → dispatch AiTokenThresholdCrossed(org, 100)
```

Les deux seuils peuvent être déclenchés dans le même appel si l'incrément est suffisamment grand.

### `resetMonth(month): Promise<void>`

Supprime toutes les lignes de `ai_token_usages` pour le mois donné. Appelé par `ResetAiTokenUsage` le 1er de chaque mois.

---

## 5. Points d'application du quota

### 5.1 `AiAnalysisService`

`app/services/ai_analysis_service.ts`

Deux méthodes vérifient et enregistrent le quota :

**`generateFleetAnalysis(userId, org, input, ...)`**

```
1. currentUsage = await aiTokenQuotaService.getUsage(org.id)
2. aiTokenQuotaService.assertCanUseTokens(org, currentUsage)   ← throw si dépassé
3. { content, tokensUsed } = await aiService.chat([...])
4. await aiTokenQuotaService.recordUsage(org, tokensUsed)
5. persist AiAnalysis + return suggestions
```

**`generateBoatSuggestions(userId, boatId, org, input, ...)`**

Même séquence.

### 5.2 `RunAiChat` (job de queue)

`app/jobs/run_ai_chat.ts`

```
1. await dedupService.markRunning(dedupKey)
2. org = await Organization.findOrFail(organizationId)
3. currentUsage = await aiTokenQuotaService.getUsage(org.id)
4. try {
     aiTokenQuotaService.assertCanUseTokens(org, currentUsage)
   } catch (QuotaExceededError) {
     logger.warn(...)
     await dedupService.markFailed(dedupKey, error)
     return   ← sortie sans retry
   }
5. { content, tokensUsed } = await aiService.chat(messages)
6. await aiTokenQuotaService.recordUsage(org, tokensUsed)
7. await dedupService.markCompleted(dedupKey)
```

Le `QuotaExceededError` est intercepté et ne lève **pas** vers le framework de queue — cela évite 2 retries inutiles (la limite mensuelle ne change pas entre les tentatives). `markFailed()` est appelé pour libérer le dedup key et permettre une future requête.

---

## 6. Notification par email (seuils 80 % et 100 %)

### Événement

`app/events/ai_token_threshold_crossed.ts` — porte `organization` et `percent` (80 ou 100).

Dispatché par `AiTokenQuotaService.recordUsage()` après l'upsert.

### Listener

`app/listeners/send_ai_token_quota_notification.ts`

1. Charge tous les `OrganizationMembership` avec `role === 'admin'` + preload `user`.
2. Pour chaque admin, appelle `emailQueueService.sendAiTokenQuotaWarning(...)` avec `correlationSuffix: "<orgId>:<percent>:<yyyy-MM>"`.

### Déduplication

`correlationSuffix` génère un `correlationId` : `ai-token-quota-warning:<orgId>:<percent>:<yyyy-MM>`.

Ce `correlationId` sert de dedup key dans `SendEmail` — **un seul email par admin par seuil par mois**, même si `recordUsage()` est appelé de nombreuses fois au-dessus du seuil.

### Template email

`resources/views/emails/ai_token_quota_warning.edge`

Contenu bilingue FR + EN dans un seul email. Deux variantes :

| Condition        | Sujet                                                                    | Corps                                               |
| ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| `percent < 100`  | `Tokens IA à 80% — FleetAi / AI tokens at 80% — FleetAi`                 | Consommation à `percent`% + lien billing            |
| `percent >= 100` | `Limite tokens IA atteinte — FleetAi / AI token limit reached — FleetAi` | IA indisponible jusqu'au 1er du mois + lien billing |

CTA : bouton "Manage subscription / Gérer l'abonnement" → `APP_URL/settings/billing`.

---

## 7. Reset mensuel

### Job `ResetAiTokenUsage`

`app/jobs/reset_ai_token_usage.ts` — queue `default`, `maxRetries: 2`.

Calcule le mois précédent (`DateTime.now().minus({ months: 1 })`), puis appelle `aiTokenQuotaService.resetMonth(previousMonth)` pour supprimer les lignes correspondantes.

### Planification

`start/scheduler.ts`

```ts
await ResetAiTokenUsage.schedule({})
  .cron('0 1 1 * *') // 1er du mois à 01h00
  .timezone('Europe/Paris')
  .id('monthly-reset-ai-token-usage')
  .run()
```

> Historique : les données supprimées ne sont pas archivées. Si un historique de consommation est nécessaire à l'avenir, il faudra passer à une approche d'archivage plutôt que de suppression.

---

## 8. Affichage côté frontend

### `SettingsController.billing()`

`app/controllers/settings_controller.ts`

`aiTokensUsed` est récupéré en parallèle avec les autres compteurs de quota :

```ts
const [boatCount, memberCount, activeSub, aiTokensUsed] = await Promise.all([
  quotaService.countBoats(org),
  quotaService.countMembers(org),
  subscriptionService.getActive(org.id),
  aiTokenQuotaService.getUsage(org.id),
])
```

Prop `quotaUsage.aiTokens` transmise au frontend :

```ts
aiTokens: { used: aiTokensUsed, limit: limits.aiTokensPerMonth }
// Pro  → { used: 450000, limit: 1000000 }
// Enterprise → { used: 0, limit: null }  (null = illimité → afficher "∞")
```

### Composant

`inertia/components/settings/tabs/SettingsBillingTab.vue`

Affiche une jauge `SettingsBillingUsageGauge` pour les tokens IA, visible uniquement si `quotaUsage.canUseAI === true`. Clé i18n : `settings.billing.usage.aiTokens`.

---

## 9. `QuotaExceededError` pour `ai_tokens`

`app/exceptions/quota_errors.ts`

```ts
new QuotaExceededError('ai_tokens', {
  limit: 1_000_000,
  current: currentUsage,
  upgradeTo: getUpgradeTier(org.plan), // 'enterprise' pour Pro
})
```

`QuotaFeature` inclut `'ai_tokens'`. Le handler global AdonisJS (`app/exceptions/handler.ts`) catch cette erreur non gérée et flash `flash.quota.aiTokensExceeded`.

Dans les services (`AiAnalysisService`, `RunAiChat`), l'erreur est catch localement pour un traitement spécifique (redirection vs sortie propre du job).

---

## 10. Séquence complète — appel IA côté chat

```
Client (frontend)
    │  POST /ai/chat (Inertia router.post)
    ▼
AiController.chat()
    │  quotaService.assertCanUseAI(org)         ← vérifie canUseAI (plan)
    │  aiQueueService.enqueueChat(messages, org) ← organisationId dans le payload
    ▼
RunAiChat (queue 'ai')
    │  dedupService.markRunning()
    │  aiTokenQuotaService.getUsage(org.id)
    │  aiTokenQuotaService.assertCanUseTokens() ← QuotaExceededError si dépassé
    │
    │── si QuotaExceededError:
    │     logger.warn + dedupService.markFailed + return (pas de retry)
    │
    │  aiService.chat(messages)                  ← appel Mistral AI
    │  aiTokenQuotaService.recordUsage(tokensUsed)
    │    └─ upsert atomique
    │    └─ si seuil 80/100% : dispatch AiTokenThresholdCrossed
    │         └─ SendAiTokenQuotaNotification.handle()
    │              └─ emailQueueService.sendAiTokenQuotaWarning() (dédupliqué)
    │  dedupService.markCompleted()
    ▼
(résultat disponible via polling / webhook côté frontend)
```

---

## 11. Fichiers de référence

| Fichier                                                             | Rôle                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `shared/types/plan.ts`                                              | `PlanQuotas.aiTokensPerMonth`, `QuotaUsage.aiTokens`, `PLAN_LIMITS` |
| `app/services/ai_token_quota_service.ts`                            | `getUsage`, `assertCanUseTokens`, `recordUsage`, `resetMonth`       |
| `app/models/ai_token_usage.ts`                                      | Modèle Lucid                                                        |
| `database/migrations/1793000000000_create_ai_token_usages_table.ts` | Schema + contrainte unique                                          |
| `app/events/ai_token_threshold_crossed.ts`                          | Event dispatché à 80% et 100%                                       |
| `app/listeners/send_ai_token_quota_notification.ts`                 | Charge les admins + enqueue les emails                              |
| `app/services/email_queue_service.ts` → `sendAiTokenQuotaWarning()` | Email avec dedup                                                    |
| `resources/views/emails/ai_token_quota_warning.edge`                | Template FR+EN                                                      |
| `app/jobs/reset_ai_token_usage.ts`                                  | Suppression mensuelle des entrées                                   |
| `start/scheduler.ts`                                                | Cron `0 1 1 * *` Europe/Paris                                       |
| `app/exceptions/quota_errors.ts`                                    | `QuotaFeature` inclut `'ai_tokens'`                                 |
| `app/services/ai_analysis_service.ts`                               | Points d'application fleet + boat                                   |
| `app/jobs/run_ai_chat.ts`                                           | Point d'application chat + gestion QuotaExceededError               |
| `app/controllers/settings_controller.ts`                            | `billing()` expose `quotaUsage.aiTokens`                            |
| `inertia/components/settings/tabs/SettingsBillingTab.vue`           | Jauge frontend                                                      |
| `tests/functional/quota/ai_token_quota.spec.ts`                     | Tests Japa                                                          |
