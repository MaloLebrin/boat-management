import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ReservationsController = () => import('#controllers/reservations_controller')

router
  .group(() => {
    router.get('reservations', [ReservationsController, 'index']).as('reservations.index')
  })
  .use(middleware.auth())
