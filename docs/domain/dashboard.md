# Domaine — Dashboard

## Objectif fonctionnel

Donner une vue rapide sur la flotte et la maintenance imminente:

- stats: boats, engines, sails, rigs (4 KPI ; le compteur de maintenance urgente vit dans l'en-tête de la carte dédiée, #828)
- liste “urgent maintenance” (prochaines tâches) — plafonnée à l'affichage
- tableau “Your boats” (résumé) — table à partir de `lg`, cartes en dessous
- ports (plans avec `canManagePorts`, #604) et assistant IA en colonne latérale

## Structure de l'écran (#828)

Ordre des blocs, identique sur mobile (empilé) et grand écran (deux colonnes `2fr / 1fr` à partir de `xl`) :

1. En-tête : titre + menu « + Créer » (`DashboardQuickAddActions`)
2. KPI : 4 cartes, 2 par ligne sous `lg`, 4 à partir de `lg`
3. Colonne principale : maintenance urgente, puis bateaux
4. Colonne latérale : assistant IA, puis ports

Plafonds :

- le service renvoie au plus `urgentLimit` (10) tâches urgentes et `stats.urgentMaintenance` compte ces lignes — au-delà de 10 le total affiché est donc sous-estimé (connu, pas de `urgentTotal` côté service pour l'instant) ;
- la carte n'en affiche que `URGENT_DISPLAY_CAP` (5, `shared/constants/dashboard.ts`) et renvoie vers `/planning` pour le reste.

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
- `urgentMaintenance`: rows (id, boatId, boatName, title, subject, kind date|hours, échéances)
- `stats`: compteurs + `deltas` (`boatsInAlert`, `boatsWithEngine`, `boatsWithSail`, `boatsWithRig`, `overdueCount`)
- `ports` / `portStats`: cartographie des ports (`PortService.listForUser`)
- `aiFleetAnalysis`, `portOptions`, `canCreate*`, `taskEquipment?`, `canAddBoat`, `boatQuota`: ajoutés par `HomeController.index`, voir `docs/frontend/ui-map.md`

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
- « en retard » = échéance datée strictement avant le jour courant : `isDueDateOverdue(dueAt, today)` (`shared/helpers/maintenance.ts`), utilisé par le service (`stats.deltas.overdueCount`, jour serveur) **et** par la page (pastille de chaque ligne, jour local du navigateur). Une seule définition des deux côtés (#828).
