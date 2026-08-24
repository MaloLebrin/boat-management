# 2026-07-03 — [#202] Réservations : garde sur la suppression d'une réservation confirmée

**Corrige C-06 : `destroy()` supprimait n'importe quelle réservation (y compris `confirmed`) sans droit spécifique — un simple membre pouvait annuler une réservation confirmée**

- `app/policies/boat_policy.ts` : nouvelle ability `deleteReservation(user, boat, reservation)` — refuse la suppression si `reservation.status === 'confirmed'` pour un non-admin ; les admins passent via le hook `before()` existant (même pattern que `FuelLogPolicy`)
- `app/services/boat_reservation_service.ts` : `findForBoat()` extrait de `delete()` pour permettre au contrôleur de récupérer la réservation avant l'autorisation
- `app/controllers/boat_reservations_controller.ts` : `destroy()` charge la réservation puis appelle `bouncer.with(BoatPolicy).authorize('deleteReservation', boat, reservation)` avant suppression
- Tests ajoutés : `tests/functional/boats/reservations.spec.ts` (refus pour un membre non-admin sur réservation confirmée, autorisation sur réservation non confirmée, autorisation admin sur réservation confirmée)
