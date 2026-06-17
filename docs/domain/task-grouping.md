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

- **Entrée** : `PlanningTask[]` — toutes les tâches de l'organisation (open + done)
- **Sortie** : `TaskGroup[]` — groupes d'au moins 2 tâches

### Critères d'inclusion

Une tâche est candidate au clustering si et seulement si :

| Condition | Valeur attendue |
| --------- | --------------- |
| `kind`    | `'date'`        |
| `status`  | `'open'`        |
| `dueAt`   | non null        |

Les tâches `kind === 'hours'` (déclenchées par heures moteur) et les tâches `done` sont **exclues**.

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
   - latestDate = seed.dueAt
   - tant que sorted[j] a même boatId/subject ET dueAt - latestDate ≤ 7 jours :
       ajouter sorted[j] au bucket
       latestDate = sorted[j].dueAt
       j++
   - si bucket.length >= 2 : émettre un TaskGroup
   - i = j
```

La comparaison de proximité est faite avec `DateTime.diff(latestDate, 'days').days` (Luxon) — ce qui mesure l'écart entre la dernière tâche déjà groupée et la suivante candidate, et non entre seed et candidate. Cela permet de constituer des groupes chaînés (tâche A→B à 4 jours, B→C à 4 jours → groupe ABC de 8 jours de span) tant que chaque saut individuel est ≤ 7 jours.

### Structure d'un `TaskGroup`

```ts
interface TaskGroup {
  id: string // "<boatId>-<subject>-<earliestDueAt>" — stable dans la session
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
  doneTasks: PlanningTask[]
  groups: TaskGroup[] // ← ajouté
  canGroupTasks: boolean // ← ajouté
}
```

---

## 6. Controller

`app/controllers/planning_controller.ts`

Aucune logique ajoutée — passe-plat transparent vers Inertia :

```ts
const { tasks, overdueTasks, soonTasks, plannedTasks, doneTasks, groups, canGroupTasks } =
  await this.planningService.getPlanningForOrg(user)

return inertia.render('planning/index', {
  tasks,
  overdueTasks,
  soonTasks,
  plannedTasks,
  doneTasks,
  groups, // TaskGroup[]
  canGroupTasks, // boolean
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

`tests/unit/task_grouping_service.spec.ts` — 11 cas Japa.

| Cas                                             | Résultat attendu                           |
| ----------------------------------------------- | ------------------------------------------ |
| Tableau vide                                    | `[]`                                       |
| Une seule tâche                                 | `[]` (min. 2 tâches pour former un groupe) |
| 2 tâches même sujet, 4 jours d'écart            | 1 groupe de 2 tâches                       |
| 2 tâches même sujet, 8 jours d'écart            | `[]`                                       |
| 2 tâches sujets différents, 1 jour d'écart      | `[]`                                       |
| 2 tâches bateaux différents, même sujet         | `[]`                                       |
| 2 tâches `kind === 'hours'`                     | `[]`                                       |
| 2 tâches `status === 'done'`                    | `[]`                                       |
| 2 tâches même sujet, exactement 7 jours d'écart | 1 groupe (borne inclusive)                 |
| 4 tâches (2×engine + 2×hull), 2 jours d'écart   | 2 groupes indépendants                     |
| Vérification du format de l'`id`                | `"<boatId>-<subject>-<earliestDueAt>"`     |

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
