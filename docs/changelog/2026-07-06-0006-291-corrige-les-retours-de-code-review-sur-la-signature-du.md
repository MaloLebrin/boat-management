# 2026-07-06 — [#291] Corrige les retours de code review sur la signature du contrat de location

Corrige trois problèmes relevés en review sur #291 :

- `rental_contracts_controller.ts#send` : `markSent()` (validation de la transition `draft → sent`) s'exécute désormais **avant** l'envoi de l'email — évite d'envoyer un email si la transition est invalide
- `rental_contracts_controller.ts#sign` : `RentalContractService.assertCanAttachSignedDocument()` (nouvelle méthode) valide la transition **avant** de supprimer l'ancien document Cloudinary et d'uploader le nouveau — évite un `Media` orphelin (DB + Cloudinary) si le contrat est encore `draft`
- Le contrat signé n'est plus exposé via l'URL Cloudinary publique brute (`mediaSecureUrl`) : nouvelle route authentifiée `GET .../contract/signed-document` (`downloadSignedDocument`, calquée sur `downloadPdf`/`BoatMediaController#downloadMedia`) qui télécharge le fichier via `private_download_url` ; le transformer expose `hasSignedDocument: boolean` à la place
- `send_rental_contract_email.ts` : remplace le ternaire `locale === 'fr' ? ... : ...` par `i18n.t('rentalContracts.email.*')` (clés ajoutées en/fr) pour le sujet et le corps du texte de l'email

- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` — non-envoi d'un second email sur transition invalide, téléchargement du document signé authentifié, redirection si aucun document signé
