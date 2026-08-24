# 2026-06-15 — Design : unification tokens couleur — suppression des namespaces `abyss` et `lagoon` (#35)

**Refactoring — Design system / CSS**

Triple système de tokens couleur fragmenté (navy / abyss / lagoon pointant vers les mêmes teintes) remplacé par un seul namespace `navy` étendu. La palette `navy` passe de 7 à 11 shades (ajout de 400, 300, 200, 25) pour couvrir toutes les teintes précédemment définies sous `abyss-*` et `lagoon-*`. Tous les composants et pages Inertia migrent vers `navy-*` selon la correspondance exacte des valeurs hex. Aucun changement visuel.

- **`inertia/css/app.css`** : palette `navy` étendue (900→25), blocs `abyss` et `lagoon` supprimés
- **Composants** (`default.vue`, `AsideMenu`, `LanguageSwitcher`, `PublicFooter`, `Logo`, `BaseModal`, `BoatOverviewAiPanel`, `EngineShowTabOverview`, `HomeComparisonSection`, `HomeContentSections`) : `abyss-X` → `navy-Y`, `lagoon-X` → `navy-Y`
- **Pages** (`dashboard`, `planning/index`, `marketing/guide`) : idem
