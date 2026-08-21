# 2026-06-23 — Import / Export CSV (maintenance, avitaillements, journal de bord)

Nouvelle section **Import / Export CSV** accessible dans Paramètres → Import CSV (plans Pro et Enterprise uniquement).

**Export CSV** : téléchargement direct depuis la page de chaque bateau ou depuis la page d'import, format UTF-8 BOM + séparateur `;` (compatibilité Excel FR).

- `GET /boats/:id/export/maintenance.csv` — événements de maintenance avec coût total
- `GET /boats/:id/export/fuel-logs.csv` — avitaillements (quantité, prix, heures moteur…)
- `GET /boats/:id/export/navigation-logs.csv` — journal de bord (départ/arrivée, distance, météo…)

**Import CSV** : upload d'un fichier, dry-run avec aperçu ligne par ligne et rapport d'erreurs, puis confirmation pour créer les enregistrements en base.

- `GET /settings/import` — page d'import/export
- `POST /settings/import/preview` — dry-run, aperçu (50 premières lignes, erreurs colonne par colonne)
- `POST /settings/import/confirm` — import effectif des lignes valides
- `POST /settings/import/cancel` — annulation

**Format attendu (maintenance)** : `date;title;subject;notes;engine_caption;sail_caption;cost`

- `subject` : `boat | hull | engine | sail | rig | electrical | plumbing | safety | deck | other`
- `engine_caption` requis si `subject=engine` ; `sail_caption` requis si `subject=sail`

**Backend**

- `shared/types/csv.ts` — types `CsvImportType`, `CsvPreviewRow`, `CsvImportPreviewData`, `MaintenanceImportRow`, `MAINTENANCE_CSV_HEADERS`
- `app/exceptions/csv_errors.ts` — `CsvImportValidationError`
- `app/validators/csv_import.ts` — `csvPreviewValidator`, `csvConfirmValidator`
- `app/services/csv_import_service.ts` — parsing CSV (BOM, guillemets, semicolons), validation par colonne, `importMaintenanceRows()`
- `app/services/csv_export_service.ts` — `buildCsv()` (BOM + `;`), `csvFilename()`
- `app/controllers/csv_import_controller.ts` — `show`, `preview`, `confirm`, `cancel`
- `app/controllers/csv_export_controller.ts` — `maintenance`, `fuelLogs`, `navigationLogs`
- `start/routes/settings.ts` — routes import
- `start/routes/boats.ts` — routes export
- `resources/lang/{fr,en}/settings.json` — clés `settings.import.*`
- `resources/lang/{fr,en}/flash.json` — clés `flash.csv.*`

**Frontend**

- `inertia/pages/settings/import.vue` — page shell
- `inertia/components/settings/tabs/SettingsImportTab.vue` — formulaire upload + tableau aperçu + section export
- `inertia/components/settings/SettingsShell.vue` — lien "Import CSV" visible sur plans Pro/Enterprise
- `inertia/utils/routes.ts` — helpers `routes.csv.*`
- `.adonisjs/server/pages.d.ts` — enregistrement `settings/import`
