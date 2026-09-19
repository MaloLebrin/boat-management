import { AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DateTime } from 'luxon'

/**
 * Coupe les sessions ouvertes avant une réinitialisation de mot de passe
 * (#763).
 *
 * Changer son mot de passe est le seul geste de remédiation offert à un
 * utilisateur qui pense son compte compromis. Il ne révoquait rien :
 * `config/session.ts` donne `age: '5d'` et `clearWithBrowser: false`, donc un
 * attaquant avec un cookie de session valide gardait son accès jusqu'à cinq
 * jours après le changement.
 *
 * Avec `SESSION_DRIVER=cookie` — le défaut documenté dans `.env.example` —
 * les sessions ne sont pas listables côté serveur : il n'y a aucune table à
 * vider. Le discriminant est donc porté par l'utilisateur
 * (`users.sessions_valid_after`) et comparé ici à l'instant où la session a
 * été vue pour la première fois.
 *
 * L'estampille est posée par `stampAuthSession()` sur les trois points
 * d'entrée (connexion, inscription, démo), **pas** paresseusement ici : une
 * session non estampillée est traitée comme antérieure à toute révocation, et
 * la poser au vol ferait s'auto-réparer la session de l'attaquant — tandis
 * que ne la poser nulle part couperait la connexion légitime qui suit une
 * réinitialisation.
 *
 * Les sessions déjà ouvertes au moment du déploiement n'ont pas
 * d'estampille : elles ne sont coupées que si leur compte a réellement
 * révoqué, puisque `sessions_valid_after` est `null` pour tout le monde
 * jusque-là.
 */
export default class RevokedSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (user && user.sessionsValidAfter !== null) {
      const startedAtRaw = ctx.session.get(AUTH_SESSION_STARTED_AT_KEY)
      const startedAt = typeof startedAtRaw === 'string' ? DateTime.fromISO(startedAtRaw) : null

      // Échec fermé : une session sans estampille face à une révocation est
      // forcément antérieure à celle-ci — l'estampille est posée dès la
      // première requête authentifiée.
      const revoked =
        startedAt === null || !startedAt.isValid || startedAt < user.sessionsValidAfter

      if (revoked) {
        await ctx.auth.use('web').logout()
        ctx.session.forget(AUTH_SESSION_STARTED_AT_KEY)
        ctx.session.flash('error', ctx.i18n.t('flash.auth.sessionRevoked'))
        return ctx.response.redirect().withQs(false).toPath('/login')
      }
    }

    return next()
  }
}
