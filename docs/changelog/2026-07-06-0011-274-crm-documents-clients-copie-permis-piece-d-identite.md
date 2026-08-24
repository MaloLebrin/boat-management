# 2026-07-06 — [#274] CRM : documents clients (copie permis, pièce d'identité)

Lot 2/4 de l'epic CRM léger (#108). Ajoute la gestion de documents rattachés à une fiche client, en réutilisant le sous-système média polymorphe existant.

- **Média** : `'client'` ajouté à `MEDIA_ENTITY_TYPES` (`shared/constants/media.ts`) ; nouveau dossier `CloudinaryFolders.clientDocuments(orgSlug, clientId)`.
- **Contrôleur** : nouveau `app/controllers/client_media_controller.ts` (`storeDocument` / `destroy` / `downloadMedia`) — org-scopé, gaté plan Enterprise, ACL `ClientPolicy.update`, réutilise `mediaService.upload/deleteForEntity/getForEntity` et `storeBoatDocumentValidator`.
- **Routes** : `POST /clients/:id/documents`, `DELETE /clients/:id/media/:mediaId`, `GET /clients/:id/media/:mediaId/download`.
- **Cleanup** : `ClientService.delete(org, client)` supprime désormais les médias (Cloudinary + quota stockage) via `mediaService.deleteAllForEntity` avant de supprimer la ligne.
- **Fiche client** : le contrôleur `show` charge et expose les documents (`toMediaRow`, nouveau `app/transformers/media_row_transformer.ts`) + un flag `canManage`.
- **Frontend** : section « Documents » sur la fiche (`inertia/components/clients/ClientDocuments.vue` + `ClientDocumentAddModal.vue`) — upload multipart, liste, téléchargement, suppression confirmée.
- **i18n** : clés `clients.documents.*` (en + fr) + `flash.clients.documentAdded` / `documentDeleted`.
- **Tests** : fonctionnels `tests/functional/clients/client_documents.spec.ts` (upload, liste, suppression + cleanup Cloudinary, IDOR, refus non-Enterprise, download) ; Vitest `tests/inertia/client_documents.spec.ts`.
