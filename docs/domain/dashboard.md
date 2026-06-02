# Domaine — Dashboard

## Objectif fonctionnel

Donner une vue rapide sur la flotte et la maintenance imminente:

- stats: boats, engines, sails, rigs, urgent maintenance
- liste “urgent maintenance” (prochaines tâches)
- tableau “Your boats” (résumé)

## Entrée (routing)

Référence: `app/controllers/home_controller.ts`.

- Si user non authentifié: page `home` (Inertia)
- Si authentifié: `DashboardService.getForUser()` puis render `dashboard`

## Données renvoyées à la page

Références:

- service: `app/services/dashboard_service.ts`
- page: `inertia/pages/dashboard.vue`

Shape (résumé):

- `boats`: résumé par boat (id, name, propulsionType, counts engines/sails, hasRig)
- `urgentMaintenance`: rows (boatName, title, subject, kind date|hours, échéances)
- `stats`: compteurs

## Règles “urgent maintenance”

Référence: `DashboardService.getForUser()`.

- user sans `organizationId` → tout vide
- filtre sur tasks `status=open` et boats de l’org
- date-based urgent:
  - `dueAt <= now + urgentWithinDays` (default: 14)
- hours-based urgent:
  - nécessite `boatEngineId` et une heure moteur “courante” calculable
  - urgent si `dueEngineHours - currentEngineHours <= urgentWithinEngineHours` (default: 10)

Notes d’implémentation:

- pour les moteurs, l’heure “courante” est `engine.hours` si présent, sinon fallback sur `max(done_engine_hours)` des tasks `done`.
- les tasks hours-based sont filtrées en mémoire après récupération.
