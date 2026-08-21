# 2026-06-16 — Refactor : event StorageThresholdCrossed pour découpler les notifications de quota stockage

**Backend**

- `app/events/storage_threshold_crossed.ts` (nouveau) — event `StorageThresholdCrossed` dispatché quand l'usage stockage franchit 80 % ou 100 % du quota.
- `app/listeners/send_storage_quota_notification.ts` (nouveau) — listener qui charge les admins de l'organisation et enqueue les emails via `EmailQueueService`.
- `app/services/quota_service.ts` — `updateStorageUsed` dispatche désormais `StorageThresholdCrossed.dispatch()` au lieu d'appeler `sendStorageQuotaNotification` directement ; suppression de `emailQueueService` comme dépendance du service.
- `start/events.ts` — wiring `StorageThresholdCrossed` → `SendStorageQuotaNotification`.
