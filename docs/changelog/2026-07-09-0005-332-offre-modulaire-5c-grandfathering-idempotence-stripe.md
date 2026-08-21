# 2026-07-09 — [#332] Offre modulaire 5c : grandfathering + idempotence Stripe

Dernier lot du cycle de vie (#332), qui clôt l'épic #327.

- **Commande Ace** `modules:grant-enterprise` (`commands/grant_enterprise_modules.ts`) : accorde tous les modules add-ons en `source = 'granted'` aux organisations Enterprise existantes (grandfathering — aucune ne perd de fonctionnalité). Logique dans `OrganizationModuleService.grantModulesToEnterpriseOrgs` (idempotente, ne requalifie pas une ligne `subscription` existante). À lancer une fois au déploiement.
- **Idempotence Stripe de bout en bout** : `StripeService.addSubscriptionItem` passe une clé d'idempotence (`add-module:{subscriptionId}:{priceId}`, extraite dans `moduleIdempotencyKey`) — ferme la fenêtre de concurrence résiduelle que le garde applicatif `hasModule` (#331) ne couvre pas. Deux ajouts simultanés du même module ne créent qu'un item facturé.
- **Doc** : `docs/billing-and-quotas.md` §1.1 (résiliation, idempotence, procédure de rollout).
- **Tests** : commande/service (modules accordés aux Enterprise uniquement, idempotence, préservation d'une ligne `subscription`), clé d'idempotence déterministe (unit).
