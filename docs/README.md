# Documentation

Cette documentation décrit **fonctionnellement** et **techniquement** le projet.

## Comment naviguer

- **Démarrer**: `docs/dev/setup.md`
- **Architecture**: `docs/architecture/overview.md`
- **Fonctionnel (domaines)**:
  - `docs/domain/boats.md`
  - `docs/domain/maintenance-events.md`
  - `docs/domain/maintenance-tasks.md`
  - `docs/domain/maintenance-sheets.md`
  - `docs/domain/dashboard.md`
  - `docs/domain/auth-acl.md`
  - `docs/domain/ai-customization.md` — prompt système + modèle IA Enterprise
  - `docs/domain/task-grouping.md` — regroupement automatique des tâches (Pro & Enterprise)
  - `docs/domain/reservations-and-pricing.md` — réservations + tarification (tarif de base, saisons, calcul auto du total)
- **Données**: `docs/data/schema.md`
- **Frontend (Inertia/Vue)**:
  - `docs/frontend/ui-map.md`
  - `docs/frontend/i18n.md` — internationalisation, `useT()`, ajouter une langue
- **Tests**: `docs/dev/testing.md`
- **Contribution**: `docs/dev/contributing.md`
- **Process “doc à jour”**: `docs/process/keeping-docs-up-to-date.md`

## Règle de maintenabilité (doc à jour)

Une évolution n’est considérée **terminée** que si:

- le code est livré **avec tests** quand pertinent
- la documentation `docs/` est mise à jour en même temps que la feature

Voir: `docs/process/keeping-docs-up-to-date.md` et `docs/process/pr-checklist.md`.
