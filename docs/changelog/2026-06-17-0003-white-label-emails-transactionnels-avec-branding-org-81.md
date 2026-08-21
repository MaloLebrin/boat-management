# 2026-06-17 — White-label emails transactionnels avec branding org #81

**Backend**

- `shared/types/branding.ts` — ajout de `BrandingEmailParams` (`appName`, `primaryColor`, `logoUrl`).
- `app/services/branding_service.ts` — méthode `toEmailParams(org)` : retourne `BrandingEmailParams | null` (null si plan non-Enterprise).
- `app/services/email_queue_service.ts` — ajout du paramètre optionnel `branding?: BrandingEmailParams | null` sur les 11 méthodes org-spécifiques (`sendInvitation`, `sendStorageQuotaWarning`, `sendAiTokenQuotaWarning`, `sendPlanDowngradeNotification`, tous les `sendReminder*`). Le branding est passé à `edge.render()`.
- Callers mis à jour :
  - `app/controllers/organization_invitations_controller.ts` — passe `this.brandingService.toEmailParams(user.organization)`.
  - `app/listeners/send_storage_quota_notification.ts` — passe le branding de l'org de l'event.
  - `app/listeners/send_ai_token_quota_notification.ts` — idem.
  - `app/listeners/on_organization_plan_downgraded.ts` — idem.
  - `app/services/reminder_email_service.ts` — charge l'org par `Organization.find(orgId)` (en parallèle avec les admins) pour injecter le branding dans tous les reminders.

**Template**

- `resources/views/emails/_layout.edge` — header dynamique : `branding.primaryColor ?? '#1e3a5f'` pour la couleur, logo Cloudinary si `branding.logoUrl`, sinon `branding.appName ?? 'FleetAi'` en texte. Footer utilise `appName` avec fallback.
