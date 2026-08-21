# 2026-06-27 — Système de réservation par bateau (issue #107)

Module complet de réservation de bateaux pour les entreprises (charter, club, école de voile).

- Table `boat_reservations` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `status` (option/confirmed/cancelled), `starts_at`/`ends_at` (datetime), `client_name`, `client_email`, `client_phone`, `notes`, `total_price` ; index composé `(boat_id, starts_at, ends_at, status)` pour la détection de conflits
- Modèle `BoatReservation` avec relations `belongsTo` Boat et Organization ; `hasMany` ajouté sur Boat
- Service `BoatReservationService` : `listForBoat`, `listForOrg`, `create`, `update`, `delete` ; détection de chevauchement (`starts_at < endsAt AND ends_at > startsAt`, status != cancelled) avec `ReservationConflictError`
- Exceptions `reservation_errors.ts` : `ReservationNotFoundError`, `ReservationConflictError` (porte conflictingId), `ReservationValidationError`
- Validators VineJS : `createBoatReservationValidator` / `updateBoatReservationValidator` (datetime-local + date)
- Controller `BoatReservationsController` : GET/POST/PATCH/DELETE `/boats/:boatId/reservations` ; flash sur conflit
- Controller `ReservationsController` : GET `/reservations` (vue flotte multi-bateaux avec `FleetBoatCalendarEntry`)
- Pages : `boats/reservations.vue` (calendrier mono-bateau + formulaire + liste) et `reservations/index.vue` (timeline flotte + filtre bateau)
- Composants : `ReservationForm`, `ReservationList`, `ReservationStatusBadge`, `ReservationCalendar`, `ReservationTimeline`, `ReservationTimelineRow`, `FleetReservationList`
- i18n : `resources/lang/{fr,en}/reservations.json` + clés `flash.reservation.*` + `nav.reservations` ; lien nav ajouté dans la section FLOTTE
- Note : `client_id` FK CRM reporté — champs inline `client_name/email/phone` utilisés en attendant (voir issue CRM)
- Tests : `tests/functional/boats/reservations.spec.ts` (15 cas : index, store, update, destroy, fleet)
