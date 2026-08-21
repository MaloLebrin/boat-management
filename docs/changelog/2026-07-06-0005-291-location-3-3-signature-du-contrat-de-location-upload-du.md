# 2026-07-06 — [#291] Location 3/3 : signature du contrat de location (upload du PDF signé)

**Troisième et dernière PR de l'epic #283 (Contrats de location & états des lieux)**, après #290. Finalise le cycle de vie du contrat : upload du contrat signé (scanné/PDF), rattaché à `rental_contracts.media_id` (colonne réservée par #290), avec passage automatique au statut `signed` + `signed_at`. La signature électronique intégrée reste hors périmètre (mentionnée comme optionnelle dans l'issue).

- **Backend** :
  - `shared/constants/media.ts` : nouveau type d'entité média `'rentalContract'` ; `CloudinaryFolders.rentalContractSignedDocument` (`app/services/cloudinary_service.ts`)
  - `app/models/rental_contract.ts` : relation `belongsTo(Media)`
  - `app/services/rental_contract_service.ts` : `attachSignedDocument()` remplace l'ancien `markSigned()` sans preuve — attache le `media_id` uploadé, statut `sent → signed` (ou remplacement du document si déjà `signed`, sans réinitialiser `signed_at`) ; `deleteForReservation()` nettoie désormais le document signé (Cloudinary + quota) à la suppression du contrat
  - `app/validators/rental_contract.ts` (nouveau) : `storeSignedRentalContractValidator` (PDF, 20 Mo max)
  - `app/controllers/rental_contracts_controller.ts#sign` : accepte désormais un upload multipart (remplace l'ancien document si un nouveau est envoyé), délègue à `MediaService`
  - `shared/types/rental_contract.ts` / `app/transformers/rental_contract_transformer.ts` : `mediaSecureUrl`/`mediaFilename` exposés au frontend
- **Frontend** : `ContractPanel.vue` — le bouton « Marquer comme signé » est remplacé par un envoi de fichier (upload/remplacement du contrat signé) ; lien « Voir le contrat signé » une fois disponible
- **i18n** : clés `rentalContracts.actions.{uploadSigned,replaceSigned,viewSigned}` (en/fr)
- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` — upload multipart (mock Cloudinary), refus si contrat encore `draft`, remplacement d'un document déjà signé, nettoyage du média à la suppression du contrat
