# 2026-07-06 — [#289] Location 1/3 : états des lieux départ/retour (relevés + photos)

**Première PR de l'epic #283 (Contrats de location & états des lieux)**. Ajoute l'état des lieux de départ (`checkout`) et de retour (`checkin`) rattaché à une réservation, avec relevés (niveau carburant, heures moteur, notes) et photos.

- **Base de données** : migration `1813000000000_create_boat_inspections_table.ts` — table `boat_inspections` (`organization_id`, `reservation_id` FK `boat_reservations` cascade, `kind` check `checkout`/`checkin`, `performed_at`, `fuel_level`, `engine_hours`, `notes`), unique `(reservation_id, kind)` — un seul checkout et un seul checkin par réservation
- **Backend** :
  - `app/models/boat_inspection.ts`, `app/services/boat_inspection_service.ts` (CRUD org-scopé via la réservation), `app/validators/boat_inspection.ts`, `app/exceptions/inspection_errors.ts`, `app/transformers/boat_inspection_transformer.ts`
  - `shared/types/permissions.ts` : nouvelles capacités `inspections.view/create/edit` (member) et `inspections.delete` (admin-only) ; `app/policies/inspection_policy.ts`
  - `shared/constants/media.ts` : nouveau type d'entité média `'inspection'` ; `CloudinaryFolders.inspectionPhotos` ; actions `storeInspectionPhoto`/`destroyInspectionMedia` sur `boat_media_controller.ts`
  - Routes : `GET/POST/PUT/DELETE boats/:boatId/reservations/:reservationId/inspection(s)` + sous-routes photos
- **Frontend** : page `boats/reservation_inspection`, composants `InspectionPanel`/`InspectionPhotos`/`InspectionComparison`, bouton d'accès depuis `ReservationList`
- **i18n** : nouveau domaine `inspections.json` (en/fr), clés `flash.inspections.*`, `reservations.actions.inspection`
- **Tests** : `tests/functional/boats/inspections.spec.ts` (CRUD, policy admin/member, unicité par type, scoping org, suppression photo)
