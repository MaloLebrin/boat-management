import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ReportsController = () => import('#controllers/reports_controller')

// Reporting financier de flotte (#887).
router
  .group(() => {
    router.get('reports', [ReportsController, 'index']).as('reports.index')
    router.get('reports/export.csv', [ReportsController, 'export']).as('reports.export')
  })
  .use(middleware.auth())
