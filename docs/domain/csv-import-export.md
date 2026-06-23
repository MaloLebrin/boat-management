# Domaine — Import / Export CSV

## Objectif fonctionnel

Permettre aux gestionnaires de flotte d'importer et d'exporter des données tabulaires au format CSV.

- **Export** : téléchargement direct (streaming) depuis le controller, pour les maintenance, avitaillements et journal de bord d'un bateau
- **Import** : upload d'un fichier CSV, dry-run avec rapport d'erreurs ligne par ligne, puis confirmation pour persister les données
- **Quota** : fonctionnalité réservée aux plans Pro et Enterprise (`canExport`)

## Routes → controllers → services → UI

### Export CSV

Routes (`start/routes/boats.ts`) → controller `app/controllers/csv_export_controller.ts` → service `app/services/csv_export_service.ts`

| Route                                       | Action                               | Données exportées                      |
| ------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `GET /boats/:id/export/maintenance.csv`     | `CsvExportController.maintenance`    | Événements de maintenance + coût total |
| `GET /boats/:id/export/fuel-logs.csv`       | `CsvExportController.fuelLogs`       | Avitaillements                         |
| `GET /boats/:id/export/navigation-logs.csv` | `CsvExportController.navigationLogs` | Journal de bord                        |

**Format de sortie** : UTF-8 BOM (`﻿`) + séparateur `;` (compatibilité Excel FR), `\r\n` entre les lignes.

**Vérifications** : quota export (`QuotaService.assertCanExport`) + appartenance du bateau à l'organisation de l'utilisateur.

#### En-têtes par type

**maintenance.csv**

```
date;titre;sujet;notes;légende_moteur;légende_voile;coût_total
```

**fuel-logs.csv**

```
date;quantité_litres;prix_par_litre;coût_total;heures_moteur;fournisseur;notes
```

**navigation-logs.csv**

```
date_départ;date_arrivée;port_départ;port_arrivée;distance_nm;heures_moteur_départ;heures_moteur_arrivée;carburant_consommé_L;vent_beaufort;état_mer;nb_équipiers;statut;notes
```

### Import CSV

Routes (`start/routes/settings.ts`) → controller `app/controllers/csv_import_controller.ts` → service `app/services/csv_import_service.ts`

| Route                           | Action                        | Description                                                        |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `GET /settings/import`          | `CsvImportController.show`    | Page import/export, passe `boats[]`, `preview`, `hasPendingImport` |
| `POST /settings/import/preview` | `CsvImportController.preview` | Dry-run — parse + valide, stocke en session, redirige              |
| `POST /settings/import/confirm` | `CsvImportController.confirm` | Import effectif depuis les données en session                      |
| `POST /settings/import/cancel`  | `CsvImportController.cancel`  | Nettoie la session, redirige                                       |

#### Format attendu (maintenance)

```
date;title;subject;notes;engine_caption;sail_caption;cost
2024-01-15;Vidange moteur;engine;;Volvo D2-40;;350.00
2024-03-01;Remplacement foc;sail;;;Foc 120%;
```

Colonnes requises : `date`, `title`, `subject`  
Colonnes optionnelles : `notes`, `engine_caption`, `sail_caption`, `cost`

| Colonne          | Règle                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `date`           | Format `YYYY-MM-DD`, date valide                                                             |
| `title`          | Non vide                                                                                     |
| `subject`        | `boat \| hull \| engine \| sail \| rig \| electrical \| plumbing \| safety \| deck \| other` |
| `engine_caption` | Obligatoire si `subject=engine`                                                              |
| `sail_caption`   | Obligatoire si `subject=sail`                                                                |
| `cost`           | Décimal (`,` ou `.` acceptés), optionnel                                                     |

#### Flux session (preview → confirm)

1. `POST /preview` : parse le CSV, stocke les lignes valides dans `session.put('pendingImport', {...})` et le résumé d'affichage dans `session.flash('importPreview', json)`
2. `GET /settings/import` : lit `session.flashMessages.get('importPreview')` pour afficher l'aperçu ; `hasPendingImport` reflète la présence de `pendingImport` en session
3. `POST /confirm` : lit `session.get('pendingImport')`, crée les enregistrements en base via `importMaintenanceRows()`, puis `session.forget('pendingImport')`

> Si l'utilisateur ferme l'onglet entre preview et confirm, les données en session expirent avec la session (TTL 5 jours par défaut). Il faut alors re-uploader le fichier.

#### Comportement de l'import (maintenance)

`importMaintenanceRows()` (`app/services/csv_import_service.ts`) :

- Wrappé dans une transaction Lucid — rollback global si une ligne échoue
- Crée un `BoatMaintenanceEvent` par ligne valide
- Si `cost` est renseigné : crée un `BoatMaintenancePart` nommé `"Coût total"` avec `quantity=1` et `unitPrice=cost`
- `boatEngineId`, `boatSailId`, `boatRigId`, `boatSafetyEquipmentId` sont laissés à `null` (le CSV ne référence que des libellés)

## Fichiers clés

| Fichier                                                  | Rôle                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `shared/types/csv.ts`                                    | Types partagés + `MAINTENANCE_CSV_HEADERS`                     |
| `app/exceptions/csv_errors.ts`                           | `CsvImportValidationError`                                     |
| `app/validators/csv_import.ts`                           | `csvPreviewValidator`, `csvConfirmValidator` (VineJS)          |
| `app/services/csv_import_service.ts`                     | Parsing (BOM, guillemets, `;`), validation par colonne, import |
| `app/services/csv_export_service.ts`                     | `buildCsv()`, `csvFilename()`                                  |
| `app/controllers/csv_import_controller.ts`               | CRUD session + Inertia render                                  |
| `app/controllers/csv_export_controller.ts`               | Streaming CSV par type                                         |
| `inertia/pages/settings/import.vue`                      | Page shell Inertia                                             |
| `inertia/components/settings/tabs/SettingsImportTab.vue` | Formulaire upload + aperçu + liens export                      |
| `inertia/utils/routes.ts`                                | Helpers `routes.csv.*`                                         |

## Quota et ACL

- Toutes les routes vérifient `QuotaService.assertCanExport(user.organization)` — lance `QuotaExceededError` si plan Starter
- Le lien "Import CSV" n'apparaît dans `SettingsShell` que si `PLAN_LIMITS[plan].canExport === true`
- L'appartenance du bateau à l'organisation est vérifiée via `BoatService.getForUserOrFail`

## Extension future

- Ajouter les types `fuel_logs` et `navigation_logs` à l'import (enum `CsvImportType`, nouveau validator, nouvelle branche dans le controller)
- Brancher le job `ProcessBoatMaintenanceImport` pour les imports volumineux (> 500 lignes) : stocker le fichier CSV sur Cloudinary, passer son URL dans le payload du job, implémenter `execute()` qui parse + persiste en background
- Ajouter un filtre de période (date de début / fin) sur les exports
