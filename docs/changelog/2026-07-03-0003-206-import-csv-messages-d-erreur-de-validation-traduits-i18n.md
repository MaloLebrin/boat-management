# 2026-07-03 — [#206] Import CSV : messages d'erreur de validation traduits (i18n)

**Corrige E-09 : `validateMaintenanceRow()` retournait des messages français hardcodés, cassant l'expérience en mode anglais**

- `shared/types/csv.ts` : `CsvRowError` (message déjà traduit, envoyé au frontend) séparé de `CsvRowErrorKey` (clé i18n + params, usage interne) ; `CsvPreviewRowKeys` pour la sortie brute du service
- `app/services/csv_import_service.ts` : `validateMaintenanceRow()` retourne désormais des clés i18n (`flash.csv.rowErrors.*`) avec params (ex. `subjectInvalid` interpole la liste des sujets acceptés) au lieu de chaînes en dur
- `app/controllers/csv_import_controller.ts` : résolution des clés via `i18n.t()` avant d'envoyer les lignes de prévisualisation au frontend
- `resources/lang/{en,fr}/flash.json` : nouvelle section `csv.rowErrors` (date invalide, titre requis, sujet invalide, légendes moteur/voile requises, coût invalide)
- Tests ajoutés : `tests/unit/services/csv_import_service.spec.ts` (clés i18n + params retournés par le service) et `tests/functional/settings/csv_import.spec.ts` (messages traduits en anglais par défaut, en français via `Accept-Language`, interpolation du message de sujet invalide)
  main
