# Domaine — Fiches de maintenance (checklists guidées)

## Objectif fonctionnel

Les fiches de maintenance sont des **listes de contrôle structurées et guidées** pour des opérations nautiques spécifiques. À la différence des événements (historique immuable) et des tâches planifiées (to-do avec échéance), une fiche est :

- **pré-remplie** à la création selon son type (items par défaut définis dans le corpus `shared/constants/maintenance/maintenance_sheet_content.ts`, libellés résolus dans la locale de l'utilisateur — #583)
- **interactive** : chaque item est cochable individuellement avec une note optionnelle — y compris **hors-ligne** (#490) : état optimiste côté client, actions dédupliquées dans la file IndexedDB, et rejeu protégé par `_expectedUpdatedAt` (un item modifié entre-temps déclenche la modale de conflit au lieu d'un écrasement silencieux — voir `docs/frontend/pwa.md`)
- **terminable** : quand tous les items sont cochés, la fiche peut être marquée comme terminée

## Les neuf types de fiches

| Type            | Description                                           | Items par défaut |
| --------------- | ----------------------------------------------------- | ---------------- |
| `entretien`     | Inspection et entretien courant                       | 10               |
| `montage`       | Gréage du bateau en début de saison                   | 10               |
| `hivernage`     | Mise en hivernage / désarmement                       | 14               |
| `dehivernage`   | Sortie d'hivernage / remise à l'eau                   | 14               |
| `atelier`       | Travaux spécifiques en atelier                        | 8                |
| `moteur_saison` | Mise en route / fin de saison moteur (HB et in-bord)  | 12               |
| `carenage`      | Carénage : sortie d'eau, antifouling, remise à l'eau  | 10               |
| `catamaran`     | Spécifiques catamaran (2 lignes moteur, trampoline…)  | 8                |
| `semi_rigide`   | Semi-rigide : flotteurs, remorque, rinçage, hivernage | 8                |

Les cinq premiers types sont historiques ; les quatre derniers ont été ajoutés par #583 pour couvrir les bateaux moteur, catamarans et semi-rigides. La liste ordonnée est `SHEET_TYPES` (`shared/types/maintenance.ts`).

## Modèle de données

Références : `app/models/boat_maintenance_sheet.ts`, `app/models/boat_maintenance_sheet_item.ts`, `database/schema.ts`.

### `boat_maintenance_sheets`

| Colonne        | Type         | Description                                            |
| -------------- | ------------ | ------------------------------------------------------ |
| `boat_id`      | FK           | Bateau propriétaire (CASCADE DELETE)                   |
| `type`         | VARCHAR(20)  | Un des neuf types de `SHEET_TYPES` (tableau ci-dessus) |
| `title`        | VARCHAR(200) | Titre libre (ex : "Hivernage 2025")                    |
| `status`       | VARCHAR(20)  | `in_progress` (défaut) ou `completed`                  |
| `performed_at` | DATE         | Date de réalisation                                    |
| `notes`        | TEXT NULL    | Remarques générales sur la fiche                       |

### `boat_maintenance_sheet_items`

| Colonne                     | Type             | Description                                                                                    |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `boat_maintenance_sheet_id` | FK               | Fiche parente (CASCADE DELETE)                                                                 |
| `label`                     | VARCHAR(300)     | Libellé de l'opération (copié dans la locale de l'utilisateur — #583)                          |
| `template_key`              | VARCHAR(64) NULL | Clé stable du corpus (`<type>.<slug>`) ; `null` pour les items d'avant #583 et jamais renommée |
| `is_done`                   | BOOLEAN          | Coché ou non (défaut `false`)                                                                  |
| `notes`                     | TEXT NULL        | Remarque libre sur cet item                                                                    |
| `position`                  | INTEGER          | Ordre d'affichage (0-based)                                                                    |

## Le corpus (#583)

Les items sont définis dans `shared/constants/maintenance/maintenance_sheet_content.ts` : chaque item est `{ key, labelKey }` (clé stable `<type>.<slug>`, ex. `hivernage.drain_engine`), chaque type de fiche `{ type, labelKey, items }`. Les clés i18n `maintenance.sheets.<type>.label` et `maintenance.sheets.<type>.items.<slug>` existent dans **les deux locales** (`resources/lang/{en,fr}/maintenance.json`).

**Contrat** : les `key` des items sont persistées en base (`template_key`) et ne doivent **JAMAIS** être renommées ; on peut en insérer de nouvelles à n'importe quelle position — même mécanique que `part_key` (pièces détachées) et `item_key` (états des lieux). Invariants testés dans `tests/inertia/maintenance_sheet_content.spec.ts`.

À la création d'une fiche, `BoatMaintenanceSheetTemplateService` (simple lecteur du corpus) résout les `labelKey` **dans la locale de l'utilisateur** et les items sont copiés en base avec leur `template_key`. Les instances sont indépendantes : modifier le corpus ne change pas les fiches existantes, et les fiches instanciées avant #583 gardent leur texte français d'origine (`template_key` à `null`).

**entretien** : inspection coque, anodes, safran/gouvernail, moteur, circuit électrique, instruments de navigation, accastillage, équipements de sécurité, gréement dormant, nettoyage général

**montage** : vérification mât et structure, haubans et étais, gréement dormant, voiles, gréement courant, bloqueurs et poulies, winches, têtes de mât et instrums, pataras/étai de trinquette, test de navigation

**hivernage** : sortie de l'eau et nettoyage, application antifouling, remplacement anodes, vidange moteur et filtres, circuit refroidissement/antigel, stabilisateur carburant, maintenance batteries, démontage voiles, démontage gréement courant, rangement cordages et poulies, inspection vannes de coque, protection électronique, ventilation cale, installation bâche

**dehivernage** : inspection coque et oeuvres vives, test passe-coques et vannes, safran et gouvernail, charge batteries, révision moteur, circuit refroidissement, circuit électrique, inspection voiles, gréement dormant, gréement courant, instruments de navigation, VHF et radio, armement de sécurité, essai en mer

**atelier** : diagnostic initial, préparation du poste de travail, dépose des pièces concernées, réparation ou remplacement, tests et contrôles, remontage et ajustements, nettoyage du poste, compte-rendu intervention

**moteur_saison** : niveaux, vidange/filtre à huile, turbine, anodes moteur, filtre à carburant, rinçage refroidissement, batterie, bougies (hors-bord), courroies (in-bord), hélice, commandes/câbles, essai moteur

**carenage** : sortie d'eau et calage, nettoyage haute pression, contrôle œuvres vives, anodes, passe-coques, hélice/arbre/embase, ponçage, antifouling, lustrage, remise à l'eau

**catamaran** : lignes moteur bâbord et tribord, deux coques et nacelle, trampoline, cases étanches, synchronisation des safrans, bimini/lazy-bag, bossoirs/annexe

**semi_rigide** : pression des flotteurs, collages/ragage, valves, rinçage eau douce, rinçage moteur, remorque, protection UV, hivernage (dégonflage partiel, stockage)

## Routes → controllers → services → UI

Références :

- Routes : `start/routes/boats.ts`
- Controllers : `app/controllers/boat_maintenance_sheets_controller.ts`, `app/controllers/boat_maintenance_sheet_items_controller.ts`
- Services : `app/services/boat_maintenance_sheet_service.ts`, `app/services/boat_maintenance_sheet_template_service.ts`
- UI : `inertia/components/boats/sheets/` (panel, card, item list)

### Créer une fiche

- `POST /boats/:boatId/maintenance-sheets` (`boats.maintenanceSheets.store`)
  - Controller : `BoatMaintenanceSheetsController.store`
  - Validation : `createBoatMaintenanceSheetValidator` — type (enum `SHEET_TYPES`), title (2–200), performedAt (date), notes (opt.)
  - ACL : `bouncer.authorize('boatUpdate', boat)`
  - Service : `BoatMaintenanceSheetService.createForBoat` (reçoit `i18n.locale`)
  - Effet : crée la fiche + copie en base les items du corpus, résolus dans la locale de l'utilisateur, avec leur `template_key`

### Marquer terminée

- `PUT /boats/:boatId/maintenance-sheets/:sheetId/complete` (`boats.maintenanceSheets.complete`)
  - Controller : `BoatMaintenanceSheetsController.complete`
  - ACL : `boatUpdate`
  - Service : `BoatMaintenanceSheetService.completeSheet` — passe `status` → `completed`

### Supprimer une fiche

- `DELETE /boats/:boatId/maintenance-sheets/:sheetId` (`boats.maintenanceSheets.destroy`)
  - Controller : `BoatMaintenanceSheetsController.destroy`
  - Service : `BoatMaintenanceSheetService.deleteSheet` — CASCADE supprime les items

### Mettre à jour un item

- `PUT /boats/:boatId/maintenance-sheets/:sheetId/items/:itemId` (`boats.maintenanceSheetItems.update`)
  - Controller : `BoatMaintenanceSheetItemsController.update`
  - Validation : `updateSheetItemValidator` — isDone (boolean), notes (opt., max 500 chars)
  - Service : `BoatMaintenanceSheetService.updateItem`
  - Appelé en temps réel depuis l'UI (toggle checkbox + notes avec debounce 600 ms)

## Règles métier

- Un utilisateur ne peut accéder qu'aux fiches des bateaux de **sa propre organisation** (`assertBoatScope` dans le service).
- La suppression d'une fiche supprime tous ses items (CASCADE DB).
- Une fiche `completed` ne peut plus être marquée complète à nouveau (bouton masqué côté UI).
- Le statut ne repasse pas automatiquement à `in_progress` si un item est décoché après completion — l'état `completed` est définitif.

## UI (onglet "Fiches")

La page `inertia/pages/boats/show.vue` reçoit `maintenanceSheets: MaintenanceSheetRow[]` et expose l'onglet `?tab=sheets`.

Composants :

- `BoatShowTabSheets` — wrapper de l'onglet
- `BoatMaintenanceSheetsPanel` — liste des fiches + filtres par type + bouton création
- `BoatMaintenanceSheetCard` — carte d'une fiche (expand/collapse, badges type + statut, progression X/Y)
- `BoatMaintenanceSheetItemList` — liste des items cochables avec notes inline

Types frontend : `MaintenanceSheetRow` et `MaintenanceSheetItemRow` dans `inertia/types/boat_show.ts`.
