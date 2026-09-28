import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const MaintenanceHistoryController = () => import('#controllers/maintenance_history_controller')
const MaintenanceHistoryPdfController = () =>
  import('#controllers/maintenance_history_pdf_controller')
const FleetExportsController = () => import('#controllers/fleet_exports_controller')

router
  .group(() => {
    router.get('maintenance', ({ response }) => response.redirect().toPath('/maintenance/history'))

    router
      .get('maintenance/history', [MaintenanceHistoryController, 'index'])
      .as('maintenance.history')
    router
      .get('maintenance/history.pdf', [MaintenanceHistoryPdfController, 'download'])
      .as('maintenance.history.pdf')
    // Même filtres que l'écran, en CSV (#879).
    router
      .get('maintenance/history.csv', [FleetExportsController, 'maintenanceHistory'])
      .as('maintenance.history.csv')
  })
  .use(middleware.auth())
