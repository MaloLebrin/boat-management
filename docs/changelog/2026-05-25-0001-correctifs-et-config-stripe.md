# 2026-05-25 — Correctifs et config Stripe

**Correctifs backend**

- `SubscriptionService.syncFromCheckoutSession` : `session.subscription` était casté en `Stripe.Subscription` alors que c'est un simple ID string → corrigé par un appel `stripeService.retrieveSubscription()` pour récupérer l'objet complet avec `expand: ['items.data.price']`
- Route `/webhooks/stripe` exclue de la protection CSRF Shield (`config/shield.ts → exceptRoutes`)

**Variables d'environnement requises**

| Variable                             | Description                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Clé secrète Stripe (`sk_live_...` en prod, `sk_test_...` en dev) |
| `STRIPE_WEBHOOK_SECRET`              | Secret de signature webhook (`whsec_...`)                        |
| `STRIPE_PUBLIC_KEY`                  | Clé publique (`pk_live_...` / `pk_test_...`)                     |
| `STRIPE_PRO_MONTHLY_PRICE_ID`        | Price ID Stripe mensuel Pro (`price_...`)                        |
| `STRIPE_PRO_ANNUAL_PRICE_ID`         | Price ID Stripe annuel Pro (`price_...`)                         |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Price ID Stripe mensuel Enterprise (`price_...`)                 |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`  | Price ID Stripe annuel Enterprise (`price_...`)                  |
| `STRIPE_CUSTOMER_PORTAL_ID`          | ID de configuration du Customer Portal (`bpc_...`, optionnel)    |

⚠️ Les Price IDs commencent par `price_` (pas `prod_` qui sont des Product IDs).

**Config webhook en production**

1. Dashboard Stripe → **Webhooks** → **Add endpoint** : `https://ton-domaine.com/webhooks/stripe`
2. Events à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copier le `whsec_...` affiché → `STRIPE_WEBHOOK_SECRET` dans les env de prod
4. Le `whsec_` du CLI (`stripe listen`) est différent de celui du dashboard — ne pas les mélanger

**Dev local**

```bash
stripe login                  # si clé CLI expirée
stripe listen --forward-to localhost:5555/webhooks/stripe
# copier le whsec_ affiché → STRIPE_WEBHOOK_SECRET dans .env
```

Cartes de test : `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refusée), `4000 0025 0000 3155` (3DS)

---
