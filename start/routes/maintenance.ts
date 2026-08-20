import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const MaintenanceHistoryController = () => import('#controllers/maintenance_history_controller')
const MaintenanceHistoryPdfController = () =>
  import('#controllers/maintenance_history_pdf_controller')

router
  .group(() => {
    router.get('maintenance', ({ response }) => response.redirect().toPath('/maintenance/history'))

    router
      .get('maintenance/history', [MaintenanceHistoryController, 'index'])
      .as('maintenance.history')
    router
      .get('maintenance/history.pdf', [MaintenanceHistoryPdfController, 'download'])
      .as('maintenance.history.pdf')
  })
  .use(middleware.auth())
