import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NotificationsController = () => import('#controllers/notifications_controller')

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
