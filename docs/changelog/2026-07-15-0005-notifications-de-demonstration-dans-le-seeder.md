# 2026-07-15 — Notifications de démonstration dans le seeder

Le compte de démo (« Marina Démo ») affichait une cloche vide. Le seeder `database/seeders/sandbox_seeder.ts` crée désormais 6 notifications de démonstration pour le compte démo (`seedDemoNotifications`), afin que la cloche affiche un badge et un panneau peuplés.

- **Jeu de démo** : mélange lu/non-lu (3 non-lues → badge « 3 ») et sévérités variées — `maintenance.overdue` (error), `document.expiring_soon` (warning), `safety_equipment.expired` (error), `member.joined` (info, lu), `plan.upgraded` (success, lu), `quota.storage` (warning, lu). `actionUrl` réels (`/planning`, `/boats/:id`, `/settings/members`, `/settings/billing`) et `createdAt` échelonnés.
- **Idempotent** : garde par `userId` + `title` (aucune contrainte d'unicité en base), donc re-seeder ne crée pas de doublon. Titres/corps en dur en français (convention des seeders).
