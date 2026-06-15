import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const MaintenanceHistoryController = () => import('#controllers/maintenance_history_controller')

router
  .group(() => {
    router.get('maintenance', ({ response }) => response.redirect().toPath('/maintenance/history'))

    router
      .get('maintenance/history', [MaintenanceHistoryController, 'index'])
      .as('maintenance.history')
  })
  .use(middleware.auth())
