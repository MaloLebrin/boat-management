# 2026-10-06 — Guide d'exploitation des codes promo (#955)

Nouveau guide `docs/dev/promo-codes.md` : comment créer et gérer les codes promo introduits par `2026-10-06-0523-codes-promo-checkout-stripe.md`. Les codes vivant uniquement dans le Dashboard Stripe, il documente le geste de l'exploitant plutôt que du code.

- **Contenu.** Principe (Dashboard, Test ≠ Live), coupon vs code promo, création pas à pas (Dashboard et Stripe CLI), produits visés (plans, modules, bateaux supplémentaires), procédure de test de bout en bout, gestion (suivi des utilisations, désactivation, recréation, suppression, remise posée à la main), dépannage des quatre messages d'erreur du champ, limites de l'app.
- **Renvois.** `docs/dev/stripe.md` § « Codes promo » pointe vers le guide ; entrée « Codes promo » dans `docs/README.md`.
- **Aucun changement de code.**
