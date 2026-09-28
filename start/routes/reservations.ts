import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ReservationsController = () => import('#controllers/reservations_controller')
const FleetExportsController = () => import('#controllers/fleet_exports_controller')

router
  .group(() => {
    router.get('reservations', [ReservationsController, 'index']).as('reservations.index')
    // Export des réservations de la flotte, avec période (#879).
    router
      .get('reservations/export.csv', [FleetExportsController, 'reservations'])
      .as('reservations.export')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'reservations' })])
