import { AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

/**
 * Date la session authentifiée qui vient d'être ouverte (#763).
 *
 * À appeler **juste après** `auth.use('web').login()`, sur les trois points
 * d'entrée (connexion, inscription, démo). C'est cette estampille que
 * `RevokedSessionMiddleware` compare à `users.sessions_valid_after` pour
 * décider si une session précède une réinitialisation de mot de passe.
 *
 * Poser l'estampille ici plutôt que paresseusement dans le middleware n'est
 * pas un détail : une session non estampillée est traitée comme antérieure à
 * toute révocation, donc une connexion légitime consécutive à une
 * réinitialisation serait coupée dès sa première requête.
 */
export function stampAuthSession(session: HttpContext['session']): void {
  session.put(AUTH_SESSION_STARTED_AT_KEY, DateTime.now().toISO() ?? '')
}
