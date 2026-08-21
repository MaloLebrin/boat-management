# 2026-07-03 — [#207] Plan de mouillage : validation des coordonnées de position sur le canvas

**Corrige G-07 : les positions des pontons/mouillages n'étaient pas bornées aux dimensions du canvas**

- `shared/constants/marina_layout.ts` : nouvelle constante `MARINA_CANVAS_WIDTH` (1400) / `MARINA_CANVAS_HEIGHT` (900), source unique pour backend et frontend
- `app/validators/marina_layout.ts` : `updatePositionValidator` borne désormais `x`/`y` entre `0` et les dimensions du canvas (`.min(0).max(...)`), routes `PATCH /ports/:portId/pontoons/:pontoonId/position` et `PATCH /ports/:portId/mouillages/:mouillageId/position`
- `inertia/components/ports/show/MarinaCanvas.vue` : le SVG utilise la constante partagée (au lieu de valeurs `1400`/`900` en dur) et le drag-and-drop clampe la position à l'intérieur du canvas pendant le déplacement
- Tests fonctionnels ajoutés dans `tests/functional/ports/pontoons.spec.ts` et `tests/functional/ports/mouillages.spec.ts` : coordonnées valides acceptées, coordonnées négatives et hors-limites rejetées
