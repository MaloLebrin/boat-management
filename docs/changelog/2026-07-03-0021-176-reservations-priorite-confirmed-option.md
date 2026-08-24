# 2026-07-03 — [#176] Réservations : priorité `confirmed` > `option`

**Corrige C-02 : le contrôle de conflit bloquait toute réservation non annulée (option comme confirmed), rendant impossible de confirmer un créneau couvert par une simple option. Règle métier retenue : une réservation ferme l'emporte sur une option provisoire**

- `app/services/boat_reservation_service.ts` :
  - `checkConflict()` prend désormais en compte le statut entrant : une `confirmed` n'est bloquée que par une autre `confirmed` qui chevauche ; une `option` reste bloquée par toute réservation non annulée qui chevauche (un hold par créneau) ; une `cancelled` ne crée jamais de conflit
  - nouvelle méthode `cancelOverlappingOptions()` : lors de la création/mise à jour d'une `confirmed`, les `option` qui chevauchent passent automatiquement en `cancelled` (dans une transaction, pas de donnée incohérente)
  - `create()` et `update()` s'exécutent en transaction et renvoient `{ reservation, cancelledOptions }`
- `app/controllers/boat_reservations_controller.ts` : flash de succès enrichi — `flash.reservation.optionsOverridden` avec le nombre d'options annulées quand une confirmed en écrase
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `reservation.optionsOverridden`
- Tests ajoutés : `tests/functional/boats/reservations.spec.ts` (confirmed écrase et annule une option chevauchante ; confirmed toujours bloquée par une confirmed ; option bloquée par une option ; update d'une confirmed sur une option l'annule)
