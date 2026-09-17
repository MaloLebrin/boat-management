# Variantes de statut centralisées et libellés bateau fusionnés

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.3.

## Problème

La correspondance « statut métier → variante de `BaseBadge` » était recopiée
composant par composant : quatorze `statusVariant` (équipements mécaniques,
équipements de sécurité et génériques, incidents, documents administratifs),
trois `wearStateVariant` (pièces moteur) et deux `maintenanceVariant` (liste
de la flotte). `engine_status.ts` n'en couvrait qu'une. Les libellés de
catégorie et de propulsion vivaient dans deux fichiers d'une fonction chacun,
à côté de `boat_enum_labels.ts` qui portait déjà le même helper `labelFor`.

## Changement — rendu inchangé

- `inertia/utils/status_variants.ts` (`BadgeVariant`) :
  `equipmentStatusVariant` (moteur, voile, gréement ; `engineStatusVariant`
  conservé en alias), `safetyStatusVariant` (sécurité, générique),
  `wearStateVariant`, `maintenanceVariant({ urgentCount, upcomingCount })`,
  `incidentStatusVariant`, `documentStatusVariant`. Les deux tables
  (`incidents`, `documents`) deviennent des fonctions avec repli `neutral`,
  ce que `BaseBadge` appliquait déjà à une valeur absente.
- 19 composants et pages migrés ; `engine_status.ts` supprimé (ses deux
  importateurs pointent sur `equipmentStatusVariant`).
- `boatCategoryLabel` et `propulsionLabel` rejoignent
  `inertia/utils/boat_enum_labels.ts` via `labelFor` ; `boat_category_label.ts`
  et `boat_propulsion_label.ts` supprimés, six importateurs repointés.
- Hors périmètre : les variantes propres à un écran (`SettingsBillingTab`,
  `SettingsAuditLogTab`) restent locales.

## Tests

- `tests/inertia/status_variants.spec.ts` (7 tests, écrits avant le module) :
  chaque valeur d'énumération → sa variante, repli sur une valeur inconnue,
  alias `engineStatusVariant`.
- `tests/inertia/boat_propulsion_label.spec.ts` repointée sur
  `boat_enum_labels` (assertions inchangées) ; `boat_enum_labels.spec.ts`
  inchangée.
- Specs de composants existantes (cartes, listes, incidents) et suite Vitest
  complète vertes ; `pnpm lint` ; vue-tsc : seule l'erreur préexistante
  d'`engine_show.vue` subsiste.
