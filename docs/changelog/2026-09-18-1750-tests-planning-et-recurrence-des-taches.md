# 2026-09-18 — Tests : planning, récurrence des tâches et import CSV (#693)

Le domaine maintenance est le cœur du produit, et sa couverture était très inégale : 37 cas sur
`tests/functional/maintenance/`, mais **4 seulement** sur `/planning`, l'écran de pilotage quotidien.
Deux seaux sur cinq étaient touchés, les props `groups` et `canGroupTasks` par aucun test, et
**aucun test n'employait deux organisations** — alors que l'isolation de cet écran ne tient qu'à un
`where('organizationId', …)`, sans bouncer.

## Trois affirmations de l'issue étaient fausses

Mesurées avant d'écrire, pas supposées :

- « le comptage `countDueTasksForOrg` qui alimente le **badge de navigation** » — **il n'existe aucun
  badge**. Son unique appelant est `AssistantStarterService`, pour les suggestions de démarrage du
  copilote, servies dans une prop Inertia `optional()`.
- « `MaintenancePolicy` … n'a pas de test unitaire » — **elle en a un** depuis #690
  (`tests/unit/policies/maintenance_policy.spec.ts`), qui fige déjà la frontière du rôle `mechanic`.
  Rien à refaire.
- « `ProcessBoatMaintenanceImport` … le job qui fait le travail réel » — **ce job ne fait aucun
  travail**. Jumeau ligne pour ligne de `process_media` (#692), il n'est enfilé nulle part et son
  `execute()` se contente de logger. L'import est **entièrement synchrone**, dans la requête HTTP.

## La mécanique des seaux, désormais figée

Deux seuils cohabitent, et aucun n'était documenté : **30 jours** pour une échéance datée (bornes
larges — J+30 est « bientôt dû », J+31 est « planifié »), **50 heures** pour une échéance moteur
(`> 0 && <= 50`, donc 0 heure restante bascule en retard). Trois comportements non évidents sont
épinglés :

- **`kind` est décidé par `dueEngineHours !== null`** : une tâche portant les deux échéances est
  classée sur les heures, et son `dueAt` est ignoré ;
- **une tâche horaire sans moteur résolu atterrit en « planifié »** quel que soit son retard —
  invisible du pilotage quotidien. Caractérisé, pas corrigé ;
- **`doneTasks` est plafonné à 20**, `doneTasksTotal` porte le vrai total.

Le regroupement ne reçoit que `plannedTasks` : deux tâches à J+3 et J+5, même bateau et même sujet,
ne forment **aucun groupe**. C'est le piège qui ferait écrire un test vert prouvant zéro — d'où les
échéances à J+60 du spec, et une note dans `docs/dev/testing.md`.

## La récurrence, testée au niveau HTTP

`markDone` n'était éprouvé qu'au niveau service. Deux règles qui n'étaient écrites nulle part :

- **en mois**, la prochaine échéance part de la **date de complétion**, jamais de l'échéance
  précédente : une tâche faite en retard décale toute la série ;
- **en heures**, elle part du `doneEngineHours` **saisi dans le formulaire**, jamais du compteur réel
  du moteur. Déclarer 260 sur un moteur à 300 crée donc une échéance à 310, soit dix heures avant son
  terme — une tâche née presque en retard, sans contrôle.

Et le croisement que l'issue demandait : incrémenter les heures d'un moteur fait basculer une tâche
de « planifié » à « en retard » **sans rien écrire sur la tâche**. « En retard » est un état
**dérivé**, recalculé à chaque lecture ; le `status` en base reste `open` indéfiniment.

## Deux tests existants passaient pour une mauvaise raison

`tests/functional/settings/csv_import.spec.ts` déclarait son `VALID_CSV` avec des **virgules**, quand
le parser ne coupe que sur `;`, et avec les libellés `Moteur`/`Voilure` absents de `VALID_SUBJECTS`.
Tout tenait donc dans une seule colonne, la prévisualisation échouait sur les en-têtes manquants — et
sa redirection est **exactement** celle qu'attendaient les deux tests « gating starter/pro ».

Corriger le littéral ne suffisait pas : `/settings/import/preview` redirige au même endroit en cas de
succès comme d'erreur. Les deux tests assertent désormais la présence de `pendingImport` en session,
ce qui sépare réellement les deux cas — et établit au passage que **l'import n'est pas gardé par le
plan**.

## Un trou d'autorisation, caractérisé et suivi

`/settings/import`, prévisualisation **et** confirmation, n'est protégé que par `middleware.auth()` :
ni policy, ni capability. Un `mechanic` et un `boat_owner` réussissent donc un import de bout en bout
dans l'historique de maintenance. Les deux tests qui le montrent le disent comme un **constat**, pas
comme une validation ; une issue de production dédiée suit la question.

## Tests

55 cas ajoutés (3152 → 3207) :

- `tests/functional/planning/buckets.spec.ts` — 17 cas : les bornes des deux axes, le piège mixte, la
  tâche horaire orpheline, le plafond de 20, et le premier test multi-organisation de cet écran.
- `tests/functional/planning/task_grouping.spec.ts` — 8 cas : gating par plan avec témoin, groupe
  effectif, et les quatre façons de ne pas former de groupe.
- `tests/integration/services/planning_counts.spec.ts` — 6 cas sur `countDueTasksForOrg`.
- `tests/functional/maintenance/task_recurrence.spec.ts` — 10 cas : les deux axes de récurrence avec
  des dates **littérales**, l'absence de récurrence (jamais assertée avant), l'intervalle 0, la tâche
  mixte, les deux refus `doneEngineHours`, la double clôture et le croisement avec le compteur.
- `tests/functional/settings/csv_import_confirm.spec.ts` — 9 cas sur la confirmation, seul chemin qui
  écrit.
- `tests/integration/jobs/process_boat_maintenance_import.spec.ts` — 5 cas sur la clé de
  déduplication. L'exemption correspondante est levée : **la map `EXEMPT` de la garde de #699 est
  désormais vide.**

## Non-vacuité

Six mutations, chacune restaurée, chacune produisant un échec nommé :

| Mutation                                               | Échec obtenu                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| seuil « bientôt dû » porté de 30 à 31 jours            | un seul test tombe, celui de la borne : `expected 'soon' to equal 'planned'`                  |
| `canGroupTasks` forcé à `true`                         | le cas `starter` tombe : `expected true to be false`                                          |
| `tasks` passé au grouper au lieu de `plannedTasks`     | le cas des échéances proches tombe — preuve que le test de regroupement regarde quelque chose |
| filtre d'organisation retiré sur les bateaux           | `la tâche « Étrangère en retard » d'une autre organisation apparaît dans le planning`         |
| récurrence calculée depuis `dueAt` au lieu de `doneAt` | `expected '2027-01-01' to equal '2027-02-10'`                                                 |
| spec du job supprimé                                   | `jobs sans aucun test : process_boat_maintenance_import`                                      |

Plus un contrôle sur les tests corrigés : rétabli en virgules, l'ancien `VALID_CSV` fait désormais
tomber les deux tests de prévisualisation — ce qu'il ne faisait pas.

## Documentation corrigée

`docs/domain/task-grouping.md` divergeait du code sur six points, dont un central : elle décrivait
une fenêtre de proximité **chaînée**, avec un exemple de « groupe ABC de 8 jours de span ». Le code
ancre la fenêtre sur la **première tâche du groupe** : le regroupement n'est pas transitif et un tel
groupe est **impossible**. Elle prétendait aussi que le service filtre `status === 'open'` (il ne lit
jamais `status`), décrivait une entrée « open + done » au lieu de `plannedTasks`, omettait
`undatedTasks` et `doneTasksTotal`, et son tableau de tests ne correspondait plus au fichier.

Une documentation fausse sur le mécanisme central est pire qu'une absence de documentation : elle
sera crue. Les cinq seaux, eux, n'étaient documentés nulle part — ils le sont désormais dans
`docs/domain/maintenance-tasks.md`, avec un avertissement explicite pour ne pas les confondre avec
les seuils du dashboard (14 jours / 10 heures).
