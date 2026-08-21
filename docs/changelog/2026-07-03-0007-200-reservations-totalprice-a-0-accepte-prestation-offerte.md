# 2026-07-03 — [#200] Réservations : totalPrice à 0 accepté (prestation offerte)

**Corrige C-04 : `vine.number().positive()` excluait 0, rendant impossible la création d'une réservation gratuite (invitation, test, prestation offerte)**

- `app/validators/boat_reservation_validator.ts` : `totalPrice` utilise désormais `.min(0)` au lieu de `.positive()`, dans les validators `create` et `update` — les valeurs négatives restent rejetées
- Test ajouté : `tests/functional/boats/reservations.spec.ts` (`totalPrice: 0` accepté et persisté)
