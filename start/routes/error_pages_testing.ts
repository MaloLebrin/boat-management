import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { errors as shieldErrors } from '@adonisjs/shield'

/**
 * Shield est retiré du pipeline sous `NODE_ENV=test` (`start/kernel.ts`).
 * Cette route est le seul moyen de faire lever `E_BAD_CSRF_TOKEN` au milieu
 * d'une vraie requête HTTP, pour épingler `errors/session_expired` (#864).
 * Le rejet lui-même (POST sans jeton) est exercé à part, en rejouant le
 * middleware Shield — voir `tests/functional/errors/http_status_pages.spec.ts`.
 */
if (app.inTest) {
  router.post('/__tests/session-expired', () => {
    throw new shieldErrors.E_BAD_CSRF_TOKEN()
  })
}
