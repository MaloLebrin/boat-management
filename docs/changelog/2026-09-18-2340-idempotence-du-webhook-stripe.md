# 2026-09-18 — Webhook Stripe : l'idempotence n'est plus un effet de bord (#703)

Repéré en écrivant les tests du webhook Stripe (#698, PR #702), hors périmètre d'une PR de tests.

`POST /webhooks/stripe` ne gardait **aucune trace des événements déjà traités** : ni table, ni
contrainte, ni garde en tête du contrôleur. Chaque livraison était rejouée intégralement. Or Stripe
livre **au moins une fois**, jamais exactement une fois : il rejoue à chaque réponse non-2xx, et
parfois même après un 2xx.

Si le traitement était jusqu'ici inoffensif en rejeu, c'était par **effet de bord** :
`SubscriptionService` passe par un `updateOrCreate` clé sur `organizationId`, qui réécrit les mêmes
valeurs. Personne n'avait conçu cette idempotence, et rien ne la protégeait — il suffisait d'ajouter
au chemin de synchro une écriture non idempotente (un compteur, une ligne d'historique, une
notification, une écriture comptable) pour que le rejeu la duplique sans qu'aucun test existant ne
bronche.

## Ce qui a été fait

- **Table `processed_stripe_events`** (migration avec `down()`) : `stripe_event_id` **unique**,
  `type`, `processed_at`. Aucune clé étrangère — la ligne ne décrit pas une organisation, elle décrit
  une livraison.
- **`StripeWebhookService.process(event)`** ouvre **une** transaction et y fait deux choses :
  réserver l'événement, puis aiguiller vers `SubscriptionService`. Aucune réservation obtenue ⇒ c'est
  un rejeu : rien n'est écrit, la réponse reste `200 { received: true }`.
- **`INSERT … ON CONFLICT (stripe_event_id) DO NOTHING RETURNING id`**, et non un `SELECT` suivi d'un
  `INSERT` : deux livraisons simultanées du même `evt_…` passeraient toutes deux la lecture, et la
  seconde casserait sur l'index unique — une 500, donc un rejeu de plus. PostgreSQL tranche en une
  instruction.
- **La trace est écrite dans la transaction de synchro**, pas à côté. `SubscriptionService.syncFrom*`
  acceptent désormais un `trx` optionnel : fourni, ils s'y inscrivent ; absent, ils ouvrent la leur
  comme avant (tous les appels directs, tests de service compris, sont inchangés). Une trace commitée
  _avant_ marquerait l'événement traité alors qu'un échec du traitement l'a annulé — Stripe ne le
  rejouerait jamais, l'événement serait **perdu**. Commitée _après_, elle laisserait une fenêtre où
  un rejeu concurrent rejouerait tout.
- **Les events applicatifs partent après commit**, via `trx.after('commit')` plutôt qu'après le
  `db.transaction` : leurs listeners envoient e-mails et notifications, qui ne doivent jamais
  s'appuyer sur une transaction encore annulable. Lucid attend ses handlers `after:commit` avant de
  rendre la main, le comportement observable est identique.
- **Rétention et purge** : 30 jours (`PROCESSED_EVENT_RETENTION_DAYS`), par le cron
  `daily-purge-processed-stripe-events` à 02:00 — avant la purge des journaux d'audit, deux
  suppressions de masse qui ne se marchent pas dessus. Stripe ne rejoue pas au-delà de trois jours ;
  le reste est de la marge de diagnostic.

## Tests

8 cas ajoutés.

`tests/functional/billing/stripe_webhook.spec.ts` (5) — tous fondés sur un **compteur d'appels** au
service (`swapCountingSubscriptionService`), jamais sur l'état final. C'est le point de l'issue :
l'état final ne distingue pas « rien n'a été fait » de « la même chose a été refaite », et c'est
exactement la différence qu'apporte la déduplication.

- le rejeu du même `evt_…` n'atteint la synchro **qu'une fois**, et le premier passage a bien
  appliqué le plan (sans quoi « une seule fois » serait vrai en n'ayant rien fait) ;
- deux `event.id` **différents** portant le même abonnement sont tous deux traités — la garde
  déduplique sur l'identifiant de livraison, pas sur le contenu, sans quoi une annulation suivant une
  mise à jour serait avalée ;
- un traitement **en échec** ne laisse aucune trace, et le rejeu suivant aboutit : la preuve que la
  trace vit bien dans la transaction de synchro ;
- un type non géré est enregistré lui aussi, avec son `type`, pour que son rejeu ne coûte rien ;
- une **signature invalide** n'enregistre rien : la déduplication vient après la vérification, un
  `event.id` choisi par un tiers ne peut pas bloquer la livraison légitime qui portera le même id.

`tests/integration/jobs/purge_processed_stripe_events.spec.ts` (3) — les bornes de la rétention (par
le **job**, pas par le service : un `execute()` vidé laisserait le cron sans effet), la couverture de
la fenêtre de rejeu de trois jours, et le compte remonté par la purge.

## Non-vacuité

La garde neutralisée, **seul** le test au compteur tombe — `expected 2 to equal 1` —, et les seize
autres restent verts, état final compris. C'est la démonstration littérale de l'issue : aucun test
fondé sur l'état final ne pouvait attraper ce défaut.

Documentation : `docs/billing-and-quotas.md` §4.4 bis, `docs/data/schema.md`.
