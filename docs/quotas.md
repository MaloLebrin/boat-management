# Système de quotas par plan

## Plans et limites

Source de vérité : `shared/types/plan.ts` — `PLAN_LIMITS`.

| Feature       | Starter | Pro   | Enterprise |
| ------------- | ------- | ----- | ---------- |
| Bateaux max   | 2       | 25    | ∞          |
| Membres max   | 1       | 5     | ∞          |
| Stockage      | 1 Go    | 20 Go | ∞          |
| IA / Copilote | ✗       | ✓     | ✓          |
| Export        | ✗       | ✓     | ✓          |

`null` = illimité. Le plan est assigné manuellement en BDD sur la table `organizations` (colonne `plan` enum `starter|pro|enterprise`, défaut `starter`). Pas de Stripe.

## Tarifs

| Plan       | Mensuel     | Annuel (−20 %)         |
| ---------- | ----------- | ---------------------- |
| Starter    | Gratuit     | Gratuit                |
| Pro        | 20 € / mois | 16 € / mois (192 €/an) |
| Enterprise | Sur devis   | Sur devis              |

- Facturation par organisation, pas par utilisateur ni par bateau.
- Réduction annuelle de 20 % appliquée automatiquement (badge `billing_annual_badge: "−20 %"`).
- Aucun frais caché.
- Le plan Starter est un plan solo (1 membre = l'owner uniquement). Les plans Pro et Enterprise permettent d'inviter plusieurs membres.

---

## Architecture

```
shared/types/plan.ts           — PlanTier, PlanQuotas, QuotaUsage, PLAN_LIMITS, getUpgradeTier()
app/exceptions/quota_errors.ts — QuotaExceededError
app/services/quota_service.ts  — méthodes can*/assert*/storage
app/services/media_service.ts  — upload/deleteById avec tracking quota
```

### `QuotaExceededError`

```ts
new QuotaExceededError(feature: QuotaFeature, limit: number | null, current: number, upgradeTo: PlanTier | null)
// QuotaFeature = 'boats' | 'members' | 'ai' | 'export' | 'storage'
```

### `QuotaService`

| Méthode                         | Signature          | Comportement                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canAddBoat(org)`               | `Promise<boolean>` | Retourne `false` si quota atteint, sans throw. Pour l'UI.                                                                                                                                                                                                                        |
| `canAddMember(org)`             | `Promise<boolean>` | Retourne `false` si quota atteint, sans throw. Pour l'UI.                                                                                                                                                                                                                        |
| `assertCanAddBoat(org)`         | `Promise<void>`    | Throw `QuotaExceededError` si `COUNT(boats) >= maxBoats`.                                                                                                                                                                                                                        |
| `assertCanAddMember(org)`       | `Promise<void>`    | Throw si `COUNT(organization_memberships) >= maxMembers`.                                                                                                                                                                                                                        |
| `assertCanUseAI(org)`           | `void` (synchrone) | Throw si `!canUseAI`.                                                                                                                                                                                                                                                            |
| `assertCanExport(org)`          | `void` (synchrone) | Throw si `!canExport`.                                                                                                                                                                                                                                                           |
| `storageLimitBytes(org)`        | `number \| null`   | Retourne la limite en octets selon le plan, `null` si illimité.                                                                                                                                                                                                                  |
| `assertCanUpload(org, bytes)`   | `void` (synchrone) | Throw `QuotaExceededError` si `storageUsedBytes + bytes > limit`.                                                                                                                                                                                                                |
| `updateStorageUsed(org, delta)` | `Promise<void>`    | Incrémente ou décrémente `storage_used_bytes` atomiquement en BDD. Déclenche une notification email si le seuil 80 % ou 100 % est franchi (déduplication : 1 email par seuil par mois via `correlationSuffix`). Le décrément est plafonné à 0 pour éviter les valeurs négatives. |

---

## Composant `UpgradePlanModal`

**`inertia/components/base/UpgradePlanModal.vue`**

Modale réutilisable affichée quand un quota est atteint côté frontend, avant tout appel réseau. Elle :

- lit `currentPlan` via `usePage().props.currentPlan`
- déduit le plan cible via `getUpgradeTier()` (`shared/types/plan.ts`)
- affiche le prix mensuel/annuel avec toggle (−20 %)
- déclenche un checkout Stripe via `useForm().transform(...).post('/settings/billing/checkout')`
- si `currentPlan === 'enterprise'` → message "Contactez-nous", pas de bouton checkout

```vue
<UpgradePlanModal v-model:open="showUpgradeModal" feature="boats | members | ai | export" />
```

---

## Guards par feature

### Ajout de bateau — 3 niveaux (defense in depth)

```
[1] UpgradePlanModal au clic            →  handleNewBoat() dans inertia/pages/boats/index.vue
[2] Redirect dans GET /boats/new        →  BoatsController.create()
[3] assertCanAddBoat() dans POST /boats →  BoatsController.store()
```

**[1] — Frontend `inertia/pages/boats/index.vue`**

Le controller `index()` passe `canAddBoat: boolean` (via `quotaService.canAddBoat()`). Le bouton "Nouveau bateau" reste toujours visible et cliquable.

- Clic → `handleNewBoat()` : si `canAddBoat === false`, ouvre `UpgradePlanModal` (feature `boats`) ; sinon navigue vers `/boats/new`.

**[2] — `BoatsController.create()` (GET /boats/new)**

```ts
if (!(await this.quotaService.canAddBoat(user.organization))) {
  session.flash('error', i18n.t('flash.quota.boatsExceeded'))
  return response.redirect('/boats')
}
```

Bloque l'accès direct par URL au formulaire de création.

**[3] — `BoatsController.store()` (POST /boats)**

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

### Ajout de membre — 2 niveaux

```
[1] UpgradePlanModal au clic                          →  handleInvite() dans SettingsMembersTab.vue
[2] assertCanAddMember() dans POST /organization/invitations →  OrganizationInvitationsController.store()
```

**[1] — Frontend `inertia/components/settings/tabs/SettingsMembersTab.vue`**

Le controller `members()` passe `canAddMember: boolean` (via `quotaService.canAddMember()`). Le bouton "Inviter" reste toujours visible.

- Clic → `handleInvite()` : si `canAddMember === false`, ouvre `UpgradePlanModal` (feature `members`) ; sinon affiche le formulaire d'invitation.

**[2] — `OrganizationInvitationsController.store()` (POST /organization/invitations)**

```ts
await this.quotaService.assertCanAddMember(user.organization)
```

Appelé après `bouncer.authorize('manageMembers')` et validation VineJS, avant `invitationService.create()`.
Flash : `flash.quota.membersExceeded`.

---

### Accès IA — 2 niveaux

```
[1] UpgradePlanModal au clic              →  dashboard.vue + BoatShowTabOverview.vue
[2] assertCanUseAI() dans POST /ai/*      →  AiController (tous les endpoints)
```

**[1] — Frontend**

`canUseAI` est calculé localement depuis `currentPlan` (shared prop, pas de prop controller dédiée) :

```ts
const canUseAI = computed(() => PLAN_LIMITS[page.props.currentPlan ?? 'starter'].canUseAI)
```

- `inertia/pages/dashboard.vue` → `analyzeFleet()` : si `!canUseAI`, ouvre `UpgradePlanModal` (feature `ai`).
- `inertia/components/boats/show/tabs/BoatShowTabOverview.vue` → `refreshSuggestions()` : idem.

Les boutons restent toujours visibles et cliquables.

**[2] — `AiController.chat()`, `fleetAnalysis()`, `boatSuggestions()` (POST /ai/chat, /ai/fleet-analysis, /ai/boats/:id/suggestions)**

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

## Stockage — Guard et tracking

### Guard upload

`MediaService.upload(user, file, payload, org?)` appelle `quotaService.assertCanUpload(org, file.size)` avant tout envoi Cloudinary. `org` est optionnel — si absent, le quota n'est pas vérifié (cas avatar utilisateur). Passer `org` explicitement pour tout document rattaché à une organisation.

### Tracking après upload / suppression

`MediaService` appelle `quotaService.updateStorageUsed(org, +bytes)` après un upload réussi et `updateStorageUsed(org, -bytes)` après une suppression. Le delta est le `bytes` retourné par Cloudinary.

### Compteur en base

Colonne `storage_used_bytes` (bigint, défaut 0) sur `organizations`. Mis à jour via `increment` / `decrement` atomique. Le décrément est plafonné à la valeur courante (jamais négatif).

### Notification seuil

Un email est envoyé aux admins de l'organisation quand l'upload fait franchir 80 % ou 100 % du quota. Déduplication : une seule notification par seuil par mois (`correlationSuffix: "<orgId>:<percent>:<yyyy-MM>"`).

---

## Page billing (`GET /settings/billing`)

Rendue par `SettingsController.billing()`. Props passées :

```ts
{
  plan: PlanTier,
  quotaUsage: QuotaUsage // { boats: {used, limit}, members: {used, limit}, storage: {usedBytes, limitBytes}, canUseAI, canExport }
}
```

Les `used` / `usedBytes` sont calculés en temps réel (2 COUNT SQL + lecture du champ `storageUsedBytes`).  
`limit: null` / `limitBytes: null` = illimité → afficher "∞" côté frontend.

Le composant `SettingsBillingUsageGauge` affiche les octets avec les unités localisées (`KB/MB/GB` en anglais, `Ko/Mo/Go` en français) via les clés i18n `settings.billing.usage.kb/mb/gb`.

---

## Ajouter un nouveau quota

1. Ajouter la feature dans `QuotaFeature` (`app/exceptions/quota_errors.ts`)
2. Ajouter le champ dans `PlanQuotas` et `PLAN_LIMITS` (`shared/types/plan.ts`)
3. Ajouter `assert*()` dans `QuotaService`
4. Appeler dans le controller concerné (pattern : avant toute écriture, dans try/catch `QuotaExceededError`)
5. Ajouter les clés i18n : `flash.quota.<feature>Exceeded` en EN et FR
6. Mettre à jour `SettingsController.billing()` si usage visible sur la page billing
7. Mettre à jour ce fichier (`docs/quotas.md`) et `docs/changelog.md`
