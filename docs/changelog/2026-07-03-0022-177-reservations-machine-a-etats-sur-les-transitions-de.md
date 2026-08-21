# 2026-07-03 — [#177] Réservations : machine à états sur les transitions de statut

**Corrige C-03 : `update()` appliquait n'importe quelle valeur de statut sans contrôle. Les transitions invalides (`confirmed → option`, `cancelled → confirmed`, etc.) n'étaient pas bloquées**

- `app/services/boat_reservation_service.ts` : map de transitions autorisées — `option → confirmed | cancelled`, `confirmed → cancelled`, `cancelled → ∅` (terminal). Rester sur le même statut est un no-op autorisé. Une transition interdite lève `ReservationValidationError('invalidTransition')`
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `reservation.invalidTransition` (le contrôleur mappe déjà `ReservationValidationError` → `flash.reservation.${errorCode}`)
- Décision métier validée : pas de dé-confirmation (`confirmed → option`), pas de réactivation (`cancelled` définitif)
- Tests ajoutés/ajustés : `tests/functional/boats/reservations.spec.ts` (option→cancelled et confirmed→cancelled autorisées ; confirmed→option et cancelled→confirmed rejetées avec flash ; mise à jour d'autres champs sans changement de statut autorisée). L'ancien test qui autorisait `confirmed → option` a été retiré (comportement supprimé par la nouvelle règle)
