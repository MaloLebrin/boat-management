# 2026-06-28 — Correctifs post-review réservations (issue #107)

- Ajout d'un index composé `(organization_id, starts_at)` via une nouvelle migration pour accélérer `listForOrg`
- Interface d'édition : composant `ReservationEditModal` + bouton « Modifier » dans `ReservationList` — le PATCH est désormais accessible depuis l'UI
- Timeline flotte : fin de réservation exclusive (`<` au lieu de `<=`) ; `rounded-r` corrigé en conséquence pour que la pilule s'arrête au bon jour
- `ReservationConflictError.conflictingId` supprimé (propriété morte, jamais utilisée dans les controllers)
- `formatDate` extrait en composable `use_reservation_format.ts` (était dupliqué dans `ReservationList` et `FleetReservationList`)
- `boatOptions` dans `reservations/index.vue` encapsulé dans `computed()` pour rester réactif aux rechargements partiels
- Tests : couverture du cas PATCH `endBeforeStart` et isolation inter-org sur `GET /reservations`
- i18n : clé `reservations.form.edit` ajoutée (EN + FR)
