# 2026-07-06 — [#281] Mutualise les helpers de normalisation de requête des listes org-scopées

Les helpers de normalisation des paramètres de liste (recherche / tri / pagination) étaient dupliqués verbatim entre `client_service` et `boat_list_service` — toute correction d'edge-case (`NaN`, bornes de pagination) risquait une divergence silencieuse.

- **`shared/helpers/query.ts`** : ajoute les helpers génériques `toTrimmedStringOrUndefined`, `toIntegerOrUndefined` (jamais `NaN`), `clampInt` et `normalizeEnum(value, allowed, fallback)` (validation d'énumération de tri / direction / statut, avec fallback hors-liste type `''`).
- **`app/services/client_service.ts`** et **`app/services/boat_list_service.ts`** consomment désormais ces helpers partagés (zéro duplication) ; les listes d'options autorisées restent locales à chaque service. Comportement inchangé.
- **Tests** : unitaires `tests/unit/helpers/query.spec.ts` (couvre les 4 helpers) ; non-régression des listes (`clients`, `boats`) verte.
