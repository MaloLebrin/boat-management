# 2026-06-19 — Correctifs documents administratifs bateau (#103 suite)

**Correctifs bloquants**

- `app/jobs/send_reminder_emails.ts` — fenêtres d'envoi exclusives : `(8, 30)` + `(0, 7)` — supprime le double envoi pour les documents expirant dans ≤7 jours
- `app/services/boat_document_service.ts` — `toReminderItem` : guard null sur `expiresAt` avant l'assertion ; `getExpiringDocuments(fromDaysAhead, toDaysAhead)` : borne inférieure `>=` (documents expirant aujourd'hui inclus)
- `inertia/components/boats/show/tabs/BoatShowTabAdminDocs.vue` — remplacement du `<button>` brut par `<BaseButton>` (convention projet)

**Correctifs importants**

- `database/migrations/1796000001000_add_index_boat_documents_expires_at.ts` — index sur `expires_at` (requête cron quotidienne)
- `app/validators/boat_document.ts` — factory `boatDocumentFields()` partagée entre create et update
- `app/services/reminder_email_service.ts` — injection de `BoatDocumentService` ; suppression de la requête et du mapping dupliqués ; utilisation de `getExpiringDocuments` + `toReminderItem`
- `app/transformers/boat_transformer.ts` + `app/controllers/boats_controller.ts` + `inertia/pages/boats/show.vue` — `canManageDocuments` découplé de `canManageEquipment`

**Suggestions appliquées**

- `shared/constants/boats/boat_document_constants.ts` — constante `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS = 30` partagée entre service et job
- `inertia/components/base/BaseBadge.vue` — variante `danger` ajoutée ; `expired` → `'danger'` dans `statusVariant`
- `resources/views/emails/reminder_document_expiry.edge` — suppression du `.slice(0, 10)` redondant sur `expiresAt`
