# 2026-07-01 — [#187] Maintenance : décrémentation atomique du stock de pièces moteur

**Correction d'une race condition read-modify-write lors de la décrémentation du stock**

- `app/services/boat_maintenance_service.ts` : remplacement du pattern lecture → calcul → save par un `UPDATE` atomique via `db.raw()` utilisant `CASE WHEN` pour garantir `GREATEST(0, stock - used)` et la mise à jour conditionnelle de `wear_state` dans une seule opération SQL. Élimine la possibilité que deux transactions concurrentes lisent le même stock avant écriture.
- `tests/integration/services/boat_maintenance_service.spec.ts` : ajout de 3 tests couvrant le clamp à 0 quand `quantity > stock`, la préservation de `wearState = 'damaged'`, et la préservation de `stock = null`.
