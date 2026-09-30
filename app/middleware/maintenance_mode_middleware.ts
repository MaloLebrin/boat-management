import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import type { NextFn } from '@adonisjs/core/types/http'
import MaintenanceMode, {
  MAINTENANCE_RETRY_AFTER_SECONDS,
  renderMaintenancePage,
} from '#services/maintenance_mode'

/**
 * Probe d'orchestration (#541). Elle doit continuer à répondre pendant une
 * maintenance planifiée : un 503 ici ferait recycler le process par la
 * plateforme. Si Postgres est vraiment tombé, `/up` renvoie déjà 503 de
 * lui-même (`HealthService`) — on ne masque pas cet état.
 */
const HEALTHCHECK_PATH = '/up'

/**
 * Répond 503 avant le body parser, la session et les props Inertia (#864).
 *
 * Résolu via le conteneur à chaque requête pour que `app.container.swap`
 * dans les tests remplace la bascule sans redémarrer le process.
 */
export default class MaintenanceModeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const path = ctx.request.url().split('?')[0]
    if (path === HEALTHCHECK_PATH) return next()

    const gate = await app.container.make(MaintenanceMode)
    if (!gate.isEnabled()) return next()

    ctx.response.header('Retry-After', String(MAINTENANCE_RETRY_AFTER_SECONDS))
    ctx.response.header('Cache-Control', 'no-store')
    ctx.response.status(503)
    ctx.response.type('html')
    return ctx.response.send(renderMaintenancePage())
  }
}
