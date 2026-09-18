# 2026-09-18 — Tests : garde du module Location, frontière des rôles et aller-retour des états des lieux (#694)

## Quatre des cinq trous annoncés étaient déjà comblés

Mesuré avant d'écrire, pas supposé. Le domaine Location compte déjà **173 cas fonctionnels** et
**22 routes sur 22** exercées :

| Affirmation de l'issue                                    | Mesure                                                                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Trois policies du domaine sans aucun test »             | #690 les couvre — 26 + 26 + 21 cas générés par `testPolicyMatrix()`                                                                                  |
| « `contract/send` et `contract/sign` jamais exercées »    | les sept routes de contrat sont couvertes, `signed-document` et `DELETE` compris                                                                     |
| « Rien ne vérifie qu'on ne peut pas signer deux fois »    | le code **autorise** la re-signature — elle remplace le document et garde `signedAt` — et un test l'épingle déjà                                     |
| « `GET /invoices/:id/edit` jamais atteinte »              | épinglée par #689                                                                                                                                    |
| « Un répertoire `reservations/` couvert par un shard CI » | #687 a remplacé l'allowlist par une matrice dérivée de l'arborescence : rien à faire, et la garde **échoue** si on réintroduit un `files:` à la main |

Le résidu est plus étroit que l'issue, mais c'est là qu'était le signal.

## La garde de module n'était éprouvée que sur des écrans

`module_gating.spec.ts` couvrait le refus sur quatre **GET d'index** — le cas où il coûte le moins :
une redirection sur un écran n'écrit rien de toute façon. Les **seize** routes d'écriture du domaine,
celles qui créent réservations, états des lieux et contrats, n'étaient jamais éprouvées.

Deux fichiers s'en chargent, à deux niveaux :

- **la présence** : `tests/unit/hygiene/charter_routes_gated.spec.ts` lit la **table de routage** et
  vérifie que chacune des 22 routes du domaine porte
  `requireModulePlan({ feature: 'reservations' })` et `auth()`. Ces routes n'ont pas leur garde,
  elles en **héritent du groupe** : une route déclarée d'un cran trop haut serait ouverte à toute
  organisation, et aucun test du domaine ne le dirait — ils emploient tous un acteur qui a le module.
  La route ajoutée demain est couverte sans que personne n'y pense ;
- **l'effet** : `tests/functional/reservations/module_guard.spec.ts` joue quatorze faces — douze
  écritures et les deux écrans — avec des payloads **valides**, et chaque refus est asserté **avec un témoin** — la base est photographiée
  avant et après. Asserter la seule `location` prouverait une redirection, pas un refus : la requête
  aurait pu écrire, puis rediriger.

## Deux rôles absents de tous les tests du domaine

`mechanic` et `boat_owner` n'apparaissaient dans **aucun** test HTTP des réservations, des contrats
ou des états des lieux — seul `createMemberUser` y figurait. Leur refus n'était prouvé qu'au niveau
unitaire, policy instanciée à la main, sans le `before()` de Bouncer ni la chaîne de middlewares.

La mesure a montré deux refus qui ne se ressemblent qu'en apparence :

- une **lecture** refusée rend un **403** ;
- une **écriture** refusée renvoie un **302 vers `/`**, la page d'accueil marketing publique, avec le
  flash `error: 'Access denied'`. Or le layout marketing ne rend aucun toast : le message n'atteint
  jamais l'utilisateur, éjecté de l'app sans explication. C'est exactement le défaut corrigé en #456
  pour le gating de module, resté entier sur le chemin des autorisations. **Constaté, pas corrigé.**

Le fichier travaille dans une organisation qui **a** le module : sans cela, le refus observé serait
celui de `requireModulePlan`, qui passe avant la policy, et le test aurait changé de sujet sans rien
dire. Un dernier cas fige la différence entre les deux refus.

## L'aller-retour, joué de bout en bout

Les pièces étaient couvertes, jamais le parcours. Et le vocabulaire est l'inverse de l'intuition :
`checkout` est le **départ**, `checkin` le **retour**.

- les deux états des lieux coexistent ; un second départ est refusé sans écraser le premier ;
- **l'ordre de la prop n'est pas celui du séjour** : `listForReservation` trie `orderBy('kind', 'asc')`
  et `checkin` précède `checkout` dans l'alphabet, donc le retour arrive en premier. Le schéma de
  `docs/domain/inspections.md` montrait l'inverse ;
- un point sain au départ, endommagé au retour : les deux constats coexistent, et c'est sur eux que
  repose la comparaison affichée ;
- le défaut donne une action d'équipement `pending`, rattachée à cet état des lieux, dont le bateau
  et l'organisation sont **déduits** — un `boatId` étranger glissé dans le corps ne change rien ;
- **caractérisation** : le backend n'applique **aucune condition**. Une action se crée depuis un état
  des lieux dont aucun point n'a été coché. La règle « un point en `damage` propose une action »,
  présentée comme une règle du domaine par la documentation, n'est qu'un `v-if` dans
  `InspectionChecklistItem.vue` ;
- supprimer l'état des lieux **n'efface pas** l'action : `inspection_id` est `ON DELETE SET NULL`,
  le travail à faire survit au constat qui l'a motivé ;
- les photos : le dossier Cloudinary embarque le `kind`, une série de départ ne peut pas se mélanger
  à celle du retour.

## Le résidu facture, et une facture payée qui se réécrit

`GET /invoices/:id/edit` était épinglée, mais ni la facture d'une autre organisation — **302 vers
`/invoices` + flash, et non le 404 qu'annonçait l'issue ; seul un `:id` non numérique donne un vrai
404** — ni la facture déjà payée.

Et celle-ci est entièrement modifiable : montants, lignes, statut. Elle peut même redescendre en
`draft` **en gardant son `paidAt`**, puisque `update` n'y touche jamais — un brouillon portant une
date de paiement. Le seul invariant réellement protégé est le couple numéro/nature, figé à la
création. Le seul garde-fou du domaine joue dans l'autre sens : `markAsPaid` refuse une facture déjà
payée. **Constaté, pas corrigé** ; suivi par l'issue #717.

## Tests

62 cas ajoutés (3207 → 3269) :

- `tests/unit/hygiene/charter_routes_gated.spec.ts` — 5 cas : les 22 routes du domaine et leur garde,
  avec le témoin de découverte et l'exception du pont réservation → facture.
- `tests/functional/reservations/module_guard.spec.ts` — 18 cas : quatorze faces refusées avec témoin,
  puis les mêmes écritures ouvertes par le module accordé et par le tier Entreprise.
- `tests/functional/reservations/role_frontier.spec.ts` — 25 cas : onze faces × deux rôles, le membre
  en contre-exemple, et les deux refus qu'il ne faut pas confondre.
- `tests/functional/reservations/inspection_round_trip.spec.ts` — 9 cas : le parcours complet.
- `tests/functional/invoices/invoice_edit_guard.spec.ts` — 5 cas : le cross-org et la facture payée.

## Non-vacuité

Sept mutations, chacune restaurée :

| Mutation                                                      | Échec obtenu                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POST /boats/:boatId/reservations` sortie du groupe gardé     | la garde la nomme : `routes du domaine réservations sans requireModulePlan…` |
| le middleware de module appelle `next()` au lieu de rediriger | **14** cas tombent, les 4 cas « module accordé » restent verts               |
| `mechanic` reçoit `inspections.view/create/edit`              | ses quatre faces « états des lieux » tombent, ni une de plus                 |
| `orderBy('kind', 'desc')`                                     | un seul cas tombe, celui de l'ordre                                          |
| `inspectionId: null` dans `createFromInspection`              | le cas défaut → action tombe                                                 |
| le `kind` retiré du dossier Cloudinary                        | le cas des photos tombe                                                      |
| la vérification applicative d'unicité `(réservation, kind)`   | **rien ne tombe** — voir ci-dessous                                          |

La dernière mérite son mot : retirer le `if (existing)` de `createForReservation` ne change **rien**
d'observable. C'est l'**index unique Postgres** `(reservation_id, kind)` qui tient l'invariant, la
vérification applicative n'étant qu'un doublon de confort. Confirmé en neutralisant aussi la
détection du `23505` : le cas tombe alors. Le test épingle donc l'invariant, pas une couche — et on
sait désormais laquelle le porte.

## Documentation corrigée

`docs/domain/reservations-and-pricing.md` affirmait que « les réservations sont disponibles pour
toute organisation » : elles sont gardées par le module Location depuis #595, en lecture comme en
écriture. Elle affirmait aussi qu'il n'y a « pas de `client_id` » — la colonne existe depuis #275 —
et décrivait `DELETE` comme un simple « Supprime », alors qu'une réservation **confirmée** n'est
jamais supprimable.

`docs/domain/inspections.md` nommait `equipment_media` comme table des photos : c'est la table
polymorphe `media`. Elle ne mentionnait nulle part la garde de module, première cause d'un 302
inexpliqué. Et elle présentait le passage défaut → action comme une règle du domaine. Les trois sont
corrigées, avec l'ordre de la prop et la couche qui tient réellement l'unicité.

`docs/dev/testing.md` gagne une section : une garde prouvée sur des GET d'index ne prouve rien des
écritures, le témoin qui sépare « refusé » de « redirigé », l'introspection de la table de routage
pour une garde posée sur un groupe, et le buffer de texte qui n'est pas une image.
