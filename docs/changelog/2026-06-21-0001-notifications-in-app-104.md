# 2026-06-21 — Notifications in-app #104

**Backend**

- `database/migrations/1798000000000_create_notifications_table.ts` — table `notifications` : `user_id` (FK CASCADE), `organization_id` (FK CASCADE), `type` (string 100), `severity` (string 20, default 'info'), `title` (string 500), `body` (text nullable), `action_url` (string 1000 nullable), `metadata` (json nullable), `read_at` (timestamp nullable), `created_at` (timestamp). Index sur `(user_id, read_at)` et `(organization_id, created_at)`
- `app/models/notification.ts` — modèle Lucid avec relations `belongsTo(User)` et `belongsTo(Organization)`, getter `isRead`
- `shared/types/notification.ts` — types `NotificationType` (extensible), `NotificationSeverity`, `NotificationForFront`, `NotificationsSharedProps`, `NotificationsPage`, `CreateNotificationParams`
- `app/transformers/notification_transformer.ts` — fonction `toRow()` pour le frontend
- `app/services/notification_service.ts` — `create`, `getUnreadCount`, `getRecentUnread`, `sharedProps`, `listForUser`, `markRead`, `markAllRead`, `destroy`
- `app/controllers/notifications_controller.ts` — `index` (page paginée), `markAsRead`, `markAllAsRead`, `destroy` ; réponses par redirection
- `start/routes/notifications.ts` — routes `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`
- `app/middleware/inertia_middleware.ts` — injection de `NotificationService`, prop partagée `notifications` (unreadCount + recent) pour les utilisateurs authentifiés
- `app/listeners/send_ai_token_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/send_storage_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/on_organization_member_joined.ts` — notification aux admins quand un membre rejoint l'organisation
- `app/listeners/on_organization_plan_downgraded.ts` — notification aux admins en plus de l'email
- `resources/lang/fr/notifications.json` et `resources/lang/en/notifications.json` — toutes les clés UI du module

**Frontend**

- `inertia/pages/notifications/index.vue` — page de liste des notifications avec pagination, actions mark as read / delete
