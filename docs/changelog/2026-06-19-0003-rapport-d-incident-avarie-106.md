# 2026-06-19 — Rapport d'incident / avarie #106

**Backend**

- `database/migrations/1796000000000_create_boat_incidents_table.ts` — table `boat_incidents` : `boat_id`, `organization_id`, `occurred_at`, `type` (enum : grounding, flooding, rigging_failure, engine_failure, collision, fire, theft_vandalism, other), `location`, `description`, `insurance_claimed`, `insurance_claim_ref`, `status` (enum : open, in_progress, closed), `closed_at`
- `app/models/boat_incident.ts` — modèle Lucid avec relation `belongsTo(Boat)`
- `app/exceptions/incident_errors.ts` — `BoatIncidentNotFoundError`, `BoatIncidentValidationError`
- `shared/types/incident.ts` — types `IncidentType`, `IncidentStatus`, `CreateIncidentPayload`, `UpdateIncidentPayload`, `BoatIncidentRow`
- `app/validators/boat_incident.ts` — `createBoatIncidentValidator`, `updateBoatIncidentValidator`
- `app/policies/incident_policy.ts` — policy Bouncer (view, create, edit, delete)
- `app/services/boat_incident_service.ts` — `listForBoat`, `createForBoat`, `updateForBoat`, `deleteForBoat` ; clôture automatique de `closed_at` au passage en statut `closed`
- `app/controllers/boat_incidents_controller.ts` — `store`, `update`, `destroy`
- `start/routes/boats.ts` — routes `POST /boats/:boatId/incidents`, `PUT /boats/:boatId/incidents/:incidentId`, `DELETE /boats/:boatId/incidents/:incidentId`
- `app/controllers/boats_controller.ts` — injection de `BoatIncidentService`, chargement des incidents dans le `show`
- `app/transformers/boat_transformer.ts` — `toIncident()` + inclusion dans `toShowProps()`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` — clés `incidents.*`

**Frontend**

- `resources/lang/fr/incidents.json` et `resources/lang/en/incidents.json` — toutes les clés UI du module
- `inertia/types/boat_show.ts` — types `IncidentType`, `IncidentStatus`, `BoatIncidentRow`
- `inertia/components/boats/show/tabs/BoatShowTabIncidents.vue` — onglet incidents : liste avec code couleur par statut (open=coral, in_progress=amber, closed=gris), formulaire création/édition inline, suppression avec confirmation
- `inertia/pages/boats/show.vue` — ajout de l'onglet "Incidents" avec badge comptant les incidents ouverts/en cours
