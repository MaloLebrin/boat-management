# Domaine — Dashboard

## Objectif fonctionnel

Dire ce qui se passe dans la flotte et ce qu'il faut traiter aujourd'hui (#832), plutôt qu'inventorier :

- **KPI « pulse »** : bateaux (N en mer · N en alerte), sorties terminées sur 30 jours (+ milles), tâches réalisées sur 30 jours, incidents ouverts (+ en cours)
- **« À traiter »** : une liste mixte priorisée — maintenance urgente, incidents ouverts, documents expirés ou à échéance, factures impayées
- **« En mer maintenant »** : sorties en cours + état de flotte (en mer / au port / moteurs en maintenance)
- **« Prochains départs et retours »** (module Location) : réservations à 7 jours
- **« Activité récente »** (prop différée) : les 8 derniers événements de la flotte
- **« Dépenses »** (prop différée, admins) : total de l'organisation depuis le 1er janvier par poste, comparé à la même période N-1
- tableau « Vos bateaux » (table dès `lg`, cartes en dessous), assistant IA (avec la date de la dernière analyse), ports (plans avec `canManagePorts`, #604)

## Structure de l'écran

Deux colonnes `2fr / 1fr` à partir de `xl`, tout empilé en dessous dans cet ordre :

1. En-tête : titre, date du jour (calculée côté client), menu « + Créer »
2. KPI : 4 cartes, 2 par ligne sous `lg`, 4 à partir de `lg`
3. Colonne principale : À traiter → En mer (+ Prochains départs côte à côte dès `md`) → Activité récente → Vos bateaux
4. Colonne latérale : Assistant IA → Dépenses (admins) → Ports

## Entrée (routing)

Référence : `app/controllers/home_controller.ts`.

- `boat_owner` → `/owner/boats` ; `mechanic` → `dashboard/mechanic` ; sinon la page `dashboard`
- Les widgets gardés sont **omis côté serveur** (pas `null`) : `upcomingReservations` sans module Location, `spend` hors rôle admin. Le front distingue « pas autorisé » (`canViewSpend === false`, prop absente) de « en cours de chargement » (prop différée `undefined`).

## Données renvoyées à la page

Services :

- `app/services/dashboard_service.ts` — `boats`, `boatIds`, `stats` (+ `deltas`), `urgentMaintenance` (lignes plafonnées à `urgentLimit` = 10, entrée interne du service « À traiter »), `ports`, `portStats`
- `app/services/dashboard_attention_service.ts` — `attention` (`items`, `counts`, `canViewInvoices`)
- `app/services/dashboard_fleet_activity_service.ts` — `activeTrips`, `fleetStatus`, `pulse`, `activity` (différé)
- `app/services/boat_reservation_service.ts#listUpcomingForOrg` — `upcomingReservations`
- `app/services/budget_service.ts#getOrgSpendSummary` — `spend` (différé, admins)

Autres props : `aiFleetAnalysis`, `aiFleetAnalysisAt`, `portOptions`, `canCreate*`, `taskEquipment?` (optionnelle), `canAddBoat`, `boatQuota`, `canViewSpend`. Types dans `shared/types/dashboard.ts`, constantes (plafonds, fenêtres) dans `shared/constants/dashboard.ts`.

## Règles « À traiter »

- Sévérité `danger` : tâche en retard, document expiré, facture impayée ; `warning` : tâche bientôt due ou en heures moteur, incident ouvert ou en cours, document à moins de `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS` (30) jours.
- Tri : sévérité puis date croissante (le plus en retard / le plus ancien d'abord), tâches en heures en dernier ; `ATTENTION_DISPLAY_CAP` (6) lignes affichées, compteurs par type **exacts** (fonction fenêtre `count(*) over()` pour incidents et factures, agrégat conditionnel pour les documents).
- Facture impayée = statut `overdue` **ou** envoyée avec échéance dépassée (le job qui bascule le statut ne passe qu'une fois par jour). Seulement si le module CRM est actif **et** `invoices.view`.
- Liens : tâche → `/planning?task=<id>`, incident → `/boats/:boatId/incidents/:id`, document → `/boats/:boatId?tab=documents`, facture → `/invoices?status=overdue`.

## Règles « urgent maintenance »

Référence : `DashboardService.getForUser()`.

- user sans `organizationId` → tout vide
- tasks `status=open` des bateaux de l'org ; datées : `dueAt <= now + urgentWithinDays` (14) ; en heures : `dueEngineHours - currentEngineHours <= urgentWithinEngineHours` (10), heure courante = `engine.hours` sinon `max(done_engine_hours)`
- **comptage exact** : toutes les tâches candidates sont lues (plus de `limit`), `stats.urgentMaintenance` / `deltas.overdueCount` / `boatsInAlert` comptent tout, seules les lignes renvoyées sont plafonnées à `urgentLimit`
- « en retard » = échéance datée strictement avant le jour courant : `isDueDateOverdue(dueAt, today)` (`shared/helpers/maintenance.ts`), même règle côté service et côté page

## Fenêtres et plafonds

| Bloc                 | Fenêtre                                                      | Plafond                                                         |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| KPI sorties / tâches | `PULSE_WINDOW_DAYS` = 30 j glissants                         | —                                                               |
| À traiter            | maintenance 14 j / 10 h, documents 30 j                      | 6 lignes, `ATTENTION_FETCH_PER_KIND` = 6 par type               |
| En mer               | sorties `in_progress` (une par bateau, index partiel unique) | `ACTIVE_TRIPS_DISPLAY_CAP` = 5                                  |
| Prochains départs    | `UPCOMING_RESERVATIONS_DAYS` = 7 j                           | `UPCOMING_RESERVATIONS_CAP` = 5                                 |
| Activité récente     | —                                                            | `ACTIVITY_DISPLAY_CAP` = 8 (5 requêtes bornées, fusion mémoire) |
| Dépenses             | mois 1..courant, N et N-1                                    | ~18 agrégats, différé                                           |

## Index

Migration `1861000000000_add_dashboard_indexes.ts` : `navigation_logs(organization_id, status)`, `boat_incidents(organization_id, status)`, `boat_documents(organization_id, expires_at)`, `boat_maintenance_tasks(boat_id, status)`.
