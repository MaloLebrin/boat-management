# 2026-07-09 — Offre modulaire : correctifs post-revue (collision de prop + erreur Stripe)

Deux correctifs sur l'offre modulaire (#327), issus de la revue.

- **Collision de prop Inertia sur `/settings/billing`** : la page rendait `activeModules: {module, source}[]`, écrasant la prop partagée `activeModules: PlanModule[]` (chaînes) du middleware que `usePlan()`/la nav consomment. Sur cette page, les quotas issus d'un module retombaient à tier-only → liens Clients/Factures/Périodes tarifaires masqués à tort. La prop de page est renommée `orgModules` (controller + `billing.vue` + `SettingsBillingTab`). Test : la page expose `orgModules` (objets) **et** la prop partagée `activeModules` (chaînes) intacte.
- **Erreur Stripe non gérée au retrait de module** : `removeModule` pouvait lever un 500 si une requête concurrente avait déjà retiré l'item (`resource_missing`) — asymétrie avec l'ajout, protégé par une clé d'idempotence. `handleModuleError` intercepte désormais toute `Stripe.errors.StripeError` → flash `moduleActionFailed` (en + fr) + redirection. Test : un échec Stripe au retrait renvoie un flash, pas un 500.
