# 2026-06-23 — Section Navigation globale dans la sidebar

Restructuration de l'architecture de navigation de l'app pour refléter sa double identité : gestion de flotte + navigation opérationnelle.

**Backend**

- `start/routes/navigation.ts` — 3 nouvelles routes GET protégées par `middleware.auth()` : `/navigation/logbook`, `/navigation/fuel`, `/navigation/incidents`
- `start/routes.ts` — import du nouveau fichier de routes navigation
- `app/controllers/navigation_controller.ts` — contrôleur mince (`@inject()`) avec 3 méthodes : `logbook()`, `fuel()`, `incidents()`. Filtre optionnel `?boatId=` via query string
- `app/services/navigation_service.ts` — service avec 4 méthodes : `getFleetBoats()`, `getFleetLogbook()`, `getFleetFuelLogs()`, `getFleetIncidents()`. Requêtes sur `NavigationLog`, `BoatFuelLog`, `BoatIncident` filtrées par `organizationId`. Preload `boat` (id + name uniquement)
- `shared/types/navigation.ts` — nouveaux types : `FleetLogbookRow`, `FleetFuelLogRow`, `FleetIncidentRow`, `FleetBoatOption`

**Frontend**

- `inertia/composables/use_nav_sections.ts` — ajout section "NAVIGATION" entre Maintenance et Préférences avec 3 items : Journal de bord (`/navigation/logbook`), Carburant (`/navigation/fuel`), Incidents (`/navigation/incidents`)
- `inertia/components/layout/NavIcon.vue` — 3 nouveaux icônes SVG : `compass`, `fuel`, `alert-triangle`
- `inertia/components/navigation/NavigationBoatFilter.vue` — composant select partagé pour filtrer par bateau (utilise `router.get` avec `replace: true`)
- `inertia/components/navigation/LogbookRow.vue`, `FuelLogRow.vue`, `IncidentRow.vue` — lignes de tableau avec lien vers `/boats/:id/navigation`
- `inertia/pages/navigation/logbook.vue` — vue globale du journal de bord (statut, bateau, ports départ/arrivée, distance, date)
- `inertia/pages/navigation/fuel.vue` — vue globale des avitaillements (bateau, date, quantité, coût, fournisseur)
- `inertia/pages/navigation/incidents.vue` — vue globale des incidents (statut, bateau, type, date, lieu)

**i18n**

- `resources/lang/fr/nav.json` + `en/nav.json` — clés `logbook`, `fuel`, `incidents`, `sections.navigation`
- `resources/lang/fr/navigation.json` + `en/navigation.json` — fichiers complets pour les 3 pages globales (titres, colonnes, stats, états vides, filtre)

---
