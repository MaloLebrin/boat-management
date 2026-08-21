# 2026-06-30 — [#153] Sécurité IDOR : suppression de médias scopée par entité

**Bug de sécurité corrigé**

- `app/services/media_service.ts` — `deleteById()` renommé en `deleteForEntity(mediaId, entityType, entityId, org)`. Le lookup bare par PK (`Media.find`) est remplacé par un filtre sur `entityType` + `entityId`, identique à `getForEntity()`. Un utilisateur ne peut désormais plus supprimer un media appartenant à un autre bateau ou une autre organisation en injectant un `mediaId` arbitraire dans la route.
- `app/controllers/boat_media_controller.ts` — `destroy()` et `destroyEngineMedia()` passent désormais `entityType` et `entityId` à `deleteForEntity`.
- `app/controllers/boat_engine_parts_controller.ts` — `destroyMedia()` idem.
- `app/services/boat_document_service.ts` — `delete()` passe `entityType: 'boat'` et `entityId: doc.boatId` à `deleteForEntity`.
- **Tests** : `tests/functional/boats/boat_media.spec.ts` — 4 cas dont le scénario IDOR cross-org.
