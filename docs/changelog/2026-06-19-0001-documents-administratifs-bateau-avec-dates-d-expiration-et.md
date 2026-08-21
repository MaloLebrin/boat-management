# 2026-06-19 — Documents administratifs bateau avec dates d'expiration et alertes #103

**Backend**

- `database/migrations/1796000000000_create_boat_documents_table.ts` — table `boat_documents` : `type` (enum), `custom_type_label`, `reference_number`, `issued_at`, `expires_at`, `issuer`, `media_id` (FK nullable → media), `notes`
- `app/models/boat_document.ts` — modèle Lucid avec relations `boat` et `media`
- `app/services/boat_document_service.ts` — CRUD + calcul du statut (valid / expiring_soon / expired) + `getExpiringDocuments(daysAhead)`
- `app/controllers/boat_documents_controller.ts` — routes POST/PUT/DELETE `/boats/:boatId/admin-documents[/:documentId]`
- `app/validators/boat_document.ts` — validation VineJS (type enum, dates nullable)
- `app/exceptions/boat_document_errors.ts` — `BoatDocumentNotFoundError`
- `shared/types/boat_document.ts` — types partagés : `BoatDocumentType`, `BoatDocumentRow`, `ReminderDocumentItem`
- `shared/constants/media.ts` — ajout de `'boat_document'` dans `MEDIA_ENTITY_TYPES`
- `app/services/reminder_email_service.ts` — `sendDocumentExpirationReminders(30|7)` : alertes email 30 j et 7 j avant expiration
- `app/services/email_queue_service.ts` — `sendReminderDocumentExpiry()` + template `reminder_document_expiry.edge`
- `app/jobs/send_reminder_emails.ts` — appel des deux nouvelles méthodes
- Types disponibles : francisation, assurance, permis de navigation, licence radio VHF, certificat de sécurité, jauge, certificat CE, rôle d'équipage, autre

**Frontend**

- Onglet "Documents admin." ajouté à la fiche bateau (`show.vue`) avec badge si des documents expirent bientôt / sont expirés
- `BoatShowTabAdminDocs.vue` — liste des documents avec statut coloré, actions modifier/supprimer
- `BoatAdminDocumentFormModal.vue` — modal création / édition (type, référence, dates, organisme, notes)
- Clés i18n ajoutées dans `fr/boats.json` et `en/boats.json` (namespace `adminDocs`)
- Flash messages `boatDocument.*` dans `fr/flash.json` et `en/flash.json`
