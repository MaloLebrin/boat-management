# 2026-05-23 — Intégration Stripe — paiement par abonnement

Mise en place du flux de paiement complet via Stripe Billing.

**Backend**

- Nouvelles tables : `subscriptions` (état de l'abonnement Stripe), colonne `stripe_customer_id` sur `organizations`
- `StripeService` : création/récupération du customer Stripe, Checkout Session, Customer Portal Session, vérification de signature webhook
- `SubscriptionService` : synchronisation de l'abonnement depuis les événements Stripe (`checkout.session.completed`, `customer.subscription.updated/deleted`), mise à jour automatique de `organizations.plan`
- `BillingController` : routes POST `/settings/billing/checkout` (→ Stripe Checkout), POST `/settings/billing/portal` (→ Customer Portal), POST `/webhooks/stripe` (webhook public)
- Le plan `organizations.plan` est mis à jour automatiquement par les webhooks Stripe

**Frontend**

- Page `/settings/billing` : prop `subscription` (statut, date de renouvellement, intervalle)
- Sélecteur mensuel/annuel avant le checkout
- Badge de statut abonnement (actif, en retard…) + date de renouvellement
- Bouton "Gérer mon abonnement" → Customer Portal Stripe

**Routes**

- `POST /settings/billing/checkout` — `settings.billing.checkout`
- `POST /settings/billing/portal` — `settings.billing.portal`
- `POST /webhooks/stripe` — `webhooks.stripe` (public, hors auth)
