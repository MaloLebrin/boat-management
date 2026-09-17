# 2026-09-17 — Le webhook Stripe est enfin testé (#698)

`POST /webhooks/stripe` est la seule route qui transforme un paiement réel en changement de plan.
Elle est **publique** — aucun `middleware.auth`, aucun throttle — sa seule défense est la
vérification de signature, et elle n'avait **aucun** test. 20 tests la couvrent désormais, ainsi
que le calcul des quotas effectifs qui décide des blocages en aval.

- **Verrou levé d'abord.** `constructWebhookEvent` passait par `this.stripe`, dont le getter lève
  `StripeNotConfiguredError` quand `STRIPE_SECRET_KEY` est vide. Comme `.env.test` la laisse vide
  (volontairement, pour que les chemins d'achat lèvent), **tout** POST sur la route renvoyait 400
  en test, quel que soit le corps : aucun chemin nominal n'était atteignable.
- **Correctif.** La vérification passe par le statique `Stripe.webhooks` : le HMAC SHA-256 sur le
  corps brut est purement local, il n'a jamais eu besoin de la clé API. Coupler les deux faisait
  répondre 400 à tous les événements dès que `STRIPE_SECRET_KEY` manquait — et Stripe rejouait
  indéfiniment. En production les deux variables sont renseignées : aucun changement observable.
- **Ce qui est couvert.** En-tête de signature absent, signature forgée, corps altéré après
  signature (le cas qui prouve que le HMAC porte sur les octets) ; `customer.subscription.updated`
  appliquant le plan Pro, ajoutant puis retirant le module `charter` ;
  `customer.subscription.deleted` rétrogradant vers `starter` ; un module `granted` qui survit à
  une synchro qui ne le porte pas ; `checkout.session.completed` avec son unique appel distant
  simulé ; un type d'événement non géré ; un `customer` inconnu ; le rejeu du même événement.
- **Zéro appel réseau.** `STRIPE_WEBHOOK_SECRET=whsec_test_secret` dans `.env.test` est une valeur
  factice qui ne sert qu'à signer les fixtures ; `STRIPE_SECRET_KEY` reste vide. Le seul appel
  distant du chemin (`retrieveSubscription`) passe par `swapStripeService()`.
- **Quotas effectifs.** `tests/functional/billing/effective_quotas.spec.ts` fige la composition
  `tier ⊕ modules ⊕ add-ons ⊖ profil` : `pro` + 3 × `extra_boats` → `maxBoats: 11`, avec le 11ᵉ
  bateau accepté et le **12ᵉ refusé** — c'est ce nombre qui décide d'un blocage réel, l'arithmétique
  seule ne le prouverait pas.
- **CSRF.** Shield est retiré du pipeline en test (`start/kernel.ts`), donc aucun test fonctionnel
  ne peut prouver l'exclusion de la route. `tests/unit/config/shield.spec.ts` l'asserte sur la
  config : sans elle, chaque livraison prendrait un 403 en production.
- **Doublons résorbés.** L'objet `Stripe.Subscription` factice était réécrit en 5 variantes
  divergentes et `seedActiveSubscription` en 2 copies. Tout passe par `tests/support/stripe.ts`
  (`stripeSubscription`, `stripeEvent`, `postStripeWebhook`) et `tests/functional/helpers.ts`
  (`createOrgWithStripeCustomer`, `seedActiveSubscription`) — aucune assertion réécrite.
- **Piège documenté.** La signature porte sur les octets exacts du corps. `client.send(x)` du
  client Japa n'est pas un setter de corps mais la méthode qui **exécute** la requête : l'argument
  est ignoré, le handler reçoit un `request.raw()` vide et répond 400 sans rien dire. C'est
  `client.json(payloadString)` qu'il faut ; `postStripeWebhook` referme le piège.
- **Doc corrigée.** `docs/billing-and-quotas.md` §1.1 n'attribuait que `canManagePricing` au module
  `charter`, alors que `MODULE_FLAGS` lui accorde aussi `canManageReservations`.
- **Fragilités repérées, hors périmètre.** Aucune déduplication par `event.id` (la synchro est
  rejouable par l'upsert, pas par conception) ; `resolveTierItem` rend `undefined` sur un
  abonnement sans item, donc 500 au lieu d'un refus propre ; `subscriptions.stripe_subscription_id`
  est unique globalement alors que l'upsert est clé sur l'organisation.
