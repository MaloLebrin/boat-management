import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Guest middleware is used to deny access to routes that should
 * be accessed by unauthenticated users.
 *
 * For example, the login page should not be accessible if the user
 * is already logged-in
 */
export default class GuestMiddleware {
  /**
   * The URL to redirect to when user is logged-in
   */
  redirectTo = '/dashboard'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    for (let guard of options.guards || [ctx.auth.defaultGuard]) {
      if (await ctx.auth.use(guard).check()) {
        ctx.session.reflash()
        // Surtout pas de report de query string (#770). Un utilisateur déjà
        // connecté qui clique sur son lien de réinitialisation atterrissait
        // sur `/dashboard?token=<token encore valide>` : le token partait
        // alors dans l'historique, dans les journaux d'accès du reverse
        // proxy, et dans le `Referer` des sous-requêtes de la page.
        //
        // `withQs(false)` est explicite parce que `config/app.ts` active
        // `forwardQueryString` globalement.
        return ctx.response.redirect().withQs(false).toPath(this.redirectTo)
      }
    }

    return next()
  }
}
