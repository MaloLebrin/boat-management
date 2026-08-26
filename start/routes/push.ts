import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { pushThrottle } from '#start/limiter'

const PushSubscriptionsController = () => import('#controllers/push_subscriptions_controller')

router
  .group(() => {
    router
      .post('push/subscriptions', [PushSubscriptionsController, 'store'])
      .as('push.subscriptions.store')
    // Le navigateur ne connaît que son endpoint — désabonnement par corps de
    // requête, distinct de la suppression par id de l'écran de gestion (#498)
    router
      .delete('push/subscriptions', [PushSubscriptionsController, 'destroyByEndpoint'])
      .as('push.subscriptions.destroyByEndpoint')
    router
      .delete('push/subscriptions/:id', [PushSubscriptionsController, 'destroy'])
      .as('push.subscriptions.destroy')
  })
  .use([middleware.auth(), pushThrottle])
