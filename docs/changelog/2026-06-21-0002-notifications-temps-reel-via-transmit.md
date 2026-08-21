# 2026-06-21 — Notifications temps réel via Transmit

**Backend**

- `config/transmit.ts` — configuration de `@adonisjs/transmit` (transport in-process, no ping)
- `start/transmit.ts` — preload : enregistrement des routes SSE (`/__transmit/events`, `/__transmit/subscribe`, `/__transmit/unsubscribe`) + autorisation de canal `notifications/:userId` (seul le propriétaire peut s'abonner)
- `adonisrc.ts` — ajout du provider `@adonisjs/transmit/transmit_provider` et du preload `start/transmit`
- `app/services/notification_service.ts` — après `Notification.create()`, diffusion SSE sur le canal `notifications/:userId` avec le payload `{ notification: NotificationForFront }`

**Frontend**

- `inertia/composables/use_notifications.ts` — état réactif au niveau module (singleton) + abonnement Transmit dans `onMounted` (connexion unique par session, guard par `subscribedUserId`) ; synchronisation avec les shared props Inertia à chaque navigation ; CSRF géré via `beforeSubscribe`/`beforeUnsubscribe` (ajout du header `X-XSRF-TOKEN` lu depuis le cookie `XSRF-TOKEN`) ; reset automatique de la souscription en cas de changement d'utilisateur (logout/login sans rechargement de page)

**Comportement**

- Connexion SSE établie automatiquement après le premier montage d'un composant authentifié utilisant `useNotifications()`
- Le badge de la cloche se met à jour en temps réel sans rechargement de page
- Le panneau de notifications ajoute la nouvelle notification en tête de liste (max 5 récentes)
- Fallback gracieux : si la connexion Transmit échoue, les données restent synchronisées via les shared props Inertia à chaque navigation
