# Domaine — Notifications

## Objectif fonctionnel

Informer un utilisateur d'événements le concernant au sein de son organisation (quota atteint, changement de plan, nouveau membre, module désactivé…), avec :

- une **cloche** dans le layout authentifié (badge de non-lus + panneau des 5 dernières),
- une **page complète** paginée (`/notifications`),
- une **livraison temps réel** (Server-Sent Events via `@adonisjs/transmit`) : une notification créée côté serveur apparaît instantanément dans l'onglet ouvert de l'utilisateur, sans rechargement.

Les notifications sont **par utilisateur** (`user_id`) et rattachées à une **organisation** (`organization_id`).

## Vue d'ensemble du flux

```
Événement métier (ex: quota stockage franchi)
        │  emitter.emit(StorageThresholdCrossed)
        ▼
Listener (#listeners/…)  ──►  NotificationService.create(params)
        │                          │
        │                          ├─► INSERT en base (table notifications)
        │                          └─► transmit.broadcast(`notifications/:userId`, { notification })
        ▼                                      │ (SSE)
(certains listeners envoient                   ▼
 aussi un email en parallèle)          Client abonné (use_notifications.ts)
                                               │  storedUnreadCount++ ; storedRecent = [notif, …]
                                               ▼
                                       Cloche (NotificationBell) + panneau réactifs
```

En parallèle du temps réel, à **chaque rendu de page Inertia**, le middleware partage l'état courant (`unreadCount` + 5 dernières) — l'UI est donc correcte même sans SSE (fallback), et se resynchronise à chaque navigation.

## Modèle de données

Références : `app/models/notification.ts`, migrations `database/migrations/1782000000000_create_notifications_table.ts` (+ `…0001` pour l'index `user_id, created_at`).

Table `notifications` :

| Colonne           | Type          | Notes                                                               |
| ----------------- | ------------- | ------------------------------------------------------------------- |
| `id`              | increments    | PK                                                                  |
| `user_id`         | int FK        | → `users.id`, `ON DELETE CASCADE`                                   |
| `organization_id` | int FK        | → `organizations.id`, `ON DELETE CASCADE`                           |
| `type`            | string(100)   | identifiant métier (voir `NotificationType`)                        |
| `severity`        | string(20)    | `info` \| `success` \| `warning` \| `error` (défaut `info`)         |
| `title`           | string(500)   | requis, déjà localisé à la création                                 |
| `body`            | text nullable | corps optionnel, déjà localisé                                      |
| `action_url`      | string(1000)  | lien de destination au clic (ex: `/settings/billing`)               |
| `metadata`        | json nullable | données libres (sérialisées via `prepare`/`consume` dans le modèle) |
| `read_at`         | timestamp     | `null` tant que non lue                                             |
| `created_at`      | timestamp     | `autoCreate`                                                        |

- Getter dérivé `isRead` = `readAt !== null` (pas de colonne dédiée).
- Index : `(user_id, read_at)` (comptage/liste des non-lues) et `(organization_id, created_at)` + `(user_id, created_at)` (tri chronologique).
- Relations `belongsTo` : `user`, `organization`.

> Il n'existe **pas** de `updated_at` : une notification est immuable après création (seul `read_at` évolue).

## Types partagés

Référence : `shared/types/notification.ts` (importé côté backend **et** frontend).

- `NotificationType` — union ouverte (`… | (string & {})`) : liste tous les types connus tout en restant **extensible sans casser le typage**.
- `NotificationSeverity` — `'info' | 'success' | 'warning' | 'error'` ; pilote l'icône et la couleur (`use_notification_helpers.ts`).
- `NotificationForFront` — forme envoyée au front (dates en ISO string, `isRead` inclus).
- `NotificationsSharedProps` — `{ unreadCount, recent }` partagé par le middleware.
- `NotificationsPage` — `{ data, meta }` pour la page paginée.
- `CreateNotificationParams` — contrat d'entrée de `NotificationService.create()`.

## Service

Référence : `app/services/notification_service.ts`.

- `create(params)` — insère la notification puis **broadcast SSE** sur `notifications/:userId`. Le broadcast est encadré d'un `try/catch` : un échec de diffusion est **loggé en warning** et n'empêche jamais la persistance (dégradation gracieuse).
- `getUnreadCount(userId)` — nombre de non-lues.
- `getRecentUnread(userId, limit = 5)` — dernières non-lues (tri `created_at desc`).
- `sharedProps(userId)` — `{ unreadCount, recent }` (les deux requêtes en parallèle) pour le middleware Inertia.
- `listForUser(userId, page, perPage = 20)` — liste paginée (lues **et** non-lues) pour la page.
- `markRead(userId, id)` — marque une notif comme lue (scopée à `userId`, `firstOrFail`), idempotent (ne réécrit pas `readAt` si déjà lue).
- `markAllRead(userId)` — passe toutes les non-lues à lues en un `UPDATE`.
- `destroy(userId, id)` — suppression scopée à `userId`.

Toutes les méthodes de mutation sont **scopées par `userId`** : un utilisateur ne peut jamais lire/modifier/supprimer la notification d'un autre.

## Sources de notifications (events → listeners)

Les notifications sont produites par des **listeners** branchés sur des events métier (`start/events.ts`). Le titre/corps sont **localisés à la création** via `i18nManager` (namespace `notifications.messages.*`, cf. `resources/lang/{en,fr}/notifications.json`).

| Event                           | Listener                             | `type`               | `severity`           | `actionUrl`         |
| ------------------------------- | ------------------------------------ | -------------------- | -------------------- | ------------------- |
| `StorageThresholdCrossed`       | `send_storage_quota_notification`    | `quota.storage`      | `warning` / `error`¹ | `/settings/billing` |
| `AiTokenThresholdCrossed`       | `send_ai_token_quota_notification`   | `quota.ai_tokens`    | `warning` / `error`¹ | `/settings/billing` |
| `OrganizationMemberJoined`      | `on_organization_member_joined`      | `member.joined`      | `info`               | `/settings/members` |
| `OrganizationModuleDeactivated` | `on_organization_module_deactivated` | `module.deactivated` | `warning`            | `/settings/billing` |
| `OrganizationPlanDowngraded`    | `on_organization_plan_downgraded`    | `plan.downgraded`    | `warning`            | `/settings/billing` |

¹ `error` dès que `percent >= 100`, sinon `warning`.

Les listeners quota destinent la notification aux **admins** de l'organisation, et envoient en parallèle un email (`EmailQueueService`). D'autres `NotificationType` sont déjà déclarés dans le type (`maintenance.*`, `document.*`, `safety_equipment.*`, `member.removed`, `plan.upgraded`, `invitation.accepted`) en prévision de futurs producteurs.

## Exposition au frontend (shared props)

Référence : `app/middleware/inertia_middleware.ts` (`share()`).

À chaque rendu Inertia, si un utilisateur est authentifié, le middleware ajoute la prop partagée :

```ts
// prop partagée `notifications`, via NotificationService.sharedProps(user.id)
const notifications = { unreadCount, recent }
```

(sinon `{ unreadCount: 0, recent: [] }`). C'est la **source de vérité au chargement** ; le composable `use_notifications.ts` la synchronise dans son état réactif à chaque navigation.

## Temps réel (SSE / Transmit)

Références : `config/transmit.ts`, `start/transmit.ts`, `inertia/composables/use_notifications.ts`.

- **Serveur** : `transmit.registerRoutes()` expose les endpoints SSE ; le canal `notifications/:userId` est **autorisé uniquement** si `ctx.auth.user?.id === Number(userId)` (`transmit.authorize`). `pingInterval: 30s`, `transport: null` (broadcast direct, mono-instance — voir « Points d'attention »).
- **Client** (`use_notifications.ts`) : état **singleton au niveau module** (`storedUnreadCount`, `storedRecent`) qui survit aux navigations Inertia. Au `onMounted`, si un `user.id` est présent et pas déjà abonné, création d'un abonnement `Transmit` sur `notifications/${user.id}`. À chaque message reçu : `unreadCount++` et insertion en tête de `recent` (tronqué à 5).
  - Le CSRF est ajouté manuellement aux requêtes d'abonnement (`beforeSubscribe`/`beforeUnsubscribe`) — c'est **l'exception documentée** au « pas de CSRF manuel » de `CLAUDE.md`, car Transmit n'est pas une visite Inertia.
  - Changement d'utilisateur (logout/login sans reload) → `resetSubscription()` puis remise à zéro de l'état.

## Routes HTTP

Référence : `start/routes/notifications.ts` (groupe sous `middleware.auth()`).

| Méthode & chemin                | Action                      | Nom de route                  |
| ------------------------------- | --------------------------- | ----------------------------- |
| `GET /notifications`            | page paginée                | `notifications.index`         |
| `PATCH /notifications/read-all` | tout marquer comme lu       | `notifications.markAllAsRead` |
| `PATCH /notifications/:id/read` | marquer une notif comme lue | `notifications.markAsRead`    |
| `DELETE /notifications/:id`     | supprimer une notif         | `notifications.destroy`       |

Toutes ces routes sont appelées depuis l'UI Inertia (`router.patch`/`router.delete`) et répondent par **redirection** (`response.redirect().back()`), conformément aux conventions Inertia du projet. `index` valide `page` via `notificationPageValidator` (VineJS). Les actions `:id` valident que l'id est un entier ≥ 1 (sinon `redirect().back()` silencieux).

## Frontend

Références : `inertia/components/layout/`, `inertia/pages/notifications/index.vue`, `inertia/composables/`.

- **`NotificationBell.vue`** — cloche + badge de non-lus (`9+` au-delà de 9). Ouvre `NotificationPanel`. Props :
  - `align` (`'left' | 'right'`, défaut `right`) — sens d'ouverture du panneau (transmis à `NotificationPanel`, classe `left-0`/`right-0`) ; évite le débordement hors-écran depuis une sidebar étroite.
  - `tone` (`'default' | 'onDark'`, défaut `default`) — contraste de l'icône (fond clair vs fond navy).
  - Montée dans **`AsideMenu.vue`** (sidebar desktop, `align="left" tone="onDark"`) **et** dans le header mobile de **`layouts/default.vue`** (`tone="onDark"`).
- **`NotificationPanel.vue`** — panneau déroulant : 5 dernières (`recentNotifications`), « Tout marquer comme lu », clic sur un item → `PATCH …/read` puis navigation vers `actionUrl`, lien « Voir toutes les notifications » → `/notifications`.
- **`pages/notifications/index.vue`** — liste paginée (lues + non-lues), actions par item (marquer lu / supprimer), pagination (`use_pagination`), empty state.
- **Composables**
  - `use_notifications.ts` — état réactif (`unreadCount`, `recentNotifications`, `hasUnread`) + abonnement SSE (voir plus haut).
  - `use_notification_helpers.ts` — `formatRelativeTime(iso)` (« À l'instant », « Il y a N min/h/j ») et `getSeverityClasses(severity)` (couleurs de l'icône).

## Internationalisation

Références : `resources/lang/{en,fr}/notifications.json`. Le namespace `notifications` est passé au front dans `appT` (il n'est **pas** dans les namespaces backend-only `flash`/`marketing`/`validator`).

- `notifications.messages.*` — titres/corps **des notifications elles-mêmes**, formatés côté **backend** au moment de la création (interpolation ICU : `{percent}`, `{orgName}`, `{memberName}`, `{module}`, `{fromPlan}`, `{toPlan}`…).
- Clés UI : `title`, `empty`, `emptyDescription`, `markAllRead`, `markRead`, `delete`, `viewAll`, `unreadCount`, `time.*`, `types.*`.

## Points d'attention

- **Mono-instance** : `config/transmit.ts` utilise `transport: null`. En scale-out (plusieurs process/instances), un `broadcast` n'atteint que les clients connectés à la même instance. Prévoir un transport partagé (Redis) pour le SSE multi-instances. Le fallback shared-props (rechargement à chaque navigation) reste correct dans tous les cas.
- **Titres non re-traduits** : `title`/`body` sont figés dans la langue active à la création. Changer de langue ne re-traduit pas les notifications existantes (choix assumé — données historisées).
- **Broadcast best-effort** : un échec SSE n'échoue jamais la création (loggé en warning).
- **Isolation** : toute mutation/lecture est scopée par `user_id` ; le canal SSE est autorisé au seul propriétaire.

## Étendre : ajouter un nouveau type de notification

1. Ajouter le `type` à l'union `NotificationType` (`shared/types/notification.ts`) — facultatif grâce à `(string & {})`, mais recommandé pour l'autocomplétion.
2. (Si nouvel événement) créer l'`Event` dans `app/events/` et l'émettre là où l'événement métier se produit.
3. Créer un **listener** dans `app/listeners/` qui appelle `notificationService.create({ userId, organizationId, type, severity, title, body, actionUrl, metadata })`. Localiser `title`/`body` via `i18nManager` (ajouter les clés `notifications.messages.<type>.*` dans **`en` et `fr`**).
4. Brancher le listener dans `start/events.ts` (`emitter.listen`).
5. Ajouter la clé d'affichage `notifications.types.<type>` (en/fr).
6. Écrire les tests (voir ci-dessous) et documenter dans `docs/changelog.md`.

Aucune modification frontend n'est nécessaire : la cloche, le panneau et la page consomment génériquement `NotificationForFront`.

## Tests

Référence : `tests/functional/notifications/notifications.spec.ts` (marquage lu unitaire/global, cohérence `readAt` en `DateTime` Luxon, non-régression sur les déjà-lues, exigence d'authentification) et `tests/inertia/notification_bell.spec.ts` (badge, cap `9+`, ouverture/fermeture du panneau, props `align`/`tone`).
