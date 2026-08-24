# 2026-07-03 — [#171] Facturation : synchronisation d'abonnement atomique

**Corrige A-08 : `syncFromCheckoutSession()` et `syncFromSubscriptionEvent()` appelaient `upsertSubscription()` puis la mise à jour du plan de l'org de façon séquentielle et non transactionnelle. En cas d'échec de la seconde écriture, la souscription était enregistrée mais le plan de l'org restait incohérent (ex : souscription `active` mais org encore sur `starter`)**

- `app/services/subscription_service.ts` : les deux écritures (`upsertSubscription` + application du plan) sont désormais enveloppées dans `db.transaction()` — soit tout est commité, soit tout est annulé
- `updateOrgPlan()` devient `applyOrgPlan()` : effectue l'écriture dans la transaction et **retourne** l'info de downgrade au lieu de dispatcher l'event directement. `OrganizationPlanDowngraded` est désormais dispatché **après le commit** (le listener envoie des emails et crée des notifications — il ne doit pas agir sur un changement susceptible d'être annulé)
- Tests ajoutés : `tests/functional/billing/subscription_service.spec.ts` (commit conjoint souscription + plan avec event post-commit ; rollback de la souscription si la mise à jour du plan échoue)
