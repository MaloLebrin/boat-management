# 2026-07-23 — Upsell quota bateaux : badge « x/y » sur le bouton + toast « Voir les offres » (#418)

Audit UX du 2026-07-19 : une org Starter à 2/2 bateaux voyait « Nouveau bateau » actif partout (dashboard, `/boats`) ; le clic redirigeait vers `/boats` avec un toast éphémère « Vous avez atteint la limite… » sans action.

- **État sur le bouton** : nouveau composant `inertia/components/boats/NewBoatButton.vue` (réutilisé sur le dashboard et `/boats`) affichant un badge `x/y` (ex. « 2/2 », variante `warning` au quota) et un tooltip « Limite atteinte » au plafond. Au quota le bouton ouvre directement l'`UpgradePlanModal` (upsell) au lieu de rediriger vers un toast. Plan Enterprise (limite `null`) : pas de badge.
- **Quota exposé au front** : `QuotaService.getBoatUsage(org)` renvoie `{ used, limit }` (quotas effectifs tier + add-on `extra_boats`). `BoatsController#index` et `HomeController#index` passent `canAddBoat` + `boatQuota` aux pages `boats/index` et `dashboard`.
- **Toast d'erreur actionnable** : les flashs de quota (bateaux, membres, stockage, IA, export) posent aussi `errorAction = '/settings/billing'` (handler global + contrôleurs boats/membres/invitations) ; partagé par le middleware Inertia (`flash.errorAction`), le layout ajoute au toast une action « Voir les offres » qui navigue vers la facturation.
- **i18n** : clé `common.viewPlans` (EN + FR) ; tooltip via `boats.index.quotaReached` (déjà existante).
- **Tests** : fonctionnels (`boatQuota` transmis, `errorAction` posé au quota) + Vitest (`NewBoatButton` : badge, tooltip, ouverture modale au quota, navigation sinon).
