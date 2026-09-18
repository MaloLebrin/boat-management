# 2026-09-18 — Tests : l'équipage, et le protocole hors-ligne pris comme une chaîne (#696)

## Quatre des cinq trous annoncés étaient déjà comblés, dont celui présenté comme le cœur du sujet

Mesuré avant d'écrire, sonde jetable à l'appui.

| Affirmation de l'issue                                                | Mesure                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| « Cinq policies du domaine sans aucun test »                          | #690 les couvre **toutes les cinq**                                                                    |
| « `BoatFuelLogService` mérite un test de non-régression »             | `tests/integration/services/boat_fuel_log_service.spec.ts` fait exactement ça, 4 cas au niveau service |
| « Le PDF de rôle d'équipage n'est atteint que par un seul fichier »   | il a le sien, 5 cas, cross-org et nom de fichier compris                                               |
| « **Rien ne garantit que les contrôleurs émettent encore ces clés** » | **les cinq clés sont assertées**, dans quatre specs                                                    |
| « Les 4 routes sur un équipier d'une autre organisation → 404 »       | **302 vers `/crew` + flash `crew.notFound`**                                                           |

Restaient deux choses, et la seconde était plus grave que ce que l'issue décrivait.

## Le maillon que personne ne regardait

Le protocole de file hors-ligne était éprouvé **maillon par maillon, jamais comme une chaîne**.
Chaque contrôleur prouve qu'il **pose** son flash. Rien ne prouvait qu'il **arrive** : le bloc
`flash` de `InertiaMiddleware.share()` recopie les cinq clés à la main, et aucun test ne le
regardait.

La démonstration tient en une mutation : retirer `conflictType` du `return` du middleware fait
tomber la nouvelle spec **en nommant la clé**, et laisse les **58 cas** de
`navigation_logs`, `inspections` et `maintenance_sheets` — ceux-là mêmes qui assertent ce flash —
entièrement verts. Pendant ce temps, la modale de conflit ne s'ouvrirait plus jamais.

Faute de pouvoir enchaîner deux requêtes (`SESSION_DRIVER=memory`, un flash ne survit pas d'un appel
client au suivant — vérifié, cookie de session reporté compris), la traversée se teste au niveau du
middleware, sur un contexte anonyme de vingt lignes.

## Trois constats, dont un sorti de la garde elle-même

Aucun changement de comportement de production dans cette PR.

- **#725 — `update-navigation-log-entry` n'a aucun verrou optimiste.** Le composant l'enfile, mais
  n'envoie pas de `_expectedUpdatedAt`, le service n'a aucune détection de conflit, et la modale n'a
  pas de carte de champs pour ce type. C'est la seule mutation enfilée hors-ligne sans verrou, sur
  l'écran le plus susceptible d'être utilisé sans réseau.
- **#726 — le vocabulaire d'actions est écrit à la main des deux côtés.**
  `shared/constants/offline_queue.ts` existe pour empêcher exactement ça et ne déclare que les trois
  actions des états des lieux. Chaque côté est assert contre son propre littéral : renommer d'un seul
  côté laisse tout vert et casse `flash.conflictType === action.type` en silence.
- **#727 — un refus métier sur un rejeu passe pour un succès.** C'est la garde de vocabulaire qui l'a
  sorti, pas une lecture : elle a nommé quatre créations enfilées — `create-navigation-log`,
  `create-navigation-log-entry`, `create-fuel-log`, `increment-engine-hours` — pour lesquelles
  **aucun contrôleur ne renvoie `rejectedType`**. Or leurs refus sont rendus en `flash('error')` +
  redirection, et `drainQueue` ne distingue un refus d'un succès que par cette clé : sans elle,
  l'action est **supprimée de la file** sous un toast « synchronisation réussie ».

  Le scénario : un équipier saisit ses points en mer, le skipper clôture la sortie depuis le quai.
  Au retour du réseau, chaque point est refusé — et jeté, sans trace. C'est exactement ce que la file
  existe pour empêcher.

## Tests

37 cas ajoutés (3320 → 3357) :

- `tests/unit/middleware/inertia_offline_protocol.spec.ts` — 8 cas. Les cinq clés une par une, les
  cinq ensemble, la forme stable de l'objet sans flash, et le `inertia.always` sans lequel un
  rechargement partiel perdrait le marqueur.
- `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` — 5 cas. Les deux moitiés du vocabulaire,
  relues dans les sources, avec cinq exemptions **motivées** qui pointent vers #725 et #727.
- `tests/functional/crew/crew_members.spec.ts` — 14 cas. Les quatre routes CRUD, la liste bornée à
  son organisation, l'isolation des deux routes par identifiant, la prop `canDelete`, et la
  frontière des rôles.
- `tests/functional/navigation/offline_conflict_payload.spec.ts` — 4 cas. `conflictData` ouvert au
  `JSON.parse`, et les champs que la modale affiche vérifiés un par un.
- `tests/functional/boats/navigation_log_journey.spec.ts` — 6 cas. La sortie de bout en bout, par
  HTTP uniquement.

## Non-vacuité

Six mutations, chacune restaurée :

| Mutation                                                              | Échec obtenu                                                                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conflictType` retirée du `return` de `share()`                       | la spec de middleware la nomme ; **58 cas fonctionnels restent verts**                                                                               |
| `flash` passé en prop ordinaire                                       | seul le cas du rechargement partiel tombe                                                                                                            |
| `'update-navigation-log'` renommé côté contrôleur                     | la garde de vocabulaire le nomme, deux fois                                                                                                          |
| `JSON.stringify(error.currentLog)` → `JSON.stringify({})`             | 2 des 4 cas de charge utile tombent — et **les 23 cas de `navigation_logs.spec.ts` restent verts**, puisqu'ils n'assertent que la présence de la clé |
| `CrewService.getForOrganizationOrFail` sans son filtre d'organisation | les 2 cas cross-org tombent                                                                                                                          |
| `CrewMemberPolicy.delete` lisant `crew.update`                        | le cas « member ne supprime pas » et celui de `canDelete` tombent, eux seuls                                                                         |

## Documentation

- **`docs/domain/offline-queue.md` — nouveau.** Le protocole n'était décrit nulle part côté serveur :
  la chaîne des trois couches, les cinq clés et qui les pose, le tableau du vocabulaire avec ce qui
  manque et ce que chaque case vide coûte, le verrou optimiste, la résolution des identifiants
  temporaires, et la limite de test.
- **`docs/domain/crew.md`** — la table ACL réécrite en capacités réelles, et trois précisions que la
  mesure impose : `GET /crew` autorise sur `create` faute de méthode `view` ; aucune des trois
  méthodes de policy ne prend de ressource, donc l'isolation tient au seul service ; une fiche
  étrangère rend une redirection et un flash, pas un 404.
- **`docs/dev/testing.md`** — le flash qui ne franchit pas deux appels client, les deux pièges du
  contexte factice, et la différence entre asserter une clé et asserter son contenu.
