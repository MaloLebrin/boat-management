# Domaine — Ports et cartographie marina (#604, #695)

## Objectif fonctionnel

Décrire physiquement un port d'attache — ses pontons, ses zones de mouillage,
ses places — et savoir quel bateau est amarré où. C'est ce qui alimente le plan
interactif (`MarinaCanvas`), le compteur de places libres du dashboard et le
champ « place » des formulaires bateau.

```
Port  (organization_id)
 ├── Pontoon   (port_id, position_x, position_y)
 │     └── Spot  (pontoon_id, organization_id)
 │            └── Boat.spot_id            ← au plus un bateau par place
 └── Mouillage (port_id, position_x, position_y)
       └── Spot  (mouillage_id, organization_id)
```

Une place pend à un **ponton ou** à un mouillage, jamais aux deux et jamais à
aucun des deux : l'invariant est tenu par la contrainte Postgres
`chk_spots_single_owner` (`1779300014000_alter_spots_add_owner_check.ts`). Les
deux routes de création posent explicitement l'autre clé à `null`.

## Colonnes d'organisation : deux modèles cohabitent

| Table        | Rattachement à l'organisation           |
| ------------ | --------------------------------------- |
| `ports`      | colonne `organization_id`               |
| `pontoons`   | **aucune colonne** — hérite de son port |
| `mouillages` | **aucune colonne** — hérite de son port |
| `spots`      | colonne `organization_id`, `NOT NULL`   |

C'est ce qui explique `MouillagePolicy.sameOrgViaPort` : la policy doit lire
`mouillage.port.organizationId`, donc la relation doit être **préchargée** —
sinon l'isolation ne se prononce pas. Les pontons, eux, n'ont **pas de policy du
tout** : leurs routes passent par `PortPolicy` avec le port en ressource, ce qui
revient au même sans le détour. Les places portent leur organisation et se
comparent directement.

## Deux gardes en amont, pas une

Les **20 routes** du groupe de `start/routes/ports.ts` passent par
`middleware.auth()` puis `middleware.requirePortsPlan()`, qui refuse deux fois :

| Cas                                                          | Redirection                                             |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| plan Starter ou Pro                                          | `302 → /settings/billing` + message d'upsell Entreprise |
| profil `private` (compte particulier), quel que soit le plan | `302 → /dashboard` (#604)                               |

`tests/unit/hygiene/ports_routes_gated.spec.ts` vérifie par introspection de la
table de routage que **chaque** route du domaine porte les deux middlewares.
C'est indispensable parce que la garde vient du **groupe** : `PUT /spots/:id` et
`DELETE /spots/:id` n'ont même pas le préfixe `/ports`, et une route « spots »
ajoutée ailleurs passerait inaperçue.

> **`PATCH /boats/:id/assignment` est gardé lui aussi** : son URL est sous
> `/boats`, mais la route écrit `boats.spot_id` et n'est appelée que depuis le
> plan de marina. Elle est donc déclarée dans le groupe de `start/routes/ports.ts`
> — une organisation redescendue en Starter ne peut plus amarrer sur ses places
> héritées (#721).

## Autorisations

| Route                                   | Policy réellement appelée                 | Capacité lue               |
| --------------------------------------- | ----------------------------------------- | -------------------------- |
| `GET /ports`, `GET /ports/:id`          | **aucune** (constat #723)                 | —                          |
| `GET /ports/new`, `POST /ports`         | `PortPolicy.create`                       | `ports.create`             |
| `GET /ports/:id/edit`, `PUT /ports/:id` | `PortPolicy.edit`                         | `ports.edit`               |
| `DELETE /ports/:id`                     | `PortPolicy.delete`                       | `ports.delete`             |
| pontons, mouillages, positions          | `PortPolicy.create` / `.edit` / `.delete` | idem                       |
| les 4 routes de place                   | `SpotPolicy.create` / `.edit` / `.delete` | `spots.create/edit/delete` |

Un `member` gère donc les **places** de son port — il les crée et les renomme —
mais pas l'infrastructure qui les porte : ports, pontons, mouillages et
positions restent admin-only, comme la suppression d'une place
(`spots.delete`). `PUT` et `DELETE /spots/:id` chargent la place **avant**
d'autoriser, pour que `SpotPolicy` vérifie aussi `sameOrg` sur la ressource.
Le gestionnaire de places (`SpotsManager`) n'affiche que les boutons dont
l'utilisateur a la capacité (#719).

`index` et `show`, eux, n'autorisent rien du tout. Seul le scoping
d'organisation des services les protège : un `mechanic` — et même un
`boat_owner`, dont le jeu de capacités est volontairement vide — lit la page du
port, ses places, et la liste nominative des bateaux de l'organisation.
Constat #723.

Les deux refus ne se ressemblent qu'en apparence : une **lecture** refusée rend
un `403`, une **écriture** refusée renvoie `302 → /`, la page d'accueil
marketing, avec un flash `error: 'Access denied'` que ce layout ne rend pas.

## Isolation multi-tenant des routes sans `:portId`

`PUT /spots/:id` et `DELETE /spots/:id` n'ont aucun port dans l'URL pour se
raccrocher. Leur isolation repose **entièrement** sur
`SpotService.getForUserOrFail`, qui filtre sur `organizationId`. Une place
étrangère ne rend ni 403 ni 404 : `SpotNotFoundError` → **302 vers `/ports`**,
sans flash. Un `:id` non numérique, lui, rend un vrai 404 via le matcher de
route.

Les routes préfixées, elles, vérifient **deux** appartenances : le port doit
être à moi (`PortService.getForUserOrFail`) _et_ le ponton doit être à ce port
(`PontoonService.getForPortOrFail`). Un ponton d'un autre de mes ports est donc
refusé — `302 → /ports/:portId` — même si tout m'appartient.

L'`organizationId` d'une place est **déduit du port**, jamais lu du corps de
requête. L'invariant est tenu par le validateur : VineJS ne laisse passer que
les clés déclarées, et `createSpotValidator` n'en déclare que deux.

## Un bateau par place

`uq_boats_spot_id` (`1805000001000_alter_boats_add_unique_spot_id.ts`) est une
contrainte d'unicité Postgres sur `boats.spot_id`. C'est elle qui tient la
règle ; `BoatHullService._evictSpotOccupant` ne fait que la rendre
satisfaisable, en démarrant l'occupant précédent **dans la même transaction**
avant d'amarrer le nouveau. Amarrer sur une place occupée n'est donc pas refusé,
c'est une **éviction silencieuse**.

Une place étrangère passée à `PATCH /boats/:id/assignment` est refusée : le
bateau garde sa place et un flash `flash.spot.notInOrg` l'explique, comme sur
`POST /boats` et `PUT /boats/:id` (#721).

## Supprimer : un étage occupé est toujours refusé

| Cible              | Occupée par un bateau                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Port               | refusé — `PortHasBoatsError` + flash                                        |
| Ponton / mouillage | refusé — `PontoonHasBoatsError` / `MouillageHasBoatsError` + flash          |
| Place              | refusé — `SpotHasBoatError` + flash `flash.spots.hasBoat` nommant le bateau |

L'exploitant démarre le bateau d'abord (`PATCH /boats/:id/assignment` avec
`spotId` vide), puis supprime la place. Avant #720, la place se supprimait et
`boats.spot_id ON DELETE SET NULL` démarrait le bateau en silence, laissant son
séjour à quai ouvert sur une place disparue — la garde du ponton se contournait
place par place. Côté écran, `SpotsManager` prévient (`ports.spots.hasBoat`)
avant d'ouvrir la confirmation, comme `PontoonCard`.

Supprimer un ponton ou un mouillage **cascade** sur ses places
(`ON DELETE CASCADE`), qui cascadent à leur tour en `SET NULL` sur les bateaux —
filet que plus aucun chemin applicatif n'atteint, puisque chaque étage refuse
avant d'écrire.

## `boat_position_history` : une table, deux usages

La table porte deux choses que rien ne distingue :

- un **point de position** — `latitude`, `longitude`, `speed_knots`,
  `heading_degrees`, `source` — écrit par `POST /boats/:boatId/position` ;
- un **séjour à quai** — `spot_id` — écrit par
  `BoatHullService._logBerthChange`, à la création d'un bateau, à sa mise à jour
  et à chaque amarrage.

Les deux emploient la même convention de ligne ouverte (`ended_at IS NULL`) et
le même geste de clôture (`whereNull('endedAt')`), qui ne regarde pas la nature
de la ligne. Enregistrer une position GPS clôt donc le séjour à quai en cours
alors que `boats.spot_id` dit toujours amarré, et réciproquement. Constat #722.

Aucun écran ne s'en aperçoit : tous lisent `boats.spot_id`, jamais l'historique.

## Bornes du plan interactif

`updatePositionValidator` (`app/validators/marina_layout.ts`) :
`x ∈ [0, MARINA_CANVAS_WIDTH]`, `y ∈ [0, MARINA_CANVAS_HEIGHT]`, **bornes
incluses** des deux côtés. Les deux coordonnées sont requises : un payload
partiel est refusé en bloc, jamais appliqué à moitié. Un refus de validation
rend `302` et laisse la position inchangée (`null` si le ponton n'avait jamais
été placé).

## Où c'est testé

| Fichier                                                 | Ce qu'il prouve                                         |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `tests/unit/hygiene/ports_routes_gated.spec.ts`         | les 20 routes portent `auth` + `requirePortsPlan`       |
| `tests/functional/ports/ports_plan_gating.spec.ts`      | le refus de plan, Starter et Pro                        |
| `tests/functional/ports/ports_profile_gating.spec.ts`   | le refus de profil `private` (#604)                     |
| `tests/functional/ports/spots.spec.ts`                  | les 4 routes de place, hiérarchie et isolation          |
| `tests/functional/ports/spot_deletion_frontier.spec.ts` | le refus aux deux étages (#720)                         |
| `tests/functional/ports/marina_role_frontier.spec.ts`   | member, mechanic, boat_owner (#719, #723)               |
| `tests/inertia/spots_manager_permissions.spec.ts`       | les boutons de place gardés par capacité (#719)         |
| `tests/functional/ports/layout_positions.spec.ts`       | isolation et bornes du glisser-déposer                  |
| `tests/functional/boats/boats_assign.spec.ts`           | l'éviction et le scoping de `spot_id`                   |
| `tests/functional/boats/boat_berth_history.spec.ts`     | séjours à quai, garde marina de l'amarrage (#721, #722) |
| `tests/functional/ports/ports_pages_contract.spec.ts`   | les 4 pages Inertia (#689)                              |
| `tests/browser/marina_canvas.spec.ts`                   | **le geste** : drag, mode édition, affectation          |

### Le geste, et non plus seulement la route (#700)

`layout_positions.spec.ts` prouve les deux routes de position, leur isolation inter-organisations
et les bornes exactes du canvas. Il ne dit rien de ce qui les atteint. Trois choses ne sont
observables qu'au navigateur :

- **le glisser-déposer persiste réellement** — on mesure `positionX/Y` en base après le geste, pas
  des pixels ;
- **le mode édition garde le geste** : hors édition, le même mouvement n'émet aucune requête. La
  garde est `if (!props.editMode) return` dans `MarinaCanvas.startPontoonDrag` — et elle protège
  aussi le clic sur une place, qui sans elle démarre un drag et capture le pointeur ;
- **l'affectation depuis le plan** : clic sur une place → `BoatAssignModal` → `boat.spotId` en base.

Trois `data-testid` en production rendent ce parcours déterministe :
`marina-pontoon-{id}` et `marina-mouillage-{id}` sur les `<g>` déplaçables, `marina-spot-{id}` sur
les `<g>` de place. Sans eux, un ponton ne s'atteint que par son `<text>` de nom remonté en
`xpath=..`, et les noms de places sont tronqués à 6 caractères dans le rendu (3 pour les
mouillages) — non uniques par construction.

Le rendu est du **SVG inline**, pas un `<canvas>` : les `<g>`, `<rect>` et `<text>` sont de vrais
nœuds DOM. C'est ce qui rend le plan adressable ; un vrai `<canvas>` ne le serait pas.

## Constats ouverts

| #    | Constat                                                                |
| ---- | ---------------------------------------------------------------------- |
| #722 | `boat_position_history` : positions et séjours se ferment mutuellement |
| #723 | `GET /ports` et `GET /ports/:id` n'autorisent rien                     |
