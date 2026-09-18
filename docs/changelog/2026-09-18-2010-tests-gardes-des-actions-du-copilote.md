# 2026-09-18 — Tests : le moment où le copilote écrit en base, et la seule route publique du simulateur (#697)

## Quatre des six trous annoncés étaient déjà comblés

Mesuré avant d'écrire, deux sondes jetables à l'appui.

| Affirmation de l'issue                                    | Mesure                                                                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Le quota des chats publics anonymes n'est pas couvert » | `public_diagnosis.spec.ts` (13 cas) et `public_part_search.spec.ts` (13 cas) couvrent le plafond anonyme, le plafond starter, le quota mensuel épuisé et le jeton d'une autre session |
| « `GenerateAiSuggestions` n'a aucun test »                | le job en a deux (#699) **et** `ai_proactive_suggestion_service.spec.ts` en a sept, dont « a starter org is left untouched » et « exhausted token quota is skipped »                  |
| « `SimulatorPolicy` : aucun test »                        | `tests/unit/policies/simulator_policy.spec.ts` (#690), `viewShare` et `manageLeads` compris                                                                                           |
| « Le quota de tokens : la frontière n'est pas couverte »  | `ai_token_quota.spec.ts` : « throws QuotaExceededError **when at limit** » et « does not throw for enterprise (unlimited) »                                                           |

Restaient deux choses.

## 1. La matrice des neuf kinds était couverte à deux cases sur neuf

`assistant_actions.spec.ts` (20 cas) joue le **succès** de huit kinds sur neuf. Le **refus par
capability** n'y était mesuré que pour deux d'entre eux. Et `create_reservation` — l'un des deux kinds
gardés par un drapeau de plan, celui qui écrit une réservation — n'était atteint par **aucun** test
serveur : seul `tests/inertia/assistant_action_card.spec.ts` le connaissait, côté affichage.

Le drapeau de plan est bien re-vérifié à la confirmation. Le cas existant l'éprouve avec une
organisation **qui n'a jamais eu le module** — jamais par une révocation entre la proposition et la
confirmation, alors que c'est le scénario que `ASSISTANT_ACTION_META` décrit mot pour mot en
commentaire.

Trois choses sont désormais éprouvées, aucune ne l'était :

- **les neuf kinds refusés à un `boat_owner`**, chacun avec un témoin : un cliché des dix tables que
  le copilote sait écrire, journal d'audit compris, identique avant et après. Un refus sans témoin ne
  distingue pas « le Bouncer a arrêté l'action » de « l'action a écrit puis la réponse a redirigé » ;
- **le contre-exemple** : même décor, mêmes propositions, un `mechanic` — `create_task` passe, les huit
  autres non. Sans lui, neuf refus d'affilée resteraient compatibles avec une route cassée ;
- **la révocation entre la proposition et la confirmation**, pour les deux kinds à drapeau. Le module
  est accordé, la proposition posée, le module révoqué, puis la confirmation : refus, zéro ligne, et la
  proposition **survit** — l'utilisateur peut réactiver le module et confirmer.

## 2. La capability d'une action est déclarée deux fois

C'est le constat que la mesure a sorti, et il n'est pas dans l'issue.

- `ASSISTANT_ACTION_META[kind].capability` sert le prompt (les kinds offerts au modèle), la validation
  de proposition et le masquage du bouton côté front ;
- le `switch` d'`AssistantActionsService.authorizeConfirm` appelle, lui, une **méthode de policy**, qui
  relit sa propre capability.

Les neuf coïncident aujourd'hui, et rien dans le typage ne l'impose. La divergence est silencieuse
dans les deux sens : un méta plus permissif que la confirmation affiche un bouton qui refuse (famille
#456) ; un méta plus strict fait de la branche d'exécution du code mort.

`tests/unit/hygiene/assistant_action_capabilities.spec.ts` relit les trois sources **sur le disque** —
le méta, le `switch` (chutes de `case` comprises), et chaque policy — et compare la composition des
deux dernières à la première.

La démonstration : basculer `create_reservation` de `BoatPolicy.manage` vers `BoatPolicy.edit` dans
`authorizeConfirm` laisse **les 72 cas fonctionnels du domaine assistant verts**, les 23 nouveaux
compris, et la garde le nomme. Aucun rôle du produit ne distingue ces deux capabilities : la matrice
fonctionnelle ne **peut pas** voir cette divergence, quelle que soit sa taille.

## 3. `POST /simulator/share` n'était atteinte par aucun test

L'affirmation de l'issue était exacte : `simulator_share.spec.ts` ne jouait que les deux routes de
lecture. La route qui **écrit** est publique, non authentifiée, et crée une ligne consultable par
n'importe qui. Quatre de ses comportements sont figés en caractérisation, chacun avec son issue.

## Quatre constats, aucun changement de production

- **#729 — une locale de onze caractères rend un 500.** `vine.string().optional()` ne borne rien, la
  colonne est `varchar(10)` : la contrainte est atteinte **après** la validation et remonte en erreur
  de base brute. Second symptôme, plus discret : une locale bidon plus courte (`'zz-ZZ'`) est stockée
  puis servie à une page qui type sa prop `'en' | 'fr'`.
- **#730 — le `breakdown` n'est jamais recalculé.** Le serveur stocke les montants de l'appelant tels
  quels, alors que `shared/simulator_costs.ts` est disponible côté serveur. Mesuré et accepté :
  `totalMin: 999 999`, `totalMax: 1`, un `minCost` négatif. Un lien forgé attribue à FleetAi une
  estimation qu'elle n'a pas produite.
- **#731 — aucun throttle sur les trois POST publics du simulateur.** `share`, `session` et `lead`,
  là où `/contact`, `/diagnosis-ai` et `/parts-ai` en portent un chacun. Dix POST à la suite, dix
  lignes. `lead` est le plus exposé : il crée un prospect et met deux jobs d'e-mail en file.
- **#732 — un jeton inconnu renvoie toujours vers la page FR**, y compris depuis la route anglaise.

## Tests

40 cas ajoutés (3357 → 3397) :

- `tests/unit/hygiene/assistant_action_capabilities.spec.ts` — 5 cas. La non-vacuité de la lecture des
  trois sources, l'exhaustivité du `switch` sur les neuf kinds, l'absence de branche orpheline, la
  coïncidence capability annoncée / capability appliquée, et la re-vérification du drapeau de plan à
  l'exécution.
- `tests/functional/assistant/action_confirmation_guard.spec.ts` — 23 cas. Les neuf refus avec témoin,
  le contre-exemple `mechanic` (un succès + huit refus), `create_reservation` de bout en bout, les deux
  révocations de module, la distinction entre refus de rôle et refus de plan, et `dismiss` puis
  `confirm`.
- `tests/functional/simulator/simulator_share_creation.spec.ts` — 12 cas. L'aller-retour création →
  lecture, deux jetons distincts, les deux locales, trois refus du validateur, et les quatre constats.

## Non-vacuité

Cinq mutations, chacune restaurée :

| Mutation                                                                   | Échec obtenu                                                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `create_reservation` basculé sur `BoatPolicy.edit` dans `authorizeConfirm` | la garde le nomme des deux côtés ; **les 72 cas fonctionnels du domaine restent verts**                         |
| `create_reservation` et `create_client` intervertis dans le méta           | la garde nomme les deux kinds                                                                                   |
| le bloc `if (meta.planFlag !== undefined)` retiré d'`execute`              | les 3 cas de révocation tombent, plus le cas de plan d'`assistant_actions.spec.ts` et le 5ᵉ cas de la garde     |
| `MaintenancePolicy.create` privée de sa capability                         | le seul cas `boat_owner × create_task` tombe — le contre-exemple `mechanic` reste vert, comme attendu           |
| `SimulatorShareService.create` rendant un jeton constant                   | le cas des deux jetons distincts tombe, et celui des dix créations avec lui (l'index unique refuse la deuxième) |
| `simulatorShareValidator` : `input` passé en `vine.any()`                  | les 2 cas de bornes du validateur tombent, eux seuls                                                            |

## Documentation

- **`docs/domain/assistant.md`** — le tableau des neuf kinds gagne une colonne « Policy au confirm » :
  les deux dernières colonnes sont **deux déclarations de la même règle**, et la garde dit laquelle
  tient l'autre. Ajouté aussi : le drapeau de plan n'est pas une capability, il est vérifié après le
  Bouncer, et les deux refus rendent deux messages différents dont un seul est réparable par
  l'utilisateur.
- **`docs/domain/simulator.md`** — la table des routes était incomplète (trois sur huit). Ajout des
  cinq manquantes et d'une section « Partage d'un résultat » : le cycle création → lecture, ce que le
  serveur ne fait pas (recalculer, borner la locale), et les quatre constats.
- **`docs/dev/testing.md`** — « un refus sans témoin ne prouve rien » et « une matrice de refus a
  besoin de son contre-exemple ».
