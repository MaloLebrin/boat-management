# Système de quotas par plan

## Plans et limites

Source de vérité : `shared/types/plan.ts` — `PLAN_LIMITS`.

| Feature       | Starter | Pro | Enterprise |
|---------------|---------|-----|------------|
| Bateaux max   | 2       | 25  | ∞          |
| Membres max   | 1       | 5   | ∞          |
| IA / Copilote | ✗       | ✓   | ✓          |
| Export        | ✗       | ✓   | ✓          |

`null` = illimité. Le plan est assigné manuellement en BDD sur la table `organizations` (colonne `plan` enum `starter|pro|enterprise`, défaut `starter`). Pas de Stripe.

## Tarifs

| Plan       | Mensuel      | Annuel (−20 %)       |
|------------|--------------|----------------------|
| Starter    | Gratuit      | Gratuit              |
| Pro        | 20 € / mois  | 16 € / mois (192 €/an) |
| Enterprise | Sur devis    | Sur devis            |

- Facturation par organisation, pas par utilisateur ni par bateau.
- Réduction annuelle de 20 % appliquée automatiquement (badge `billing_annual_badge: "−20 %"`).
- Aucun frais caché. Les membres sont illimités sur tous les plans.

---

## Architecture

```
shared/types/plan.ts          — PlanTier, PlanQuotas, QuotaUsage, PLAN_LIMITS, getUpgradeTier()
app/exceptions/quota_errors.ts — QuotaExceededError
app/services/quota_service.ts  — méthodes can*/assert*
```

### `QuotaExceededError`

```ts
new QuotaExceededError(feature: QuotaFeature, limit: number | null, current: number, upgradeTo: PlanTier | null)
// QuotaFeature = 'boats' | 'members' | 'ai' | 'export'
```

### `QuotaService`

| Méthode | Signature | Comportement |
|---------|-----------|--------------|
| `canAddBoat(org)` | `Promise<boolean>` | Retourne `false` si quota atteint, sans throw. Pour l'UI. |
| `assertCanAddBoat(org)` | `Promise<void>` | Throw `QuotaExceededError` si `COUNT(boats) >= maxBoats`. |
| `assertCanAddMember(org)` | `Promise<void>` | Throw si `COUNT(organization_memberships) >= maxMembers`. |
| `assertCanUseAI(org)` | `void` (synchrone) | Throw si `!canUseAI`. |
| `assertCanExport(org)` | `void` (synchrone) | Throw si `!canExport`. |

---

## Guards par feature

### Ajout de bateau — 4 niveaux (defense in depth)

```
[1] Icône cadenas dans le bouton        →  inertia/pages/boats/index.vue
[2] Toast.error() au clic               →  handleNewBoat() dans index.vue
[3] Redirect dans GET /boats/new        →  BoatsController.create()
[4] assertCanAddBoat() dans POST /boats →  BoatsController.store()
```

**[1] + [2] — Frontend `inertia/pages/boats/index.vue`**

Le controller `index()` passe `canAddBoat: boolean` (via `quotaService.canAddBoat()`).
- `canAddBoat === false` → `LockClosedIcon` visible dans le bouton avant tout clic
- Clic sur le bouton → `handleNewBoat()` : si quota atteint, `toast.error(t('boats.index.quotaReached'))` et pas de navigation

**[3] — `BoatsController.create()` (GET /boats/new)**

```ts
if (!(await this.quotaService.canAddBoat(user.organization))) {
  session.flash('error', i18n.t('flash.quota.boatsExceeded'))
  return response.redirect('/boats')
}
```
Bloque l'accès direct par URL au formulaire de création.

**[4] — `BoatsController.store()` (POST /boats)**

```ts
try {
  await this.quotaService.assertCanAddBoat(user.organization)
} catch (error) {
  if (error instanceof QuotaExceededError) {
    session.flash('error', i18n.t(`flash.quota.${error.feature}Exceeded`))
    return response.redirect().back()
  }
  throw error
}
```
Guard final avant écriture en base.

---

### Ajout de membre — 1 niveau backend

**`OrganizationInvitationsController.store()` (POST /organization/invitations)**

```ts
await this.quotaService.assertCanAddMember(user.organization)
```
Appelé après `bouncer.authorize('manageMembers')` et validation VineJS, avant `invitationService.create()`.
Flash : `flash.quota.membersExceeded`.

Pas de guard frontend actuellement (pas d'icône ni de toast anticipé).

---

### Accès IA — 1 niveau backend

**`AiController.chat()`, `fleetAnalysis()`, `boatSuggestions()` (POST /ai/chat, /ai/fleet-analysis, /boats/:id/suggestions)**

```ts
this.quotaService.assertCanUseAI(user.organization) // synchrone
```
En entrée de chaque méthode, avant toute opération IA.
Flash : `flash.quota.aiExceeded`.

---

### Export — 0 niveau (feature non implémentée)

`assertCanExport()` est disponible dans `QuotaService`. Tout futur controller d'export doit l'appeler en entrée.

---

## Shared prop `currentPlan`

Exposé à toutes les pages via `InertiaMiddleware.share()` :

```ts
// app/middleware/inertia_middleware.ts
currentPlan: ctx.inertia.always(currentPlan) // PlanTier | null
```

`null` si l'utilisateur n'appartient à aucune organisation. Utilisable dans n'importe quel composant via `usePage().props.currentPlan`.

---

## Page billing (`GET /settings/billing`)

Rendue par `SettingsController.billing()`. Props passées :

```ts
{
  plan: PlanTier,
  quotaUsage: QuotaUsage // { boats: {used, limit}, members: {used, limit}, canUseAI, canExport }
}
```

Les `used` sont des COUNT SQL en temps réel (2 requêtes parallèles).  
`limit: null` = illimité → afficher "∞" côté frontend.

---

## Ajouter un nouveau quota

1. Ajouter la feature dans `QuotaFeature` (`app/exceptions/quota_errors.ts`)
2. Ajouter le champ dans `PlanQuotas` et `PLAN_LIMITS` (`shared/types/plan.ts`)
3. Ajouter `assert*()` dans `QuotaService`
4. Appeler dans le controller concerné (pattern : avant toute écriture, dans try/catch `QuotaExceededError`)
5. Ajouter les clés i18n : `flash.quota.<feature>Exceeded` en EN et FR
6. Mettre à jour `SettingsController.billing()` si usage visible sur la page billing
