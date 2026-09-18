# 2026-09-18 — L'amarrage d'un bateau passe sous la garde marina (#721)

`PATCH /boats/:id/assignment` écrit `boats.spot_id` mais était déclarée dans `start/routes/boats.ts`, hors du groupe gardé par `requirePortsPlan()`. Une organisation redescendue en Starter continuait donc d'amarrer sur ses places héritées d'un abonnement Entreprise, alors que toute la section `/ports` lui était fermée. Et une place étrangère y était ignorée sans message.

- **Route.** Déplacée dans le groupe de `start/routes/ports.ts` : même URL, même nom (`boats.assign`), mais héritage de `auth()` + `requirePortsPlan()`. Plan Starter ou Pro → `302` vers `/settings/billing` avec le flash d'upsell `flash.quota.portsExceeded` ; profil particulier → `/dashboard`. La route n'est appelée que depuis le plan de marina (`SpotsManager`, `use_marina_interactions`), l'UI n'est donc pas affectée.
- **Place étrangère.** `BoatsController.assign` pose désormais un flash `error` `flash.spot.notInOrg` sur `SpotNotFoundError`, comme `POST /boats` et `PUT /boats/:id`. Le bateau garde sa place.
- **Tests.** `ports_routes_gated.spec.ts` inclut la route dans le domaine (liste explicite des routes hors préfixe) et vérifie sa garde ; `boat_berth_history.spec.ts` passe de caractérisation à validation (Starter refusé, flash sur place étrangère) ; `boats_assign.spec.ts`, `boat_not_found_redirect.spec.ts` et `boat_berth_history.spec.ts` emploient `createEnterpriseAdminUser()` pour les appels à la route.
- **Docs.** `docs/domain/ports-and-marina.md` mis à jour, constat #721 retiré des constats ouverts.
