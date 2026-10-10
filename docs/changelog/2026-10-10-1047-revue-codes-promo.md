# 2026-10-10 — Revue de la PR codes promo : corrections (#955)

Corrections issues de la revue de la PR #956 (codes promo au checkout, voir `2026-10-06-0523-codes-promo-checkout-stripe.md`).

- **Erreur Stripe mal attribuée.** Toute `StripeInvalidRequestError` au checkout était affichée sous le champ « code non applicable » dès qu'un code était saisi, y compris un prix introuvable. `isPromotionRefusal` limite la conversion aux erreurs qui nomment la remise ; le reste remonte en 500.
- **Limite de débit.** `checkoutThrottle` (10 requêtes par minute et par utilisateur) protège `POST /settings/billing/checkout` : chaque envoi avec un code interroge Stripe, on ne peut plus énumérer les codes.
- **Raisons de refus plus justes.** Un coupon dont le plafond propre est atteint ou dont `redeem_by` est dépassé donne `exhausted` / `expired` au lieu de `notFound`.
- **Modale d'upgrade.** Elle réinitialise code, erreur et intervalle à la fermeture. L'erreur du champ s'efface quand on retape le code (modale et onglet Facturation).
- **Divers.** Types `SyncedDiscount` et `PromoCodeEvaluation` déplacés dans `shared/types/billing.ts` ; badge « −20 % » en `text-mint-700` ; garde d'affichage sur la ligne de remise ; « pendant {count} mois » en français.
