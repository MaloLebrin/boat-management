# 2026-07-19 — Fuite de données : index staff accessibles à mechanic/boat_owner sans capability (#396)

`/boats`, `/reservations`, `/navigation/logbook`, `/navigation/fuel`, `/navigation/incidents` ne vérifiaient aucune policy (contrairement à leur `show` respectif) : un `boat_owner` (0 capability) ou un `mechanic` (`maintenance.*` uniquement) pouvait lister toute la flotte, les réservations, les logs de navigation/carburant et les incidents de l'organisation.

- `BoatsController#index`, `ReservationsController#index`, `NavigationController#logbook/#fuel` : ajout de `bouncer.with(BoatPolicy).authorize('view')` (même policy que les `show` correspondants).
- `NavigationController#incidents` : ajout de `bouncer.with(IncidentPolicy).authorize('view')` (capability `incidents.view`, déjà définie mais jusqu'ici jamais utilisée).
- `BoatPolicy.view` et `IncidentPolicy.view` acceptent désormais une instance `boat` optionnelle, pour autoriser un index (pas d'instance) avec la même policy qu'un show (instance présente) — même pattern que `InvoicePolicy.view`.
- Pour `boat_owner` spécifiquement (jamais de capability staff, toujours un portail dédié) : redirection vers `/owner/boats` plutôt qu'un 403 brut, via le nouvel utilitaire `app/utils/staff_route_guard.ts#boatOwnerPortalRedirect` (même comportement que `HomeController#index`).
- **Tests** : `tests/functional/boats/staff_index_access.spec.ts` — mechanic refusé (403), boat_owner redirigé (`/owner/boats`), member toujours autorisé (200), sur les 5 routes concernées.
