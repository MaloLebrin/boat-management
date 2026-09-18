# 2026-09-18 — Tests : les places de marina, le plan interactif et l'amarrage (#695)

## Quatre des six trous annoncés étaient déjà comblés, et trois scénarios décrivaient un autre code

Mesuré avant d'écrire — cette fois avec une spec sonde jetable, qui appelle les routes et affiche ce
qu'elles rendent vraiment.

| Affirmation de l'issue                                   | Mesure                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| « Les 2 routes de repositionnement : aucun test »        | `pontoons.spec.ts` et `mouillages.spec.ts` couvrent le cas valide, les négatifs et le hors-canvas |
| « `GET /ports/:id/edit` jamais atteinte »                | épinglée par #689, comme `index`, `show` et `new`                                                 |
| « `MouillagePolicy`, le cas le plus fragile, sans test » | #690 la couvre, plus deux cas d'intégration sur le `sameOrg` indirect                             |
| « Place occupée / place étrangère non couvertes »        | `boats_assign.spec.ts` couvre l'éviction, le `spotId: null` et le cross-org (9 cas)               |
| « Place d'une autre organisation → 403/404 »             | **c'est un 302 vers `/ports`**, sans flash                                                        |
| « `member` → création autorisée, suppression refusée »   | **faux dans les deux moitiés** — il est refusé sur les trois écritures                            |
| « Place déjà occupée → refus »                           | c'est une **éviction** de l'occupant précédent, dans la même transaction                          |

Le trou réel était ailleurs, et il était large : **les quatre routes `spots` n'avaient aucune
couverture comportementale**. Un seul test les effleurait, et c'était un test de plan.

## Ce qui a été écrit

51 cas ajoutés (3269 → 3320) :

- `tests/unit/hygiene/ports_routes_gated.spec.ts` — 5 cas. Les 19 routes du domaine héritent leur
  garde du **groupe** ; deux d'entre elles, `PUT /spots/:id` et `DELETE /spots/:id`, n'ont même pas
  le préfixe `/ports`. Une route « spots » ajoutée demain ailleurs passerait pour normale et serait
  ouverte à tout plan. La garde lit la table de routage, pas le fichier source.
- `tests/functional/ports/spots.spec.ts` — 12 cas. Création sous un ponton puis sous un mouillage,
  l'organisation déduite du port, la hiérarchie `(port, ponton)` vraiment vérifiée, et l'isolation
  des deux routes sans préfixe — la seule chose qui les protège.
- `tests/functional/ports/spot_deletion_frontier.spec.ts` — 4 cas, deux comportements opposés sur le
  même décor.
- `tests/functional/ports/marina_role_frontier.spec.ts` — 14 cas. `member`, `mechanic` et
  `boat_owner`, chaque refus avec son témoin, et les deux refus qu'on confond.
- `tests/functional/ports/layout_positions.spec.ts` — 8 cas. L'isolation du glisser-déposer et les
  bornes **exactes** du canvas.
- `tests/functional/boats/boat_berth_history.spec.ts` — 8 cas. Les séjours à quai, jamais regardés
  par aucun test HTTP.

## Cinq constats, caractérisés et non corrigés

Aucun changement de comportement de production dans cette PR.

- **#719 — `SpotPolicy` n'est appelée nulle part.** `SpotsController` autorise via `PortPolicy`,
  donc `ports.create/edit/delete`, admin-only. Les capacités `spots.view/create/edit` que la matrice
  accorde au `member` sont inatteignables : il est refusé sur les trois écritures, avec un 302 vers
  `/` et un flash que le layout marketing ne rend pas. Il voit pourtant le gestionnaire de places,
  qui ne filtre sur aucune capacité.
- **#720 — `DELETE /spots/:id` démarre un bateau en silence.** Supprimer un ponton occupé est refusé
  avec un flash ; supprimer une de ses places ne l'est pas, `boats.spot_id` étant
  `ON DELETE SET NULL`. La garde d'un étage se contourne à l'étage du dessous, et le test le joue de
  bout en bout.
- **#721 — `PATCH /boats/:id/assignment` échappe à la garde de plan.** Un admin Starter amarre
  encore sur une place héritée, alors que toute la section lui est fermée. Et une place étrangère y
  est un no-op silencieux : les deux branches du `try/catch` rendent le même `redirect().back()`.
- **#722 — `boat_position_history` porte deux usages qui se ferment l'un l'autre.** Points GPS et
  séjours à quai partagent la table et la convention de ligne ouverte ; chaque écriture clôt « toutes
  les lignes ouvertes » du bateau sans regarder leur nature. Enregistrer une position clôt donc le
  séjour alors que `boats.spot_id` dit toujours amarré.
- **#723 — `GET /ports` et `GET /ports/:id` n'autorisent rien.** Aucun `bouncer.authorize` sur les
  deux lectures, alors que toutes les autres méthodes du contrôleur en ont un. Un `mechanic`, et même
  un `boat_owner` dont le jeu de capacités est volontairement vide, lit le port complet **et la liste
  nominative des bateaux de l'organisation**. C'est celui-là qui mérite d'être traité en premier.

Ce dernier est sorti de la mesure elle-même : deux cas écrits pour asserter un 403 ont renvoyé 200.

## Non-vacuité

Six mutations, chacune restaurée :

| Mutation                                                     | Échec obtenu                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `PUT /spots/:id` sortie du groupe gardé                      | la garde la nomme : `routes de la marina sans requirePortsPlan() : PUT /spots/:id`        |
| `SpotService.getForUserOrFail` sans le filtre d'organisation | 3 cas d'isolation tombent                                                                 |
| `SpotsController` branché sur `SpotPolicy`                   | 3 cas « member refusé » tombent — la preuve qu'ils mesurent l'enforcement, pas la matrice |
| `_logBerthChange` sans la clôture des lignes ouvertes        | 3 cas d'historique tombent                                                                |
| `max(MARINA_CANVAS_WIDTH)` → `max(WIDTH - 1)`                | **1 seul cas** tombe sur 18, celui de la borne exacte                                     |
| `SpotService.delete` refusant une place occupée              | 2 des 4 cas de caractérisation tombent — ils diront où quand #720 sera traitée            |

Une septième n'a rien fait tomber : faire lire `payload.organizationId` au service ne change rien
tant que `createSpotValidator` ne déclare pas la clé — VineJS filtre en amont. L'invariant est tenu
par le **validateur**, pas par le service. Même famille que l'index unique de #694 ; c'est écrit dans
le test plutôt que supposé.

## Documentation

- **`docs/domain/ports-and-marina.md` — nouveau.** Le domaine n'avait aucun document, seul de tous
  ceux de l'app. Le modèle à deux niveaux et sa contrainte `chk_spots_single_owner`, l'unicité
  `uq_boats_spot_id` tenue par Postgres, les deux gardes en amont, la policy réellement appliquée aux
  places, les trois comportements de suppression, les deux usages de `boat_position_history`, et les
  cinq constats avec leur numéro.
- **`docs/domain/auth-acl.md`** — deux corrections. La ligne « Spots » promettait au member trois
  capacités qu'aucune route ne lit ; et le paragraphe du hook `before()` affirmait que `Spot` n'a pas
  de colonne `organization_id`, alors qu'elle existe, `NOT NULL`, depuis la création de la table.
- **`app/utils/org_scoped_policy.ts`** — la même phrase fausse, en commentaire. Seul diff hors
  `tests/` et `docs/` : un commentaire, aucun comportement.
- **`docs/dev/testing.md`** — une section : la spec sonde jetable comme méthode, nommer la couche qui
  tient l'invariant, et le contre-exemple qui n'en est pas un.
