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
date;quantité_litres;prix_par_litre;coût_total;heures_moteur;carburant;fournisseur;notes
```

> `carburant` (#585) reprend le vocabulaire de `boat_engines.fuel`
> (`diesel` | `essence` | `electric` | `other`) et reste **vide** pour les pleins
> antérieurs, qui n'en portaient pas.

**navigation-logs.csv**

```
date_départ;date_arrivée;port_départ;port_arrivée;distance_nm;heures_moteur_départ;heures_moteur_arrivée;carburant_consommé_L;vent_beaufort;état_mer;nb_équipiers;statut;notes
```

### Import CSV

Routes (`start/routes/settings.ts`) → controller `app/controllers/csv_import_controller.ts` → service `app/services/csv_import_service.ts`

| Route                           | Action                        | Description                                                        |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `GET /settings/import`          | `CsvImportController.show`    | Page import/export, passe `boats[]`, `preview`, `hasPendingImport` |
| `POST /settings/import/preview` | `CsvImportController.preview` | Dry-run — parse + valide, écrit un `pending_imports`, redirige     |
| `POST /settings/import/confirm` | `CsvImportController.confirm` | Import effectif depuis le `pending_imports` de l'utilisateur       |
| `POST /settings/import/cancel`  | `CsvImportController.cancel`  | Supprime le `pending_imports` de l'utilisateur, redirige           |

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

#### Bornes du fichier (#774)

| Borne                         | Valeur               | Où                                                  |
| ----------------------------- | -------------------- | --------------------------------------------------- |
| `CSV_IMPORT_MAX_FILE_SIZE_MB` | `2` Mo               | `csvPreviewValidator` (VineJS, refus multipart)     |
| `CSV_IMPORT_MAX_ROWS`         | `2 000` lignes       | `parseMaintenanceCsv()`, **avant** toute validation |
| `CSV_IMPORT_INSERT_CHUNK`     | `200` lignes par lot | `importMaintenanceRows()`                           |

Les trois vivent dans `shared/constants/csv_import.ts` et sont reprises telles
quelles par l'UI (`settings.import.fileHint`, `settings.import.help.step2`) :
l'aide annonçait 5 Mo sans plafond de lignes, c'est-à-dire une limite que le
code n'appliquait pas.

La taille de fichier est calée sur le plafond de lignes, pas l'inverse : un
`5mb` accepté par le validateur puis systématiquement refusé au parse est un
piège. Le refus de lignes est prioritaire sur le contrôle d'en-têtes — sur un
fichier hors bornes, on ne parse rien de plus que le comptage.

#### Flux preview → confirm

L'attente vit dans la table `pending_imports`, **pas en session** (#774) :
avec `SESSION_DRIVER=cookie` (la valeur de `.env.example`, donc de la
production), quelques centaines de lignes dépassaient les ~4 Ko d'un cookie.
L'aperçu s'affichait correctement, puis le `confirm` ne retrouvait rien et
servait « votre prévisualisation a expiré » pour un fichier parfaitement
valide. La session ne porte plus que `pendingImportId`.

1. `POST /preview` : parse le CSV, supprime l'éventuelle attente précédente de
   l'utilisateur, crée un `PendingImport` (`rows` en `jsonb`), met son `id`
   dans `session.put('pendingImportId', …)` et le résumé d'affichage dans
   `session.flash('importPreview', json)`
2. `GET /settings/import` : lit `session.flashMessages.get('importPreview')`
   pour afficher l'aperçu ; `hasPendingImport` est dérivé de la **table**, pas
   de la session — un `confirm` joué dans un autre onglet laissait sinon
   l'écran proposer de confirmer un import déjà consommé
3. `POST /confirm` : charge le `PendingImport` **par `id` et par `userId`**,
   écrit via `importMaintenanceRows()`, puis supprime la ligne et oublie la clé
   de session

> Le scope `userId` du point 3 n'est pas décoratif : sans lui, un identifiant
> recopié suffirait à consommer la prévisualisation d'un collègue de la même
> organisation — la vérification du bateau, elle, ne tranche pas ce cas
> puisque les deux y ont accès.

> Une seule attente par utilisateur (contrainte d'unicité sur `user_id`) : une
> nouvelle prévisualisation remplace la précédente, et rien ne s'accumule. Pas
> de job de purge à prévoir.

> Si l'utilisateur ferme l'onglet entre preview et confirm, la ligne reste
> jusqu'à sa prochaine prévisualisation, mais la clé de session expire avec la
> session (TTL 5 jours par défaut). Il faut alors re-uploader le fichier.

#### Comportement de l'import (maintenance)

`importMaintenanceRows()` (`app/services/csv_import_service.ts`) :

- Wrappé dans une transaction Lucid — rollback global si une ligne échoue
- Insère **par lots** de `CSV_IMPORT_INSERT_CHUNK` (`createMany`), au lieu de
  deux `INSERT` par ligne : la transaction reste unique, mais sa durée et son
  volume de WAL sont bornés par le plafond de lignes
- Crée un `BoatMaintenanceEvent` par ligne valide
- Si `cost` est renseigné : crée un `BoatMaintenancePart` nommé `"Coût total"` avec `quantity=1` et `unitPrice=cost`
- `boatEngineId`, `boatSailId`, `boatRigId`, `boatSafetyEquipmentId` sont laissés à `null` (le CSV ne référence que des libellés)

## Fichiers clés

| Fichier                                                  | Rôle                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `shared/types/csv.ts`                                    | Types partagés + `MAINTENANCE_CSV_HEADERS`                                   |
| `app/exceptions/csv_errors.ts`                           | `CsvImportValidationError`                                                   |
| `app/validators/csv_import.ts`                           | `csvPreviewValidator`, `csvConfirmValidator` (VineJS)                        |
| `app/services/csv_import_service.ts`                     | Parsing (BOM, guillemets, `;`), validation par colonne, import               |
| `app/services/csv_export_service.ts`                     | `escapeCell()`, `buildCsv()`, `csvFilename()` — **seul** constructeur de CSV |
| `app/controllers/csv_import_controller.ts`               | Attente en base + Inertia render                                             |
| `app/models/pending_import.ts`                           | `pending_imports` — une attente par utilisateur                              |
| `shared/constants/csv_import.ts`                         | Plafonds de lignes, de taille et de lot                                      |
| `app/controllers/csv_export_controller.ts`               | Streaming CSV par type                                                       |
| `inertia/pages/settings/import.vue`                      | Page shell Inertia                                                           |
| `inertia/components/settings/tabs/SettingsImportTab.vue` | Formulaire upload + aperçu + liens export                                    |
| `inertia/utils/routes.ts`                                | Helpers `routes.csv.*`                                                       |

## Échappement des cellules (#773)

`escapeCell()` (`app/services/csv_export_service.ts`) est le **seul**
échappement de CSV du repo, et `buildCsv()` son seul constructeur. Il y en
avait deux, avec deux implémentations divergentes de la même règle —
`boat_engine_spare_parts_service.ts` avait la sienne, qui mettait tout entre
guillemets. Ce n'était pas une protection : le tableur retire les guillemets à
l'import, puis évalue le contenu.

La règle, en deux temps :

1. **RFC 4180** — une valeur contenant `;`, `"`, CR ou LF est mise entre
   guillemets, les guillemets internes doublés.
2. **Neutralisation des formules (CWE-1236)** — une **chaîne** commençant par
   `=`, `+`, `-`, `@`, TAB ou CR est préfixée d'une apostrophe et mise entre
   guillemets. Le tableur consomme l'apostrophe comme marqueur « ceci est du
   texte » et n'évalue pas.

Deux exemptions, sans lesquelles l'échappement serait une régression
fonctionnelle :

- un `number` n'est **jamais** préfixé — sinon les colonnes de coûts cessent
  d'être sommables ;
- une chaîne qui est un littéral numérique exact (`^-?\d+(?:[.,]\d+)?$`) non
  plus : `-42` commence par un caractère de la liste noire et n'est pourtant
  pas une formule. L'ancrage est ce qui rend l'exemption sûre — `-1+1` ne
  matche pas, et se fait neutraliser.

Pourquoi à l'export et non à l'écriture : `=1+1` est une saisie légitime dans
un champ de notes. C'est la sortie vers un format évalué qui doit être
échappée, pas la base.

## Quota et ACL

- Toutes les routes vérifient `QuotaService.assertCanExport(user.organization)` — lance `QuotaExceededError` si plan Starter
- Le lien "Import CSV" n'apparaît dans `SettingsShell` que si `PLAN_LIMITS[plan].canExport === true`
- L'appartenance du bateau à l'organisation est vérifiée via `BoatService.getForUserOrFail`

## Extension future

- Ajouter les types `fuel_logs` et `navigation_logs` à l'import (enum `CsvImportType`, nouveau validator, nouvelle branche dans le controller)
- Brancher le job `ProcessBoatMaintenanceImport` pour les imports volumineux (> 500 lignes) : stocker le fichier CSV sur Cloudinary, passer son URL dans le payload du job, implémenter `execute()` qui parse + persiste en background
- Ajouter un filtre de période (date de début / fin) sur les exports
