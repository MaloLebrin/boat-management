# 2026-06-16 — Audit log — Pro (90 jours) & Enterprise (illimité) #71

**Backend**

- Table `audit_logs` (`organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`) avec index sur `(organization_id, created_at)`.
- `app/models/audit_log.ts` — modèle Lucid avec relations `user` et `organization`.
- `app/services/audit_log_service.ts` — `log()`, `list()` (pagination + filtres), `purgeExpired()`, `canAccessAuditLog()`.
- `app/controllers/audit_logs_controller.ts` — `GET /settings/audit-log` (pagination, filtres user/action).
- `app/jobs/purge_audit_logs.ts` — job de purge quotidien à 03h00 (Europe/Paris) des logs expirés.
- `shared/types/plan.ts` — ajout de `auditLogRetentionDays` dans `PlanQuotas` : Starter = 0 (pas d'accès), Pro = 90 jours, Enterprise = null (illimité).
- `shared/types/audit_log.ts` — types `AuditAction`, `AuditLogEntry`, `AuditLogFilters`, `AuditLogPage`.
- Actions tracées : `login`, `logout`, `boat.create`, `boat.update`, `boat.delete`, `member.add`, `member.remove`, `member.update_role`.
- Route : `GET /settings/audit-log` (alias `settings.auditLog`), protégée par auth + `OrganizationPolicy.viewAuditLog`.

**Frontend**

- `inertia/pages/settings/audit_log.vue` — page Inertia avec shell settings.
- `inertia/components/settings/tabs/SettingsAuditLogTab.vue` — tableau avec filtres (utilisateur, action) et pagination.
- `SettingsShell.vue` — onglet "Journal d'activité" visible pour Pro et Enterprise uniquement.
- Clés i18n `settings.auditLog.*` ajoutées en FR et EN.

---
