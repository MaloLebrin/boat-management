# 2026-06-29 — [F-03] Suppression d'un document administratif nettoyait pas Cloudinary

**Bug corrigé**

- `app/services/boat_document_service.ts` : `BoatDocumentService` injecte désormais `MediaService` via `@inject()` ; `delete()` appelle `mediaService.deleteById(doc.mediaId, org)` avant `doc.delete()` si un media est associé — plus de fichiers orphelins sur Cloudinary, plus d'enregistrements `media` fantômes, quota décrémenté correctement
- `database/factories/boat_document_factory.ts` : nouvelle factory `BoatDocumentFactory`
- Tests : 5 tests fonctionnels couvrant suppression sans media, suppression avec media (Cloudinary mocké), document inexistant, accès non authentifié, accès inter-org
