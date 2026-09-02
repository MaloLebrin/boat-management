# Domaine — États des lieux (#311, #491, #495, #584)

## Objectif fonctionnel

Constater l'état du bateau au départ (check-out) et au retour (check-in) d'une
réservation, et rendre les deux constats **comparables point par point** :

```
Réservation
   ├── Inspection check-out ──┐
   │      ├── checklist       │  comparaison point par point
   │      ├── photos          │  (le check-in affiche l'état
   │      └── notes libres    │   au départ en regard)
   └── Inspection check-in ───┘
          └── item en `damage` ──► action d'équipement pré-remplie
```

Une inspection est unique par `(réservation, kind)` — au plus un check-out et
un check-in. L'écran (`/boats/:boatId/reservations/:reservationId/inspection`)
affiche les deux panneaux côte à côte (onglets sous `lg`, #495).

## Checklist structurée (#584)

Avant #584, tout le constat tenait dans le blob `notes` : deux états des lieux
n'étaient pas comparables et rien n'était exploitable. La checklist reprend le
pattern éprouvé du diagnostic panne (`boat_engine_diagnostic_checks`) : un
**corpus statique à clés stables** + une **table de persistance minimale**.

### Corpus

`shared/constants/inspections/inspection_checklist_content.ts` — sections ×
items, chaque item avec :

- `key` (`<section>.<slug>`) — **persistée en base, jamais renommée** ; on peut
  en insérer de nouvelles à n'importe quelle position (garde-fou :
  `INITIAL_ITEM_KEYS` dans `tests/inertia/inspection_checklist_content.spec.ts`)
- `labelKey` — clé i18n présente dans les deux locales
  (`inspections.checklist.sections.<section>.items.<slug>`)
- `categories?` — catégories de bateau concernées (enum #571) : pas de section
  « mât et gréement » sur une vedette, pas d'« intérieur » sur un semi-rigide.
  Absent = l'item vaut pour tous les bateaux

Sections : coque et pont, mât et gréement (voiliers), moteur et niveaux,
électricité et électronique, sécurité, intérieur et propreté, annexe et
accessoires.

La **même checklist** sert au check-out et au check-in — c'est la comparaison
qui a de la valeur.

### Filtrage par catégorie

`shared/helpers/inspection_checklist.ts` :

- `inspectionCategoryForBoat(boat)` — `boats.category` (#571) quand elle est
  renseignée, sinon repli best-effort sur les colonnes historiques `type` et
  `propulsion_type` via `deriveCategoryFromLegacy`. `null` = catégorie
  inconnue → la checklist s'affiche **en entier** (cocher un point sans objet
  ne coûte qu'un tap, cacher un vrai point coûte un oubli)
- `inspectionSectionsForCategory(category)` — sections et items applicables

### Persistance

Table `boat_inspection_items` : `(boat_inspection_id, item_key)` unique,
`state` (`ok | remark | damage`), `note`. **L'absence de ligne signifie « non
contrôlé »** — ce n'est pas un état. La note est obligatoire dès que l'état
n'est pas `ok` (validator `requiredWhen` + garde UI) et effacée au retour à
`ok`. Le `item_key` est validé contre le corpus dans le service
(`ALL_INSPECTION_ITEM_KEYS`), jamais seulement côté client.

### Parcours terrain

1. Chaque point se coche `ok` d'un tap ; `remark`/`damage` ouvrent la saisie de
   note (cibles tactiles ≥ 44 px, acquis de l'épic #481).
2. Un point en `damage` propose une **action d'équipement pré-remplie**
   (libellé du point + note du constat) via le lien inspection → action déjà
   en place (#311).
3. Au check-in, chaque point affiche l'état qu'il avait au check-out de la même
   réservation ; une **dégradation** (l'état a empiré) est mise en évidence.
4. `notes` reste disponible pour le hors-checklist — aucun champ supprimé, les
   inspections antérieures à #584 s'affichent comme avant (notes seules).

## Contenu

| Fichier                                                                  | Rôle                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `shared/constants/inspections/inspection_checklist_content.ts`           | Corpus sections × items, `ALL_INSPECTION_ITEM_KEYS`        |
| `shared/helpers/inspection_checklist.ts`                                 | Catégorie effective + filtrage                             |
| `shared/types/inspection.ts`                                             | États, payloads, rows                                      |
| `app/services/boat_inspection_service.ts`                                | CRUD inspections + `setItem`/`clearItem`                   |
| `app/controllers/boat_inspections_controller.ts`                         | `show`, CRUD, `setItem`, `destroyItem`, actions équipement |
| `inertia/components/reservations/inspection/InspectionChecklist.vue`     | Sections, progression, modal d'action pré-remplie          |
| `inertia/components/reservations/inspection/InspectionChecklistItem.vue` | Ligne : tap `ok`, note, comparaison, dégradation           |

## Routes

| Verbe         | URL                                                     | Action                                           |
| ------------- | ------------------------------------------------------- | ------------------------------------------------ |
| GET           | `/boats/:boatId/reservations/:reservationId/inspection` | page (les deux panneaux)                         |
| POST          | `.../inspections`                                       | créer une inspection                             |
| PUT / DELETE  | `.../inspections/:inspectionId`                         | modifier / supprimer                             |
| PATCH         | `.../inspections/:inspectionId/items`                   | constat d'un point (`itemKey`, `state`, `note?`) |
| DELETE        | `.../inspections/:inspectionId/items`                   | repasser un point en « non contrôlé »            |
| POST / DELETE | `.../inspections/:inspectionId/equipment-actions[...]`  | défauts → actions (#311)                         |
| POST / DELETE | `.../inspections/:inspectionId/photos[...]`             | photos (pipeline média)                          |

Toutes les mutations répondent par redirection Inertia (`redirect().back()` pour
les items — `preserveScroll` côté client), jamais par du JSON.

## Permissions

`InspectionPolicy` (org scope + abilities `inspections.*`) : `view` pour la
page, `create`/`edit`/`delete` pour les mutations — les items relèvent de
`edit`. Les actions d'équipement passent par `EquipmentActionPolicy`.

## Photos

Les photos restent au niveau de l'inspection (pipeline média existant,
`equipment_media`) — le rattachement par item envisagé dans #584 est resté hors
périmètre, le pipeline n'étant pas générique par item.

## Hors-ligne (#491, #622)

Un état des lieux se **crée hors-ligne** : la création part dans la file
IndexedDB avec un jeton temporaire (`create-inspection`), les défauts saisis
dans la foulée le référencent, et la synchro rejoue la création puis réécrit les
défauts avec l'ID réel. Modifier un état des lieux déjà en base fonctionne aussi
hors-ligne (`update-inspection`), avec détection de conflit `_expectedUpdatedAt`.

Restent indisponibles tant que l'état des lieux n'est pas synchronisé, avec un
message explicite : la **checklist** (les constats `PATCH .../items` n'ont pas de
chemin hors-ligne) et l'**ajout de photos** (#621). Mécanique détaillée dans
`docs/frontend/pwa.md`, section « Dépendances entre actions ».

## Hors périmètre (#584)

PDF d'état des lieux signable, caution/facturation des dommages, checklists
personnalisables par organisation, checklist et photos hors-ligne (voir
ci-dessus).
