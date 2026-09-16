# 2026-09-16 — Fakes et factories de test partagés (refactorisation, vague 0.1)

Première étape du plan de refactorisation piloté par les tests : mutualiser ce
que chaque spec redéclarait pour lui-même, afin que les vagues suivantes
puissent écrire des tests de caractérisation à bas coût.

- **Fakes.** Nouveau module `tests/support/fakes.ts` : `swapFakeCloudinary()` (uploads image/document, suppressions de fichiers avec `resourceType` et de dossiers, `downloadAsBuffer`, option `failUploadAt` pour simuler une panne au milieu d'un lot) et `swapAiService(script)` (file de réponses scriptées, capture des messages, du fournisseur, du modèle, de la clé BYOK et des outils proposés), avec `restoreCloudinary()` / `restoreAiService()`. Remplace 17 copies inline du fake Cloudinary et 8 du fake IA dans `tests/functional` et `tests/integration`.
- **Factories.** Neuf factories Lucid manquantes dans `database/factories/` : `invoice` (états `invoice`, `sent`, `paid`, `overdue`), `invoice_line`, `boat_inspection` (`checkin`), `boat_incident` (`closed`), `boat_maintenance_task` (`overdue`, `done`, `noDueDate`), `rental_contract` (`signed`), `crew_member`, `pricing_season` (`multiplier`), `boat_equipment_action` (`done`).
- **Helpers.** `createEnterpriseAdminUser()` de `tests/functional/helpers.ts` remplace les 15 copies locales des specs (clients, factures, tarification, photos d'équipement, recherche) et celle de `tests/browser/helpers.ts`, qui la ré-exporte désormais.
- **Tests.** `tests/unit/support/fakes.spec.ts` (8 tests : capture, script, panne, restauration) et `tests/integration/factories/new_factories.spec.ts` (9 tests, un par factory et ses états). Les 26 specs fonctionnelles migrées restent vertes sans changement d'assertion (319 tests).
- **Aucun changement** de code applicatif ni de route.
