# 2026-05-22 — Système de quotas par plan (Starter / Pro / Enterprise)

Mise en place de l'enforcement des limites par plan organisationnel. Le plan est assigné manuellement en BDD (pas de Stripe).

**Architecture :**

- **`shared/types/plan.ts`** — source de vérité unique partagée backend/frontend :
  - `PlanTier` : `'starter' | 'pro' | 'enterprise'`
  - `PLAN_LIMITS: Record<PlanTier, PlanQuotas>` — limites par plan
  - `getUpgradeTier(current)` — retourne le tier suivant ou `null`
  - `QuotaUsage` — interface pour la page billing
- **`app/exceptions/quota_errors.ts`** : `QuotaExceededError(feature, limit, current, upgradeTo)`
- **`app/services/quota_service.ts`** :
  - `canAddBoat(org)` → `Promise<boolean>` — pour l'UI (pas de throw)
  - `assertCanAddBoat(org)` → throw si dépassé
  - `assertCanAddMember(org)` → throw si dépassé
  - `assertCanUseAI(org)` → synchrone, throw si non autorisé
  - `assertCanExport(org)` → synchrone, throw si non autorisé

**Guards backend (controllers) :**

- `BoatsController.store` : `assertCanAddBoat` avant `request.validateUsing`
- `BoatsController.create` : `canAddBoat` pour bloquer l'accès au formulaire
- `OrganizationInvitationsController.store` : `assertCanAddMember` avant création
- `AiController.chat`, `fleetAnalysis`, `boatSuggestions` : `assertCanUseAI` en entrée de chaque méthode

**Autres :**

- **Migration** : colonne `plan` (enum `starter|pro|enterprise`, défaut `starter`) sur `organizations`
- **Inertia shared props** : `currentPlan` exposé à toutes les pages via `InertiaMiddleware`
- **Page billing** (`settings/billing`) : plan réel, jauges usage (bateaux/membres), disponibilité IA/export, CTA mise à niveau
- **i18n** : `flash.quota.{boatsExceeded,membersExceeded,aiExceeded,exportExceeded}` en EN et FR ; refonte `settings.billing.*`

**Limites par plan :**

| Feature       | Starter | Pro | Enterprise |
| ------------- | ------- | --- | ---------- |
| Bateaux max   | 2       | 25  | ∞          |
| Membres max   | 1       | 5   | ∞          |
| IA / Copilote | ✗       | ✓   | ✓          |
| Export        | ✗       | ✓   | ✓          |

> Pour tout futur controller d'export : appeler `quotaService.assertCanExport(org)` en entrée.

---
