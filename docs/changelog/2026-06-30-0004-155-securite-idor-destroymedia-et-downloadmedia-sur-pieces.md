# 2026-06-30 — [#155] Sécurité IDOR : destroyMedia et downloadMedia sur pièces moteur

**Bug de sécurité corrigé**

- `app/controllers/boat_engine_parts_controller.ts` — `destroyMedia` et `downloadMedia` validaient uniquement le `boatId` via `loadBoat`, sans vérifier que l'`engineId` appartient bien au bateau ni que le `partId` appartient à cet engine. Un utilisateur pouvait forger l'URL pour lire ou supprimer des fichiers d'une autre organisation.
- Ajout des mêmes guards que dans `storeDocument` : `boat.engines.find(e.id === engineId)` puis `equipmentService.findEnginePart(engineId, partId)` avant toute opération.
- 7 tests fonctionnels ajoutés dans `tests/functional/boats/boat_engine_parts_media.spec.ts` couvrant le cas nominal et les deux vecteurs IDOR (engineId cross-org et partId cross-engine) pour les deux actions.
