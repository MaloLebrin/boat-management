# 2026-07-09 — [#330] Offre modulaire 3/5 : abonnements Stripe multi-items (socle + add-ons)

Le billing Stripe gère désormais des abonnements **multi-items** : un item de base (tier Pro/Enterprise) + un item par module add-on. Aucun changement visible tant qu'aucun module n'est vendu ; brique consommée par l'UI (#331).

- **Env** : 4 variables `STRIPE_MODULE_{CHARTER,CRM_INVOICING}_{MONTHLY,ANNUAL}_PRICE_ID` (`start/env.ts`, `.env.example`). `.env.test` fixe `STRIPE_SECRET_KEY=` (vide, aucun appel réseau) + des IDs `price_test_*`.
- **`StripeService`** : `priceIdForModule(module, interval)` et `moduleForPriceId(priceId)` (mapping inverse) ; `createCheckoutSession` accepte désormais `priceIds: string[]` (line items multiples).
- **`BillingController.checkout`** : payload `CheckoutPayload.modules?` (validator `vine.array` + guard `ModulesRequireProPlanError` — modules vendables uniquement sur Pro), construit `[prix du tier, ...prix des modules]`.
- **`SubscriptionService`** : `resolveTierItem` (l'item du tier n'est plus forcément à l'index 0) fixe plan/bornes/intervalle ; `desiredModulesFrom` mappe les items de module ; réconciliation via `OrganizationModuleService.reconcileSubscriptionModules` dans la transaction de sync (retire les modules `subscription` absents, ajoute les désirés, **ne touche jamais un module `granted`**). Un abonnement annulé retire tous les modules `subscription`.
- **Doc** : `docs/billing-and-quotas.md` §1.1, §4.5 bis, §8. **Tests** : mapping (unit), réconciliation multi-items — activation/retrait/annulation/ordre des items/module offert préservé (fonctionnels), guard checkout (fonctionnels).
