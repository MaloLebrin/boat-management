# 2026-09-18 — Webhook Stripe : un abonnement déjà rattaché ailleurs ne part plus en 500 (#705)

Repéré en écrivant les tests du webhook Stripe (#698, PR #702), hors périmètre d'une PR de tests.

Deux clés d'unicité coexistent sur `subscriptions` : `organization_id` (une organisation a au plus un
abonnement) et `stripe_subscription_id` (un abonnement Stripe appartient à au plus une organisation).
L'intention des deux est juste. Ce qui ne l'était pas, c'est **ce qui se passait quand la seconde
était violée** : l'upsert de synchro n'est clé que sur la première.

- **Cause.** Si un `sub_…` rattaché à l'organisation A arrive sur l'organisation B — abonnement
  déplacé d'un client à l'autre côté Stripe, `stripe_customer_id` réattribué, deux organisations
  créées depuis le même client Stripe —, `updateOrCreate({ organizationId: B })` ne trouve rien,
  tente un `INSERT`, et PostgreSQL rejette sur `subscriptions_stripe_subscription_id_unique`.
  L'erreur remontait brute : **500**.
- **Conséquence.** Pour Stripe, un 5xx est une livraison échouée : l'événement était **rejoué
  indéfiniment**, puisqu'il produirait toujours la même violation. Une incohérence de données se
  transformait en boucle de retry silencieuse, sans rien qui la signale à l'exploitant.
- **Correctif.** `SubscriptionService.subscriptionHolderElsewhere` cherche, **avant l'upsert et dans
  la transaction de synchro**, une ligne portant ce `stripe_subscription_id` sur une autre
  organisation. Si elle existe, la transaction sort sans rien écrire — ni `subscriptions`, ni le plan
  de l'organisation, ni les modules — et le webhook répond **200**.
- **Dans la transaction, pas avant.** Hors d'elle, une livraison concurrente pourrait insérer la
  ligne entre le contrôle et l'écriture, et l'on retomberait sur la violation brute.
- **Log en `error`.** Deux organisations revendiquent le même abonnement : c'est une anomalie qui
  demande un arbitrage humain, pas une reprise automatique. Le log nomme le `sub_…`, le
  `stripe_customer_id` de l'événement et **les deux** `organizationId`. Deviner laquelle garde
  l'abonnement reviendrait à retirer son plan payant à l'autre sur la foi d'un webhook.
- **200 et non 4xx/5xx.** Le rejeu ne résoudra jamais un conflit d'attribution ; le faire rejouer ne
  ferait qu'empiler les livraisons.
- **Tests.** 4 cas ajoutés dans `tests/functional/billing/stripe_webhook.spec.ts` : le conflit
  nominal (200, aucune ligne créée pour la revendiquante, l'abonnement de A **intact** — même `id`,
  `updated_at` inchangé, pas « équivalent ») ; les modules de la revendiquante laissés tels quels,
  qui prouvent que la garde court-circuite bien toute la transaction et pas seulement l'écriture de
  `subscriptions` ; le chemin **normal** toujours opérant pour l'organisation détentrice, pour que la
  garde ne bloque pas une synchro légitime ; et le même conflit par `checkout.session.completed`.
- **Non-vacuité.** La garde retirée, les cas tombent sur
  `duplicate key value violates unique constraint "subscriptions_stripe_subscription_id_unique"` —
  exactement la 500 décrite par l'issue.

Documentation : `docs/billing-and-quotas.md` §4.6.
