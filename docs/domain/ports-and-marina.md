# Domaine — Ports et cartographie marina (#604, #695, #891)

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

Les **27 routes** du groupe de `start/routes/ports.ts` passent par
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
| `GET /ports`                            | `PortPolicy.viewAny`                      | `ports.view`               |
| `GET /ports/:id`                        | `PortPolicy.view`                         | `ports.view`               |
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

`index` et `show` lisent `ports.view` depuis #723. `index` n'a pas de ressource
à passer : il appelle `PortPolicy.viewAny`, la capacité seule. `show` charge le
port **avant** d'autoriser, comme `edit`, pour que `PortPolicy.view` vérifie
aussi `sameOrg` — et surtout pour que l'autorisation passe avant le chargement
des relations et de la liste nominative des bateaux.

Avant, ces deux lectures n'autorisaient rien : seul le scoping d'organisation
des services les protégeait. Un `mechanic` — et même un `boat_owner`, dont le
jeu de capacités est **volontairement vide** pour qu'il ne touche aucun écran
staff — lisait la page du port, ses pontons, ses places, ses taux d'occupation,
et la liste nominative des bateaux de l'organisation : donc les bateaux des
autres clients de l'exploitant.

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

## Exploitation : places, escales, contrats (#891)

Le plan ne suffisait pas à une capitainerie : une place n'était qu'un nom. Elle porte désormais ses
dimensions maximales (`lengthM`, `beamM`, `draftM`), un type (`annual`, `seasonal`, `visitor`,
`technical`), un **statut saisi** (`available`, `reserved`, `out_of_service`) et trois tarifs
(nuitée, mois, an). « Occupée » n'est **pas** un statut saisi : `spotEffectiveStatus` le déduit d'un
bateau amarré (`boats.spot_id`) ou d'une escale `arrived` — hors service prime sur tout.

### Escales (`marina_stays`)

Une escale pose sur une place un bateau de la flotte (`boatId`) **ou** un visiteur décrit en ligne
(nom, longueur, immatriculation, contact). Un visiteur n'entre ni dans la flotte ni dans le quota de
bateaux du plan.

| Règle                                                               | Comportement                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| place hors service                                                  | refusé — `SpotOutOfServiceError`                                                 |
| autre escale `expected`/`arrived` qui chevauche `[arrivée, départ)` | refusé — `MarinaStayOverlapError` nommant l'invité ; le jour du départ est libre |
| ni bateau ni nom de visiteur                                        | refusé — `MarinaStayGuestRequiredError`                                          |
| bateau plus long que la place                                       | **accepté**, avertissement dans le flash de succès                               |
| place attribuée à un bateau de la flotte                            | **accepté**, avertissement (le titulaire peut être en mer)                       |
| tarif nuitée absent                                                 | `spots.dailyRate`, sinon 0 — figé sur l'escale                                   |

Statuts : `expected` → `arrived` → `departed`, ou `expected` → `cancelled`
(`MARINA_STAY_TRANSITIONS`). `invoiced` n'est posé que par `POST …/invoice`, autorisé depuis
`arrived` ou `departed` : un brouillon de facture (`InvoiceService.create`, dans la transaction de
l'escale, ligne verrouillée) avec une ligne « place × nuitées » puis une ligne par service, TVA
pré-remplie à 20 %. L'escale passe `invoiced` avec `invoiceId` dans la même transaction : une double
soumission ne crée pas deux factures. Une escale facturée ne se supprime plus.

### Contrats d'amarrage (`mooring_contracts`)

Un client (obligatoire, de l'organisation), une place, un bateau facultatif, une période
(`endsOn` **inclus**, facultatif), une périodicité (`monthly`, `quarterly`, `annual`) et un montant
HT par échéance. Un seul contrat `active` par place. `nextInvoiceOn` démarre à `startsOn`.

Le job `GenerateMooringContractInvoices` (cron **05:45** Europe/Paris, avant le passage en retard de
06:00) émet un brouillon par échéance arrivée, chacune dans sa transaction verrouillée — rattrapage
borné à 24 périodes, idempotent le même jour. Les échéances sont recalculées **depuis l'ancrage**
(`addPeriods`) : un contrat du 31 janvier facture le 28 février puis le 31 mars, sans dériver au 28.
La dernière période s'arrête sur `endsOn` et se facture en entier (pas de prorata : le brouillon se
corrige). Résilier pose `terminated` et vide `nextInvoiceOn` ; un contrat qui a déjà émis une
facture (`lastInvoiceId`) se résilie mais ne se supprime pas. Un contrat se termine dans les
30 jours : badge « à renouveler » (pas de rappel e-mail dans cette version).

### Capitainerie et occupation

L'onglet **Capitainerie** de la fiche port (`HarbourOfficeService.forPort`) sert escales
(actives + départs des 60 derniers jours), contrats, arrivées attendues aujourd'hui, départs dus
(escales `arrived` dont le départ est aujourd'hui ou passé) et deux taux :

- **jour** : places occupées (bateau amarré ou escale `arrived`) / places du port ;
- **mois** : place-nuits occupées / (places × nuits du mois). Comptent les escales arrivées,
  parties ou facturées, les contrats actifs, et — pour une place sans ni l'un ni l'autre — un bateau
  amarré sur les nuits écoulées du mois. Une place-nuit couverte deux fois ne compte qu'une fois.

### Supprimer une place réservée

`SpotService.delete` refuse aussi une place tenue par une escale `expected`/`arrived` ou un contrat
`active` (`SpotHasActiveBookingError`, flash `flash.spots.hasActiveBooking`) : la cascade effacerait
la réservation sans prévenir. L'historique (escales closes, contrats résiliés) suit la place.

### Routes et autorisations

| Route                                                          | Policy                                     |
| -------------------------------------------------------------- | ------------------------------------------ |
| `POST /ports/:portId/marina-stays`                             | `SpotPolicy.edit` (la place)               |
| `PATCH /ports/:portId/marina-stays/:marinaStayId/status`       | `SpotPolicy.edit`                          |
| `POST /ports/:portId/marina-stays/:marinaStayId/invoice`       | `SpotPolicy.edit` + `InvoicePolicy.create` |
| `DELETE /ports/:portId/marina-stays/:marinaStayId`             | `SpotPolicy.delete`                        |
| `POST /ports/:portId/mooring-contracts`                        | `SpotPolicy.edit`                          |
| `PATCH /ports/:portId/mooring-contracts/:contractId/terminate` | `SpotPolicy.edit`                          |
| `DELETE /ports/:portId/mooring-contracts/:contractId`          | `SpotPolicy.delete`                        |

Un `member` pose, fait avancer et facture les escales, crée et résilie les contrats ; seul l'admin
supprime. Chaque route passe d'abord par le port de l'URL (`PortService.getForUserOrFail`), puis
par l'escale ou le contrat **de ce port** : une escale d'un autre port, même de l'organisation, est
introuvable (`flash.marina.stayNotFound`). Toutes vivent dans le groupe gardé de
`start/routes/ports.ts` (plan Entreprise, profil professionnel), et
`cross_org_routes.spec.ts` les sonde avec les ids d'une autre organisation.

## `boat_position_history` : une table, deux natures (#722)

La table porte deux choses, désormais distinguées par la colonne `kind` :

- `kind='position'` — un **point de position** : `latitude`, `longitude`,
  `speed_knots`, `heading_degrees`, `source`, écrit par
  `POST /boats/:boatId/position` ;
- `kind='berth'` — un **séjour à quai** : `spot_id`, écrit par
  `BoatHullService._logBerthChange`, à la création d'un bateau, à sa mise à jour
  et à chaque amarrage.

Les deux partagent la convention de ligne ouverte (`ended_at IS NULL`), mais
**plus le geste de clôture**. Tant que celui-ci s'écrivait des deux côtés en
`whereNull('endedAt')` sans regarder la nature de la ligne, enregistrer une
position GPS clôturait le séjour à quai en cours alors que `boats.spot_id`
disait toujours amarré — et réciproquement. La clôture vit maintenant dans
`BoatPositionHistory.closeOpenOfKind(boatId, kind, trx?)` et porte toujours son
`kind` : elle ne balaie que les lignes de sa propre nature. Un bateau amarré qui
émet des positions a donc **deux lignes ouvertes**, une par nature, et c'est
l'état correct.

Aucun écran ne s'en apercevait : tous lisent `boats.spot_id`, jamais
l'historique. C'est précisément pourquoi l'historique des séjours pouvait être
faux sans que rien ne le montre.

`boats.spot_id` reste la source de vérité de l'amarrage. La migration
`1849000001000_alter_boat_position_history_add_kind` s'en sert pour réparer
l'existant : elle classe les lignes (`spot_id IS NOT NULL` ⇒ séjour) puis rouvre
les séjours faussement clos — un bateau amarré dont le **dernier** séjour porte
cette même place tout en étant clos. Une clôture légitime (démarrage,
déplacement, éviction) ouvre toujours une ligne plus récente ou laisse
`boats.spot_id` à `null`, donc aucun séjour réellement terminé n'est rouvert.

## Bornes du plan interactif

`updatePositionValidator` (`app/validators/marina_layout.ts`) :
`x ∈ [0, MARINA_CANVAS_WIDTH]`, `y ∈ [0, MARINA_CANVAS_HEIGHT]`, **bornes
incluses** des deux côtés. Les deux coordonnées sont requises : un payload
partiel est refusé en bloc, jamais appliqué à moitié. Un refus de validation
rend `302` et laisse la position inchangée (`null` si le ponton n'avait jamais
été placé).

## Où c'est testé

| Fichier                                                             | Ce qu'il prouve                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `tests/unit/hygiene/ports_routes_gated.spec.ts`                     | les 27 routes portent `auth` + `requirePortsPlan`                    |
| `tests/functional/ports/ports_plan_gating.spec.ts`                  | le refus de plan, Starter et Pro                                     |
| `tests/functional/ports/ports_profile_gating.spec.ts`               | le refus de profil `private` (#604)                                  |
| `tests/functional/ports/spots.spec.ts`                              | les 4 routes de place, hiérarchie et isolation                       |
| `tests/functional/ports/spot_deletion_frontier.spec.ts`             | le refus aux deux étages (#720)                                      |
| `tests/functional/ports/marina_role_frontier.spec.ts`               | member, mechanic, boat_owner (#719, #723)                            |
| `tests/inertia/spots_manager_permissions.spec.ts`                   | les boutons de place gardés par capacité (#719)                      |
| `tests/functional/ports/layout_positions.spec.ts`                   | isolation et bornes du glisser-déposer                               |
| `tests/functional/boats/boats_assign.spec.ts`                       | l'éviction et le scoping de `spot_id`                                |
| `tests/functional/boats/boat_berth_history.spec.ts`                 | séjours à quai, leur nature, garde marina de l'amarrage (#721, #722) |
| `tests/functional/ports/ports_pages_contract.spec.ts`               | les 4 pages Inertia (#689)                                           |
| `tests/browser/marina_canvas.spec.ts`                               | **le geste** : drag, mode édition, affectation                       |
| `tests/functional/ports/marina_stays.spec.ts`                       | escales : chevauchement, hors service, facture, cycle, rôles (#891)  |
| `tests/functional/ports/mooring_contracts.spec.ts`                  | contrats : un actif par place, résiliation, suppression gardée       |
| `tests/integration/jobs/generate_mooring_contract_invoices.spec.ts` | rattrapage, idempotence, fin de contrat                              |
| `tests/integration/services/harbour_office_service.spec.ts`         | taux du jour et du mois                                              |
| `tests/unit/helpers/marina.spec.ts`                                 | nuitées, occupation, échéances ancrées                               |
| `tests/inertia/harbour_office.spec.ts`                              | gestes par statut et rôle, filtre de longueur, capitainerie          |

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

Aucun. Les constats que cette page portait — #719, #720, #721, #722, #723 — sont tous traités ;
le détail de chacun vit dans `docs/changelog/`.
