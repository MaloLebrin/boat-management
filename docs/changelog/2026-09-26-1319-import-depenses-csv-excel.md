# 2026-09-26 — Import de dépenses depuis un fichier CSV ou Excel

Les dépenses libres du budget d'un bateau (`boat_budget_entries`) se saisissaient
une par une. Un exploitant qui arrive avec un historique — export bancaire,
tableur perso — devait tout ressaisir. L'écran `/settings/import` (aperçu →
confirmation, attente en base dans `pending_imports`) gagne un second type,
« Dépenses (budget) », et accepte désormais les classeurs Excel `.xlsx` en plus du
CSV — pour les deux types.

- **Périmètre.** Dépenses uniquement (pas les séjours au port). Même garde que
  l'import de maintenance : plan Entreprise (`canImport`) + capability `import.run`
  (admin). Aucune migration : `pending_imports.type` (varchar 32) prend la valeur
  `expenses`, `rows` (jsonb) porte des `ExpenseImportRow[]`.
- **Routes.** Inchangées (`settings.import`, `.preview`, `.confirm`, `.cancel`).
  `GET /settings/import?type=expenses&boatId=N` présélectionne le formulaire
  (props `initialType` / `initialBoatId`, filtrées : type inconnu ou bateau hors
  flotte → `null`). La page budget (`BudgetController.show`) sert une prop
  `canImport` et affiche un bouton « Importer des dépenses » qui pointe dessus
  (`routes.csv.importExpenses`).
- **Lecture des fichiers.** Nouveau `app/services/table_file_parser_service.ts` :
  `parseUploadedTable()` branche sur l'extension — `.csv` → `parseCsvContent()`
  (déplacé, inchangé), `.xlsx` → `parseXlsxBuffer()` via la nouvelle dépendance
  `exceljs` (première feuille, ligne 1 = en-têtes, dates converties en ISO **en
  UTC**, formules → résultat, texte riche concaténé). Les deux produisent la même
  `ParsedTable`, donc la maintenance accepte aussi l'xlsx. `exceljs` n'est
  importé que depuis ce service (jamais `shared/` ni `inertia/`, sinon Vite
  l'embarque côté client). Classeur illisible → `TableFileUnreadableError`
  (`app/exceptions/csv_errors.ts`) → flash `flash.csv.fileUnreadable`.
- **Validation des dépenses.** Nouveau `app/services/expense_import_service.ts`.
  En-têtes **tolérantes** (`EXPENSE_HEADER_ALIASES`, comparaison normalisée sans
  accent ni casse : « Libellé », « Montant », « Coût », « Catégorie »…), colonnes
  requises `date`, `label`, `amount`. Dates `YYYY-MM-DD`, `DD/MM/YYYY`,
  `DD-MM-YYYY` ; montants `1 234,56`, `1.234,56`, `1 234,56 €`, négatif accepté ;
  catégories par slug ou alias FR/EN (`EXPENSE_CATEGORY_ALIASES`), vide → `other`.
  Erreurs de ligne en clés i18n (`flash.csv.rowErrors.{dateInvalidFormatFlexible,
labelRequired, labelTooLong, amountRequired, amountInvalid, categoryInvalid}`).
- **Doublons.** Une ligne de même `date | libellé (casse ignorée) | montant`
  qu'une dépense déjà enregistrée sur le bateau — ou qu'une ligne plus haut dans
  le fichier — prend le statut `duplicate` : signalée dans l'aperçu (« Déjà
  présente », badge `amber`), ni comptée en erreur ni importée. Une seule requête
  (`markExpenseDuplicates`, dépenses du bateau aux dates concernées).
- **Aiguillage.** `csv_import_service.ts` expose `prepareImportPreview(type, table,
boatId)` et `runImport(type, boatId, rows, i18n)` ; le contrôleur ne branche
  plus sur le type. `parseMaintenanceCsv()` reste en wrapper (tests existants
  intacts). `CsvPreviewRow.status` (`valid | invalid | duplicate`) et
  `CsvImportPreviewData.duplicateRows` sont nouveaux.
- **Front.** `SettingsImportTab.vue` (283 lignes, au-dessus du plafond ESLint)
  est scindé en `components/settings/import/ImportExportCard.vue`,
  `ImportUploadForm.vue` (`accept=".csv,.xlsx"`, en-têtes modèles selon le type)
  et `ImportPreviewPanel.vue` (colonnes selon `preview.type`, trois statuts).
  `CsvHelpModal` prend le type courant et documente le format des dépenses.
- **i18n.** `settings.import.{types.expenses, fileLabel, fileHint,
previewColumns.*, rowDuplicate, previewDuplicates, help.*}`, `flash.csv.*`,
  `budget.importButton` — en et fr.
- **Docs.** `docs/domain/csv-import-export.md` (sections « Import — dépenses » et
  « Fichiers Excel »), `docs/frontend/ui-map.md`, `docs/data/schema.md` ;
  entrée `expenses-import` et mise à jour de `csv-import` dans
  `shared/constants/assistant/product_knowledge.ts`.
- **Tests.** Unit : `table_file_parser_service.spec.ts` (classeurs construits
  avec exceljs : dates, nombres, formules, lignes vides, fichier illisible) et
  `expense_import_service.spec.ts` (alias, dates, montants, catégories,
  validation, plafond, clé de doublon). Fonctionnel :
  `settings/csv_import_expenses.spec.ts` (CSV aux en-têtes françaises, xlsx,
  classeur corrompu, doublon en base et dans le fichier, traductions en/fr,
  en-têtes manquantes, refus plan Pro et membre, confirmation, présélection) et
  `boats/budget.spec.ts` (`canImport`). Vitest : `import_preview_panel`,
  `import_upload_form`, `budget_page_import_button`, présélection dans
  `settings_import_tab`.
