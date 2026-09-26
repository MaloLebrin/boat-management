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
  - `docs/domain/invoicing.md` — facturation (devis & factures, numérotation, PDF/email, statuts, devis depuis réservation — Enterprise)
  - `docs/domain/clients.md` — CRM clients + lien réservation ↔ client (historique, blocage blacklist — Enterprise)
  - `docs/domain/notifications.md` — notifications par utilisateur (cloche + page, temps réel SSE via Transmit, events → listeners)
  - `docs/domain/contact.md` — formulaire de contact public (`POST /contact`, throttle, persistance, notification équipe + accusé de réception)
  - `docs/domain/ports-and-marina.md` — ports, pontons, mouillages, places et plan interactif (Entreprise, profil professionnel)
  - `docs/domain/offline-queue.md` — file hors-ligne : les cinq clés de flash, le vocabulaire d'actions, le verrou optimiste et la résolution des ID temporaires
  - `docs/domain/navigation-logs.md` — journal de bord (sorties, points de log GPS au tap avec COG/SOG, carte du tracé, offline)
- **Guides utilisateur** (mode d'emploi, en français, pour les utilisateurs de l'app) :
  - `docs/user-guide/import-depenses-excel.md` — importer des dépenses depuis un classeur Excel ou un CSV (colonnes, formats, catégories, doublons, erreurs fréquentes)
- **Données**: `docs/data/schema.md`
- **Frontend (Inertia/Vue)**:
  - `docs/frontend/ui-map.md`
  - `docs/frontend/i18n.md` — internationalisation, `useT()`, ajouter une langue
- **Tests**: `docs/dev/testing.md`
- **Hébergement & déploiement**: `docs/dev/hosting.md` — image GHCR, migrations au déploiement, docker-compose.prod.yml, healthcheck `/up`
- **Clés de chiffrement**: `docs/dev/encryption-keys.md` — `ENCRYPTION_KEY` vs `APP_KEY`, migration initiale, procédure de rotation (`node ace encryption:rotate`)
- **Seeders**: `docs/dev/seeders.md`
- **Contribution**: `docs/dev/contributing.md`
- **Process “doc à jour”**: `docs/process/keeping-docs-up-to-date.md`
- **Changelog**: `docs/changelog/` — un fichier par modification (convention dans `docs/changelog/README.md`)

## Règle de maintenabilité (doc à jour)

Une évolution n’est considérée **terminée** que si:

- le code est livré **avec tests** quand pertinent
- la documentation `docs/` est mise à jour en même temps que la feature

Voir: `docs/process/keeping-docs-up-to-date.md` et `docs/process/pr-checklist.md`.
