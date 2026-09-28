# 2026-09-28 — Paiement en ligne des factures par le client final (#876)

Jusqu'ici, Stripe ne servait qu'à l'abonnement FleetAi : le client d'un loueur
recevait sa facture, faisait un virement, et le loueur la marquait payée à la
main. Désormais, l'organisation connecte **son** compte Stripe et ses clients
règlent leurs factures en ligne.

## Stripe Connect (compte de l'organisation)

- Carte « Paiement en ligne des factures » sur `/settings/billing`
  (`SettingsOnlinePayments.vue`) : état `none` / `pending` / `active`,
  « Connecter mon compte Stripe », « Terminer la configuration »,
  « Déconnecter ». Actions réservées à `subscription.manage`, connexion soumise
  à l'adresse vérifiée ; carte « indisponible » sans module CRM & Facturation ou
  sans Stripe configuré.
- Compte **Standard**, charges directes : l'argent arrive sur le compte du
  loueur, FleetAi ne prend aucune commission.
- Routes : `POST /settings/billing/online-payments` (onboarding → redirection
  Stripe), `GET …/refresh` (lien expiré), `GET …/return` (relit l'état chez
  Stripe), `DELETE /settings/billing/online-payments` (oublie le compte).
- Colonnes `organizations.stripe_connect_account_id` (unique),
  `stripe_connect_charges_enabled`, `stripe_connect_details_submitted`.

## Lien de paiement par facture

- `invoices.payment_token` (jeton opaque, jamais sérialisé) posé à l'envoi par
  e-mail d'une facture payable (envoyée ou en retard, non réglée, total > 0)
  quand l'organisation encaisse en ligne. L'envoi passe désormais la facture à
  `sent` **avant** d'enfiler l'e-mail.
- E-mail : bouton « Payer en ligne » (HTML) et lien en texte ; PDF : ligne
  « Payer en ligne » cliquable.
- Fiche facture : bloc « Paiement en ligne » (`InvoiceOnlinePaymentCard.vue`)
  avec le lien à copier, ou « Créer le lien de paiement »
  (`POST /invoices/:id/payment-link`) pour une facture envoyée avant la
  connexion du compte.
- Page publique `GET /pay/:token` (sans login, `inertia/pages/pay/show.vue`) :
  émetteur, numéro, client, dates, montant ; états payable / réglée /
  indisponible, et « lien invalide » (404) pour un jeton inconnu.
  `POST /pay/:token/checkout` ouvre Stripe Checkout sur le compte connecté.
  Throttle `invoice_payment` (10/min/IP).

## Webhook des comptes connectés

- `POST /webhooks/stripe/connect`, signé par la nouvelle variable
  `STRIPE_CONNECT_WEBHOOK_SECRET`, exempté de CSRF, dédupliqué comme
  `/webhooks/stripe` (`processed_stripe_events`).
- `checkout.session.completed` (session payée) et
  `checkout.session.async_payment_succeeded` (SEPA) règlent la facture :
  `status = 'paid'`, `paid_at`, `payment_method = 'online'`,
  `stripe_payment_intent_id`. La facture est cherchée dans l'organisation
  propriétaire du compte émetteur.
- `account.updated` recopie l'activation du compte.
- Journal d'audit `invoice.paid_online`, `online_payments.connect`,
  `online_payments.disconnect` ; notification `invoice.paid_online`
  (poussable) aux admins.

## Hors périmètre

- Remboursement (`charge.refunded`) : géré dans Stripe, la correction
  comptable passera par les avoirs (#877).
- Paiement en ligne de l'acompte / du solde d'une réservation et caution en
  pré-autorisation : facturer la réservation donne déjà un lien de paiement.
- Commission FleetAi (`application_fee`).
