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

const FleetDigestUnsubscribeController = () =>
  import('#controllers/fleet_digest_unsubscribe_controller')

// Désinscription en un clic des rapports de flotte par e-mail (#871) : jeton
// signé (utilisateur, rapport), pas de session.
router
  .get('reports/digest/unsubscribe/:token', [FleetDigestUnsubscribeController, 'show'])
  .as('reports.digest.unsubscribe')
router
  .post('reports/digest/unsubscribe/:token', [FleetDigestUnsubscribeController, 'store'])
  .as('reports.digest.unsubscribe.confirm')
