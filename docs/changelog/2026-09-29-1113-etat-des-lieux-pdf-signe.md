# 2026-09-29 — État des lieux : PDF signé par le client, figé, envoyé par e-mail (#889)

Le module Location faisait déjà l'état des lieux de départ et de retour
(checklist, photos, comparaison, défauts), mais tout restait dans l'app : rien à
donner au client, rien à opposer à une contestation de caution. Chaque
inspection produit maintenant un PDF, se signe sur place par les deux parties,
se fige et part chez le client.

- **PDF.** `GET /boats/:boatId/reservations/:reservationId/inspections/:inspectionId/pdf`
  (`?inline=1` pour l'ouvrir dans le navigateur). `InspectionPdfService`
  (pdfkit, marque blanche Entreprise) : bateau, période, client, relevés,
  checklist par zone avec notes et décompte, écarts avec le départ pour un
  retour (dégradations en évidence), défauts, jusqu'à 12 vignettes photos
  (JPEG redimensionné par Cloudinary, photo manquante omise et comptée), cadres
  de signature. Non signé, le document porte la mention « BROUILLON ». Contenu
  calculé par `shared/helpers/inspection_report.ts`.
- **Signature.** `POST …/sign` : nom du client + deux tracés PNG capturés sur un
  pad canvas (`SignaturePad.vue`), le nom de l'agent étant celui du compte. Les
  octets sont vérifiés (signature PNG), le PDF signé est produit et archivé
  (`media`, dossier `…/inspections/<kind>/signed`) **avant** l'écriture en base,
  puis la transaction crée les signatures et pose le verrou. Nouvelle table
  `boat_inspection_signatures` (tracés en bytea, jamais envoyés au frontend) ;
  nouvelles colonnes `boat_inspections.locked_at`, `locked_by_id`,
  `pdf_media_id`, `sent_at`.
- **Verrou.** Une inspection signée refuse toute modification — relevés,
  constats, photos, défauts levés depuis elle, suppression — avec
  `flash.inspections.locked`, et l'écran masque ces gestes. Le PDF servi est
  désormais l'archive signée.
- **Envoi.** `POST …/send` (e-mail vérifié exigé) : PDF signé en pièce jointe
  (job `SendInspectionEmail`, gabarit `emails/inspection.edge`), à l'adresse de
  la réservation ou de la fiche client ; refusé avant signature ou sans
  adresse. `sent_at` date le dernier envoi, renvoi possible.
- **Écran.** `InspectionDocumentBar.vue` en tête de chaque panneau : statut,
  PDF, « Faire signer » (`InspectionSignModal.vue`), « Envoyer / Renvoyer au
  client ». Signature indisponible hors-ligne, message à l'appui.
- **Permissions.** PDF : `inspections.view` ; signer et envoyer :
  `inspections.edit`. Routes sous la garde du module Location.
- **Limites.** Pas de signature à distance ni de signature qualifiée eIDAS ; le
  PDF signé n'apparaît pas encore dans les documents de la fiche client.
- **Tests.** Fonctionnels `tests/functional/boats/inspection_documents.spec.ts`
  (brouillon, inline, rôles, cross-org, signature, double signature, PNG
  invalide, verrou sur chaque geste, archive servie, envoi, sans e-mail),
  intégration `inspection_pdf_service.spec.ts` (départ, retour signé, retour
  sans départ, photo illisible, pagination) et `decodeSignature`, unitaires
  `inspection_report.spec.ts`, Vitest `signature_pad.spec.ts` et
  `inspection_document_bar.spec.ts`.
- **Docs.** `docs/domain/inspections.md` (section « État des lieux signé »),
  `docs/data/schema.md`, `docs/frontend/ui-map.md`, guide
  `docs/user-guide/etat-des-lieux-signe.md`.
