# 2026-07-03 — [#175] Bateaux : `assign()` passe par la policy Bouncer

**Corrige B-06 : l'action `assign()` (affectation de spot) ne passait par aucune policy Bouncer, contrairement à `update`/`destroy`/`create`. Elle est désormais routée par `BoatPolicy.edit`**

- `app/controllers/boats_controller.ts` : `assign()` appelle `await bouncer.with(BoatPolicy).authorize('edit', boat)` après la récupération du bateau
- Défense en profondeur : le cross-org était déjà bloqué par `getForUserOrFail` (fetch scopé à l'org), et `BoatPolicy.edit` autorise les membres de l'org (même règle que `update`) — pas de changement de comportement immédiat, mais l'action respecte maintenant la policy et suivra automatiquement tout durcissement futur de `edit`
- Tests ajoutés : `tests/functional/boats/boats_assign.spec.ts` (un membre non-admin de l'org reste autorisé ; un bateau d'une autre org n'est pas modifié)
