# Hygiène des imports : façade `BoatService`, erreurs, chemins `shared/`, routes de préférences

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.6.

## Changements

- **Façade supprimée** : `app/services/boat_service.ts` n'était qu'un alias de
  `BoatHullService` qui ré-exportait deux erreurs et six types. Ses 28
  importateurs (25 contrôleurs, un seeder, deux specs) nomment désormais
  `BoatHullService` directement.
- **Erreurs métier importées depuis `#exceptions/*` uniquement** : 17 services
  ré-exportaient leurs erreurs (`export { BoatNotFoundError }`,
  `export { ClientNotFoundError, ClientAlreadyAnonymizedError }`…), ce qui
  donnait jusqu'à trois chemins d'import pour la même classe. Les ré-exports
  sont retirés et les importateurs (55 lignes d'import réécrites dans les
  contrôleurs et les specs) pointent vers le
  fichier `app/exceptions/<domaine>_errors.ts` qui définit la classe. Deux
  services n'utilisaient l'erreur que pour la ré-exporter : l'import est
  retiré.
- **Alias `#shared/*`** : les huit imports relatifs `'../../shared/….js'`
  (`marketing_controller`, `marketing_features_controller`,
  `boat_simulator_controller`, `send_simulator_report_job`) passent par
  l'alias, comme partout ailleurs.
- **`InvoiceService`** : les quatre helpers locaux de normalisation de
  liste (`toTrimmedStringOrUndefined`, `toIntegerOrUndefined`, `clampInt`,
  `normalize*`) — copies verbatim de `shared/helpers/query.ts` — sont
  remplacés par les helpers partagés (`normalizeEnum` pour statut, type, tri
  et direction). Résultat identique, y compris les valeurs de repli.
- **Routes `POST /locale` et `POST /theme`** : les deux closures de
  `start/routes/settings.ts` deviennent `SettingsController.setLocale` /
  `setTheme`. Elles restent publiques (switchers du marketing et de l'écran de
  login), ignorent toujours une valeur inconnue sans erreur, et partagent avec
  `updateLocale` / `updateTheme` l'écriture des cookies (`#rememberLocale`,
  `#rememberTheme`). Noms de routes (`locale.set`, `theme.set`) et
  comportement inchangés.

## Tests

- `tests/unit/hygiene/import_paths.spec.ts` (4 gardes, rouges avant) :
  aucun import relatif vers `shared/` dans `app/`, aucune référence à
  `#services/boat_service`, aucune erreur importée depuis `#services/*`,
  aucun handler inline pour les préférences dans `start/routes/settings.ts`.
- Caractérisation existante conservée : `settings/account`,
  `settings/theme_preference` (cookie seul hors connexion, persistance
  connecté, valeur inconnue ignorée), `invoices/*` (filtres de liste),
  suites `boats/*`, `clients/*`, `crew/*`, `navigation/*`.
- `pnpm lint`, `tsc -b`, `node ace build` (seul à typer `tests/`) et suite
  backend complète verts.
