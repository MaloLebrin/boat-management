# Billing & Quotas — Documentation technique

> Système de paiement par abonnement (Stripe) et application des quotas par plan.

---

## 1. Plans et limites

Les trois plans sont définis dans [`shared/types/plan.ts`](../shared/types/plan.ts) et constituent la source de vérité unique pour l'ensemble du système de quotas.

```
Plan        maxBoats   maxMembers   canUseAI   aiTokensPerMonth   canExport   canCustomizeAI
─────────────────────────────────────────────────────────────────────────────────────────────
starter         2           1         non           —                non            non
pro            25           5         oui       1 000 000           oui            non
enterprise    illimité    illimité    oui         illimité           oui            oui
```

`null` pour `maxBoats`/`maxMembers` signifie illimité — `QuotaService` court-circuite la requête COUNT si la valeur est `null`.

La progression de plan suit toujours : `starter → pro → enterprise`. La fonction `getUpgradeTier(current)` renvoie le palier suivant (ou `null` si déjà enterprise).

Le plan courant est stocké directement sur `organizations.plan` (colonne string). C'est ce champ qui pilote les quotas — pas la table `subscriptions`.

---

## 2. Architecture générale

```
Stripe Dashboard
      │  webhooks
      ▼
POST /webhooks/stripe ──► BillingController.webhook()
                                │
                                ▼
                     SubscriptionService.sync*()
                                │
                          upsert subscriptions
                          + update organizations.plan
                                │
                    ┌───────────┴──────────────┐
                    ▼                          ▼
           QuotaService                 UI / API
       (lit org.plan + PLAN_LIMITS)  (lit subscriptions
       (COUNT bateaux/membres)        pour affichage)
```

---

## 3. Flux de souscription (Checkout)

### 3.1 Initiation

L'utilisateur choisit un plan et un intervalle (mensuel/annuel) dans `SettingsBillingTab.vue`, puis soumet le formulaire Inertia vers `POST /settings/billing/checkout`.

`BillingController.checkout()` :

1. Valide le payload (`checkoutValidator`) → `{ planTier: 'pro'|'enterprise', interval: 'month'|'year' }`
2. Résout le `priceId` Stripe via `StripeService.priceIdFor(planTier, interval)` (lecture des variables d'env `STRIPE_*_PRICE_ID`)
3. Crée ou récupère le client Stripe via `StripeService.getOrCreateCustomer(org, email)` :
   - Si `org.stripeCustomerId` est déjà renseigné → utilise l'ID existant
   - Sinon → `stripe.customers.create()` + sauvegarde en base
4. Crée la session Checkout via `StripeService.createCheckoutSession(...)` avec `mode: 'subscription'`
5. Retourne `inertia.location(url)` → le navigateur reçoit HTTP 409 + header `X-Inertia-Location` → redirection vers Stripe Checkout

```
Navigateur → POST /settings/billing/checkout
          ← 409 X-Inertia-Location: https://checkout.stripe.com/...
          → redirect vers Stripe
```

### 3.2 Retour après paiement

Stripe redirige vers `APP_URL/settings/billing?checkout=success` (succès) ou `APP_URL/settings/billing` (annulation). Ces URLs sont configurées dans `createCheckoutSession()`. À ce stade, l'abonnement **n'est pas encore synchronisé** — c'est le webhook qui en est responsable.

### 3.3 Portail client

`BillingController.portal()` crée une session Customer Portal Stripe (gestion CB, annulation, switch plan) et redirige via `inertia.location(url)`. Nécessite que `org.stripeCustomerId` soit renseigné.

---

## 4. Flux de synchronisation (Webhooks)

### 4.1 Endpoint

`POST /webhooks/stripe` — route publique (hors middleware auth), déclarée dans [`start/routes/webhooks.ts`](../start/routes/webhooks.ts).

### 4.2 Vérification de signature

```ts
const event = stripeService.constructWebhookEvent(request.raw(), signature)
// Lève une erreur → HTTP 400 si signature invalide
```

`request.raw()` est toujours populé par le bodyparser AdonisJS avant parsing JSON, ce qui garantit l'intégrité du corps brut nécessaire à la vérification HMAC.

### 4.3 Événements traités

| Événement Stripe                | Handler                                           |
| ------------------------------- | ------------------------------------------------- |
| `checkout.session.completed`    | `SubscriptionService.syncFromCheckoutSession()`   |
| `customer.subscription.updated` | `SubscriptionService.syncFromSubscriptionEvent()` |
| `customer.subscription.deleted` | `SubscriptionService.syncFromSubscriptionEvent()` |

### 4.4 `syncFromCheckoutSession(session)`

1. Trouve l'organisation via `stripe_customer_id`
2. Appelle `upsertSubscription(org.id, stripeSub)` (voir §4.6)
3. Met à jour `org.plan` via `updateOrgPlan()`

### 4.5 `syncFromSubscriptionEvent(stripeSub)`

1. Trouve l'organisation via `stripe_customer_id`
2. Appelle `upsertSubscription(org.id, stripeSub)`
3. Détermine le nouveau plan :
   - Si `stripeSub.status === 'canceled'` → `'starter'`
   - Sinon → plan déduit du `priceId` (via mapping env vars)
4. Met à jour `org.plan`

C'est ici que le downgrade vers Starter s'opère automatiquement à l'annulation.

### 4.6 `upsertSubscription(organizationId, stripeSub)`

`Subscription.updateOrCreate({ organizationId }, { ... })` — un seul enregistrement par organisation (contrainte UNIQUE sur `organization_id`).

**Calcul des bornes de période (Stripe v22+)** : les champs `current_period_start/end` ont été supprimés de l'objet `Stripe.Subscription` en v22. La méthode `getPeriodBounds()` les recalcule à partir de `billing_cycle_anchor` et des champs `recurring.interval` / `recurring.interval_count` du prix :

```ts
// Principe : on avance par intervalles depuis l'anchor jusqu'à encadrer "now"
let periodStart = anchor // ex: 2025-01-15
let periodEnd = addInterval(anchor) // ex: 2025-02-15
while (periodEnd < now) {
  periodStart = periodEnd
  periodEnd = addInterval(periodEnd)
}
```

---

## 5. Système de quotas

### 5.1 Source de vérité

`organizations.plan` — mis à jour par le webhook, jamais par l'utilisateur directement. `PLAN_LIMITS` dans `shared/types/plan.ts` traduit ce plan en limites concrètes.

### 5.2 `QuotaService`

Quatre méthodes d'assertion ; toutes lèvent `QuotaExceededError` si dépassement :

| Méthode                   | Type de vérification  | Modèle compté            |
| ------------------------- | --------------------- | ------------------------ |
| `assertCanAddBoat(org)`   | COUNT vs `maxBoats`   | `Boat`                   |
| `assertCanAddMember(org)` | COUNT vs `maxMembers` | `OrganizationMembership` |
| `assertCanUseAI(org)`     | booléen `canUseAI`    | —                        |
| `assertCanExport(org)`    | booléen `canExport`   | —                        |

`canCustomizeAI` (Enterprise) n'a pas d'assertion `QuotaService` : la garde est faite directement dans `SettingsController` via `PLAN_LIMITS[org.plan].canCustomizeAI`. Voir [`docs/domain/ai-customization.md`](domain/ai-customization.md).

`canAddBoat(org)` est la version booléenne (non-throwing) utilisée pour afficher l'état du bouton côté UI.

**Court-circuit illimité** : si `maxBoats === null` (enterprise), aucune requête COUNT n'est effectuée.

### 5.3 Points d'application

```
Action utilisateur           Controller                   QuotaService
─────────────────────────────────────────────────────────────────────
Créer un bateau         BoatsController.store()      assertCanAddBoat()
Inviter un membre       OrganizationInvitationsController  assertCanAddMember()
Ajouter un membre       OrganizationMembersController      assertCanAddMember()
Utiliser l'IA           AiController.*               assertCanUseAI()
Exporter                (selon implémentation)       assertCanExport()
```

### 5.4 `QuotaExceededError`

Définie dans `app/exceptions/quota_errors.ts`. Porte `{ resource, limit, current, upgradeTier }`. Le handler global AdonisJS la capture et renvoie une réponse flash d'erreur avec le plan de mise à niveau suggéré.

---

## 6. Affichage des quotas (frontend)

`SettingsController.billing()` calcule `QuotaUsage` en parallèle avec `getActive()` :

```ts
const [boatCount, memberCount, activeSub] = await Promise.all([
  Boat.query().where('organizationId', org.id).count('* as total'),
  OrganizationMembership.query().where(...).count(...),
  this.subscriptionService.getActive(org.id),
])
```

La prop `quotaUsage` transmise au frontend :

```ts
{
  boats:   { used: N, limit: PLAN_LIMITS[org.plan].maxBoats },
  members: { used: N, limit: PLAN_LIMITS[org.plan].maxMembers },
  canUseAI: PLAN_LIMITS[org.plan].canUseAI,
  canExport: PLAN_LIMITS[org.plan].canExport,
}
```

`SettingsBillingTab.vue` affiche des barres de progression et des badges de feature à partir de cette prop. La prop `subscription: SubscriptionInfo | null` contrôle l'affichage du bouton "Gérer l'abonnement" vs les boutons d'upgrade.

---

## 7. Table `subscriptions`

| Colonne                  | Type          | Notes                                                                                |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| `organization_id`        | FK unique     | 1 abonnement max par org                                                             |
| `stripe_subscription_id` | string unique | ID Stripe `sub_xxx`                                                                  |
| `stripe_price_id`        | string        | ID du prix actif                                                                     |
| `plan_tier`              | enum          | starter / pro / enterprise                                                           |
| `status`                 | enum          | active, trialing, past_due, canceled, incomplete, incomplete_expired, unpaid, paused |
| `billing_interval`       | enum          | month / year                                                                         |
| `current_period_start`   | datetime      | calculé par `getPeriodBounds()`                                                      |
| `current_period_end`     | datetime      | date de prochain renouvellement                                                      |
| `cancel_at_period_end`   | boolean       | annulation programmée                                                                |

`SubscriptionService.getActive()` interroge les statuts `active`, `trialing` et `past_due` — un abonnement `past_due` est encore considéré actif pour ne pas bloquer l'accès immédiatement.

---

## 8. Variables d'environnement Stripe

Toutes optionnelles (`Env.schema.string.optional()`) pour permettre les migrations sans credentials Stripe.

| Variable                             | Rôle                                               |
| ------------------------------------ | -------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Clé secrète API Stripe (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET`              | Secret de signature webhook (`whsec_…`)            |
| `STRIPE_PUBLIC_KEY`                  | Clé publique (usage frontend si besoin)            |
| `STRIPE_CUSTOMER_PORTAL_ID`          | ID de configuration du Customer Portal (`bpc_…`)   |
| `STRIPE_PRO_MONTHLY_PRICE_ID`        | Prix Pro mensuel                                   |
| `STRIPE_PRO_ANNUAL_PRICE_ID`         | Prix Pro annuel                                    |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Prix Enterprise mensuel                            |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`  | Prix Enterprise annuel                             |

Si `STRIPE_SECRET_KEY` est absent, `StripeService` lève `StripeNotConfiguredError` → le controller flash un message d'erreur et redirige sans crasher.

---

## 9. Séquence complète : premier achat

```
Utilisateur                App                    Stripe
    │                       │                        │
    │  POST /billing/checkout│                        │
    │──────────────────────►│                        │
    │                       │  customers.create()    │
    │                       │───────────────────────►│
    │                       │◄───────────────────────│
    │                       │  (stripeCustomerId sauvegardé)
    │                       │                        │
    │                       │  checkout.sessions.create()
    │                       │───────────────────────►│
    │                       │◄───────────────────────│
    │  409 X-Inertia-Location│                        │
    │◄──────────────────────│                        │
    │                       │                        │
    │  redirect → Stripe Checkout                    │
    │───────────────────────────────────────────────►│
    │  (paiement CB)                                 │
    │◄───────────────────────────────────────────────│
    │  redirect → /settings/billing?checkout=success │
    │──────────────────────►│                        │
    │                       │                        │
    │                       │◄── POST /webhooks/stripe│
    │                       │    checkout.session.completed
    │                       │                        │
    │                       │  upsert subscriptions  │
    │                       │  org.plan = 'pro'      │
    │                       │                        │
    │  GET /settings/billing │                        │
    │──────────────────────►│                        │
    │◄──────────────────────│                        │
    │  (affiche plan Pro + quotas mis à jour)        │
```

---

## 10. Fichiers de référence

| Fichier                                                                             | Rôle                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`shared/types/plan.ts`](../shared/types/plan.ts)                                   | `PLAN_LIMITS`, `PlanTier`, `QuotaUsage`                     |
| [`shared/types/billing.ts`](../shared/types/billing.ts)                             | `SubscriptionInfo`, `SubscriptionStatus`, `CheckoutPayload` |
| [`app/services/quota_service.ts`](../app/services/quota_service.ts)                 | Assertions de quotas                                        |
| [`app/services/stripe_service.ts`](../app/services/stripe_service.ts)               | Client Stripe, sessions                                     |
| [`app/services/subscription_service.ts`](../app/services/subscription_service.ts)   | Sync webhooks, `getActive`, `toInfo`                        |
| [`app/controllers/billing_controller.ts`](../app/controllers/billing_controller.ts) | Checkout, portal, webhook                                   |
| [`app/exceptions/quota_errors.ts`](../app/exceptions/quota_errors.ts)               | `QuotaExceededError`                                        |
| [`app/exceptions/billing_errors.ts`](../app/exceptions/billing_errors.ts)           | `StripeNotConfiguredError`, `StripeCustomerError`           |
| [`app/models/subscription.ts`](../app/models/subscription.ts)                       | Modèle Lucid                                                |
| [`app/models/organization.ts`](../app/models/organization.ts)                       | `plan`, `stripeCustomerId`, relation subscription           |
| [`start/routes/webhooks.ts`](../start/routes/webhooks.ts)                           | Route publique webhook                                      |
| [`start/routes/settings.ts`](../start/routes/settings.ts)                           | Routes billing (checkout, portal)                           |

Les cartes de test Stripe standard :

Numéro Résultat
4242 4242 4242 4242 Paiement réussi
4000 0000 0000 0002 Carte refusée
4000 0025 0000 3155 Authentification 3D Secure requise
4000 0000 0000 9995 Fonds insuffisants
Pour toutes : date d'expiration n'importe quelle date future, CVC n'importe quels 3 chiffres, code postal n'importe quoi.
