import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NotificationsController = () => import('#controllers/notifications_controller')
const NotificationPreferencesController = () =>
  import('#controllers/notification_preferences_controller')

router
  .group(() => {
    router.get('notifications', [NotificationsController, 'index']).as('notifications.index')
    router
      .patch('notifications/read-all', [NotificationsController, 'markAllAsRead'])
      .as('notifications.markAllAsRead')
    router
      .patch('notifications/:id/read', [NotificationsController, 'markAsRead'])
      .as('notifications.markAsRead')
    router
      .delete('notifications/:id', [NotificationsController, 'destroy'])
      .as('notifications.destroy')
  })
  .use(middleware.auth())

// Désinscription en un clic depuis le pied d'un e-mail (#888) : jeton signé
// (utilisateur, famille), pas de session — le destinataire peut lire ses
// e-mails sans être connecté.
router
  .get('notifications/unsubscribe/:token', [
    NotificationPreferencesController,
    'confirmUnsubscribe',
  ])
  .as('notifications.unsubscribe')
router
  .post('notifications/unsubscribe/:token', [NotificationPreferencesController, 'unsubscribe'])
  .as('notifications.unsubscribe.confirm')
