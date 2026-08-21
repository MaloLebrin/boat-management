# 2026-06-15 — Fix : drag-and-drop tactile sur MarinaCanvas (#47)

**Support touch/mobile — `MarinaCanvas.vue` / `MarinaPontoon.vue` / `MarinaMouillage.vue`**

Le canvas de plan de port utilisait exclusivement des événements souris (`mousedown`, `mousemove`, `mouseup`), rendant le drag-and-drop inutilisable sur mobile et tablette. Migration vers l'API **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`), qui unifie souris, touch et stylet sans code conditionnel. `setPointerCapture` est appelé au début du drag pour garantir la réception des événements `pointermove` même si le doigt quitte la zone SVG. `touch-action: none` sur le SVG empêche le scroll navigateur pendant le drag. Les sous-composants `MarinaPontoon` et `MarinaMouillage` émettent désormais `pointerdown` au lieu de `mousedown`.
