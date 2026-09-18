# 2026-09-18 — Webhook Stripe : un abonnement sans item ne part plus en 500 (#704)

Repéré en écrivant les tests du webhook Stripe (#698, PR #702), hors périmètre d'une PR de tests.

`SubscriptionService.resolveTierItem` se terminait par un repli sur le premier item :

```ts
return tierItem ?? stripeSub.items.data[0]
```

Sur un abonnement dont `items.data` est **vide**, ce repli rend `undefined` — et le type de retour
annoncé (`Stripe.SubscriptionItem`) ne le disait pas. L'appelant déréférençait ensuite
`item.price.id`, d'où une `TypeError` remontée en **500**.

- **Cause.** Un repli qui masque l'absence au lieu de la dire, et un type de retour qui ment. Le cas
  n'est pas théorique : un abonnement dont le dernier item vient d'être supprimé, ou un
  `customer.subscription.deleted` construit à la main, arrivent tous deux avec `items.data` vide.
- **Conséquence.** Pour Stripe, un 5xx est une livraison échouée : l'événement était **rejoué
  indéfiniment**, puisqu'il produisait toujours la même erreur. L'endpoint accumulait les erreurs sur
  un événement qu'il ne pourrait jamais traiter.
- **Correctif.** `resolveTierItem` annonce `Stripe.SubscriptionItem | null` et rend `null` sur un
  tableau vide, avant le repli. `syncFromSubscriptionEvent` et `syncFromCheckoutSession` sortent
  alors proprement via `skipItemlessSubscription` : rien n'est écrit — ni `subscriptions`, ni le plan
  de l'organisation, ni les modules — et l'événement ignoré est loggé.
- **Le contrôleur répond 200**, sans changement : l'événement a bien été reçu et compris, il n'y a
  simplement rien à en faire. Un 400 ferait rejouer Stripe pour rien, et aucun rejeu ne peut faire
  apparaître un item.
- **Log en `warn`, pas en `info`.** Un `customer.subscription.deleted` sans item est ignoré ici, donc
  **ne rétrograde pas** l'organisation : elle resterait sur son plan payant jusqu'à un événement
  porteur d'items. C'est le comportement voulu — un abonnement sans item ne décrit aucun plan, et
  deviner l'annulation serait pire —, mais il doit se voir dans les logs.
- **Tests.** 3 cas ajoutés dans `tests/functional/billing/stripe_webhook.spec.ts` :
  `customer.subscription.updated` sans item sur une organisation **déjà Pro** (200, plan inchangé,
  ligne `subscriptions` non réécrite — prouvé par `updated_at`, pas par « écrit la même chose »),
  `customer.subscription.deleted` sans item (200, aucun `OrganizationPlanDowngraded`), et
  `checkout.session.completed` sur un abonnement sans item (200, aucune ligne créée, l'abonnement
  ayant bien été lu chez Stripe — la sortie a lieu sur son contenu, pas sur un court-circuit amont).
- **Non-vacuité.** Le correctif retiré, les trois cas tombent sur
  `TypeError: Cannot read properties of undefined (reading 'price')` et `expected 500 to equal 200`.

Documentation : `docs/billing-and-quotas.md` §4.5 bis.
