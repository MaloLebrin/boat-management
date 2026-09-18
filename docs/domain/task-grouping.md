# Regroupement automatique des tâches de maintenance — Documentation technique

> Feature Pro & Enterprise. Regroupe visuellement les tâches de maintenance d'un même composant dont les échéances sont proches (≤ 7 jours) afin de faciliter la planification par lots.

---

## 1. Limites par plan

Source de vérité : `shared/types/plan.ts` → `PLAN_LIMITS[plan].canGroupTasks`.

| Plan       | `canGroupTasks` |
| ---------- | --------------- |
| Starter    | `false`         |
| Pro        | `true`          |
| Enterprise | `true`          |

---

## 2. Architecture

```
PlanningController.index()
       │
       │  getPlanningForOrg(user)
       ▼
PlanningService
       │
       │  Organization.findOrFail()  ← lit org.plan
       │  PLAN_LIMITS[plan].canGroupTasks
       │
       │  si canGroupTasks = true
       │        taskGroupingService.group(tasks)
       │
       ▼
TaskGroupingService.group(plannedTasks): TaskGroup[]
       │
       │  filtre : kind === 'date', status === 'open', dueAt != null
       │  tri : boatId → subject → dueAt (ASC)
       │  balayage glissant : fenêtre 7 jours
       │  → groupes d'au moins 2 tâches
       ▼
PlanningResult { tasks, groups, canGroupTasks, ... }
       │
       ▼
inertia.render('planning/index', { groups, canGroupTasks, ... })
       │
       ▼
PlanningKanban.vue  ← groupes affichés dans la colonne "Planifiées"
PlanningTaskGroup.vue  ← carte pliable par groupe
```

---

## 3. Algorithme de clustering (`TaskGroupingService`)

`app/services/task_grouping_service.ts`

### Entrée / sortie

- **Entrée** : `PlanningTask[]` — en pratique **`plannedTasks` uniquement**, c'est-à-dire les tâches
  ouvertes qui ne sont ni en retard ni bientôt dues (voir §4). Le service lui-même ne filtre pas sur
  `status` : c'est l'appelant qui ne lui passe que des tâches ouvertes.
- **Sortie** : `TaskGroup[]` — groupes d'au moins 2 tâches

### Critères d'inclusion

Une tâche est candidate au clustering si et seulement si :

| Condition | Valeur attendue |
| --------- | --------------- |
| `kind`    | `'date'`        |
| `dueAt`   | non null        |

Les tâches `kind === 'hours'` (déclenchées par heures moteur) sont **exclues** par le service.

⚠️ Le service **ne lit jamais `status`**. Les tâches `done` sont absentes parce que l'appelant ne les
lui transmet pas, pas parce qu'il les écarte. Passer une autre collection au grouper regrouperait
donc des tâches terminées sans garde-fou.

### Critères de regroupement

Deux tâches sont dans le même groupe si elles partagent :

1. le même `boatId`
2. le même `subject` (ex: `engine`, `sail`, `rig`, `hull`…)
3. un écart entre leurs `dueAt` ≤ **`PROXIMITY_DAYS = 7`** jours (limites incluses)

### Algorithme pas à pas

```
1. Filtrer les tâches candidates (kind=date, status=open, dueAt!=null)
2. Trier par (boatId ASC, subject ASC, dueAt ASC)
3. Balayage glissant avec deux pointeurs i, j :
   - seed = sorted[i]
   - bucket = [seed]
   - tant que sorted[j] a même boatId/subject ET dueAt - seed.dueAt ≤ 7 jours :
       ajouter sorted[j] au bucket
       j++
   - si bucket.length >= 2 : émettre un TaskGroup
   - i = j
```

La comparaison de proximité est faite avec `candidateDate.diff(seedDate, 'days').days` : `seedDate`
est calculé **une fois avant la boucle** et n'est jamais réaffecté. La fenêtre est donc **ancrée sur
la première tâche du groupe**, jamais glissante.

⚠️ Conséquence, contre-intuitive et vérifiée par un test unitaire dédié
(`does not transitively group A=j1 B=j5 C=j11`) : le regroupement **n'est pas transitif**, et le span
d'un groupe **ne peut jamais dépasser 7 jours**. Trois tâches à J+1, J+5 et J+11 donnent un groupe de
deux (J+1, J+5), pas un groupe de trois. Une version antérieure de ce document décrivait une fenêtre
chaînée produisant des groupes de 8 jours de span : c'était faux, et un tel groupe est impossible.

### Structure d'un `TaskGroup`

```ts
interface TaskGroup {
  id: string // `${seed.boatId}-${seed.subject}-${seed.dueAt}` — le seed étant le plus ancien du
  // groupe (tri ASC), cela revient à `<boatId>-<subject>-<earliestDueAt>`
  subject: string
  boatId: number
  boatName: string
  tasks: PlanningTask[]
  earliestDueAt: string // dueAt de la première tâche du groupe (ISO)
  latestDueAt: string // dueAt de la dernière tâche du groupe (ISO)
}
```

Le `id` est un identifiant composite déterministe — pas un UUID — pour permettre la comparaison côté client (dismiss par session).

---

## 4. `PlanningService`

`app/services/planning_service.ts`

### Modifications apportées

- Injection de `TaskGroupingService` (constructeur).
- Chargement de `Organization.findOrFail(user.organizationId)` pour lire `org.plan` — **uniquement après avoir vérifié qu'il existe des bateaux** (évite une requête inutile pour les orgs sans bateau).
- Calcul de `canGroupTasks = PLAN_LIMITS[org.plan].canGroupTasks`.
- Appel conditionnel : `groups = canGroupTasks ? taskGroupingService.group(plannedTasks) : []`.
- Le retour anticipé "aucun bateau" inclut `groups: [], canGroupTasks: false`.

### Pourquoi `plannedTasks` et non `tasks`

Le grouper reçoit **uniquement `plannedTasks`** (tâches futures, ni overdue ni soon). Passer `tasks` (toutes les tâches open) provoquerait un bug silencieux : les groupes composés entièrement de tâches overdue ou soon seraient calculés mais jamais affichés (le Kanban ne les affiche que dans la colonne "Planifiées"), faisant disparaître ces tâches de l'interface. Le regroupement n'a de sens que pour les tâches à venir.

---

## 5. Types partagés

`shared/types/planning.ts`

```ts
interface TaskGroup {
  id: string
  subject: string
  boatId: number
  boatName: string
  tasks: PlanningTask[]
  earliestDueAt: string
  latestDueAt: string
}

interface PlanningResult {
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
  doneTasks: PlanningTask[] // plafonné à 20, trié par `updatedAt` décroissant
  doneTasksTotal: number // le vrai total, que le plafond ci-dessus masque
  groups: TaskGroup[]
  canGroupTasks: boolean
}
```

---

## 6. Controller

`app/controllers/planning_controller.ts`

Aucune logique ajoutée — passe-plat transparent vers Inertia :

```ts
const {
  tasks,
  overdueTasks,
  soonTasks,
  plannedTasks,
  undatedTasks,
  doneTasks,
  doneTasksTotal,
  groups,
  canGroupTasks,
} = await this.planningService.getPlanningForOrg(user)

return inertia.render('planning/index', {
  /* les neuf props ci-dessus */
})
```

---

## 7. Frontend

### Page principale

`inertia/pages/planning/index.vue`

Props Inertia reçues : `tasks`, `overdueTasks`, `soonTasks`, `plannedTasks`, `doneTasks`, `groups`, `canGroupTasks`.

État local :

| Ref                 | Type               | Défaut      | Rôle                                             |
| ------------------- | ------------------ | ----------- | ------------------------------------------------ |
| `groupingEnabled`   | `ref<boolean>`     | `true`      | Toggle affiché uniquement si `canGroupTasks`     |
| `dismissedGroupIds` | `ref<Set<string>>` | `new Set()` | IDs des groupes dissociés manuellement (session) |

Le toggle "Regroupement" n'est visible que si `canGroupTasks === true`. Les plans Starter voient à la place un bandeau teaser d'incitation à l'upgrade.

`handleUngroup(groupId)` ajoute l'ID au `Set` — le groupe disparaît de la vue sans rechargement Inertia.

### `PlanningKanban.vue`

`inertia/components/planning/PlanningKanban.vue`

Reçoit `groups`, `groupingEnabled`, `dismissedGroupIds`.

Calculs internes :

- `visibleGroups` : groupes non dissociés.
- `groupedTaskIds` : `Set<number>` des IDs de tâches appartenant à un groupe visible (vide si `groupingEnabled === false`).
- `ungroupedFor(tasks)` : filtre les tâches qui n'appartiennent à aucun groupe visible.
- `plannedGroups` : groupes dont au moins une tâche appartient à `plannedTasks`.

Les groupes sont affichés **uniquement dans la colonne "Planifiées"** (les tâches overdue/soon dans un groupe restent affichées individuellement dans leurs colonnes, car la proximité de date s'applique essentiellement aux tâches futures).

Émet `ungroup(groupId: string)` vers `index.vue` → `handleUngroup`.

### `PlanningTaskGroup.vue`

`inertia/components/planning/PlanningTaskGroup.vue`

Carte pliable :

- En-tête : sujet + badge compteur + plage de dates (`earliestDueAt → latestDueAt`).
- Bouton "Dissocier" : émet `ungroup(group.id)`, intercepté avec `.stop` pour ne pas déclencher le toggle.
- Corps (visible si `expanded`) : liste de `PlanningTaskCard` avec accent navy.

L'état `expanded` est local au composant (non persisté).

### `PlanningTaskCard.vue`

`inertia/components/planning/PlanningTaskCard.vue`

Composant réutilisable pour une tâche individuelle. Props :

| Prop          | Type           | Rôle                                       |
| ------------- | -------------- | ------------------------------------------ |
| `task`        | `PlanningTask` | Données de la tâche                        |
| `accentClass` | `string?`      | Classes CSS pour la bordure gauche colorée |
| `badgeClass`  | `string?`      | Classes CSS pour le badge de date/heures   |
| `done`        | `boolean?`     | Ajoute `line-through` sur le titre         |

### `PlanningCalendar.vue`

`inertia/components/planning/PlanningCalendar.vue`

Vue calendrier extraite de l'ancienne page monolithique. N'est **pas affectée** par le regroupement — affiche toutes les tâches individuellement (comportement identique à l'état antérieur).

---

## 8. Comportement utilisateur

### Toggle "Regroupement"

- Visible uniquement en Pro & Enterprise.
- Actif par défaut (`groupingEnabled = true`).
- Cliquer sur le toggle bascule `groupingEnabled`. Les tâches regroupées réapparaissent immédiatement dans leurs colonnes individuelles.
- État volatile (réinitialisé au rechargement de la page).

### Teaser Starter

Bandeau visible sous le header lorsque `canGroupTasks === false` et qu'il existe au moins une tâche. Redirige vers le plan Pro via texte (sans lien explicite dans le bandeau — l'upgrade passe par `/settings/billing`).

### Dissociation d'un groupe

- Le bouton "Dissocier" dans `PlanningTaskGroup` émet `ungroup(group.id)`.
- `index.vue` ajoute l'ID au `Set<string>` `dismissedGroupIds` (immuable via `new Set([...])`).
- `PlanningKanban` filtre les groupes dissociés via `visibleGroups`.
- Les tâches du groupe réintègrent immédiatement leurs colonnes individuelles.
- Pas de persistence : la dissociation est réinitialisée au rechargement.

---

## 9. i18n

Namespace : `planning.grouping.*`

| Clé                             | FR                                                                                   | EN                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `planning.grouping.toggle`      | Regroupement                                                                         | Grouping                                                        |
| `planning.grouping.toggleTitle` | Regrouper automatiquement les tâches proches                                         | Automatically group nearby tasks                                |
| `planning.grouping.ungroup`     | Dissocier                                                                            | Ungroup                                                         |
| `planning.grouping.proTeaser`   | Passez au plan Pro pour regrouper automatiquement les tâches de maintenance proches. | Upgrade to Pro to automatically group nearby maintenance tasks. |

Fichiers : `resources/lang/fr/planning.json`, `resources/lang/en/planning.json`.

---

## 10. Tests

`tests/unit/task_grouping_service.spec.ts` — 11 cas Japa sur le service lui-même, et
`tests/functional/planning/task_grouping.spec.ts` — 8 cas sur l'écran, ajoutés par #693 (gating de
plan, groupe effectif, et le piège des échéances proches décrit ci-dessous).

| Cas                                             | Résultat attendu                                    |
| ----------------------------------------------- | --------------------------------------------------- |
| Tableau vide                                    | `[]`                                                |
| Une seule tâche                                 | `[]` (min. 2 tâches pour former un groupe)          |
| 2 tâches même sujet, 4 jours d'écart            | 1 groupe de 2 tâches                                |
| 2 tâches même sujet, 8 jours d'écart            | `[]`                                                |
| 2 tâches sujets différents, 1 jour d'écart      | `[]`                                                |
| 2 tâches bateaux différents, même sujet         | `[]`                                                |
| 2 tâches `kind === 'hours'`                     | `[]`                                                |
| 2 tâches même sujet, exactement 7 jours d'écart | 1 groupe (borne inclusive)                          |
| 3 tâches à J+1, J+5 et J+11                     | 1 groupe de 2 — le regroupement n'est pas transitif |
| 4 tâches (2×engine + 2×hull), 2 jours d'écart   | 2 groupes indépendants                              |
| Vérification du format de l'`id`                | `"<boatId>-<subject>-<earliestDueAt>"`              |

⚠️ **Piège pour tout test fonctionnel du regroupement.** Le service ne reçoit que `plannedTasks`
(§4). Deux tâches à J+3 et J+5, même bateau et même sujet, sont dans `soonTasks` et ne produisent
donc **aucun groupe** : un test écrit avec ces dates passerait au vert en ne prouvant rien. Il faut
des échéances au-delà de la borne de 30 jours du seau « bientôt dû » — d'où les J+60 de
`tests/functional/planning/task_grouping.spec.ts`.

---

## 11. Fichiers de référence

| Fichier                                             | Rôle                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `shared/types/plan.ts`                              | `PlanQuotas.canGroupTasks`, `PLAN_LIMITS`        |
| `shared/types/planning.ts`                          | `TaskGroup`, `PlanningResult`                    |
| `app/services/task_grouping_service.ts`             | Algorithme de clustering                         |
| `app/services/planning_service.ts`                  | Orchestration + injection `TaskGroupingService`  |
| `app/controllers/planning_controller.ts`            | Passage de `groups` et `canGroupTasks` à Inertia |
| `inertia/pages/planning/index.vue`                  | Page principale, toggle, gestion des dismissed   |
| `inertia/components/planning/PlanningKanban.vue`    | Colonnes Kanban + affichage des groupes          |
| `inertia/components/planning/PlanningTaskGroup.vue` | Carte pliable de groupe avec dissociation        |
| `inertia/components/planning/PlanningTaskCard.vue`  | Carte individuelle réutilisable                  |
| `inertia/components/planning/PlanningCalendar.vue`  | Vue calendrier (non affectée par le groupement)  |
| `resources/lang/fr/planning.json`                   | Clés i18n FR (`planning.grouping.*`)             |
| `resources/lang/en/planning.json`                   | Clés i18n EN (`planning.grouping.*`)             |
| `tests/unit/task_grouping_service.spec.ts`          | 11 tests unitaires sur l'algorithme              |
