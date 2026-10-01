import UserSessionService from '#services/user_session_service'
import { AUTH_SESSION_RECORD_KEY, AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Contrôle de la session courante dans le registre `user_sessions` (#885).
 *
 * - Ligne révoquée (ou absente) : la session a été coupée depuis la liste des
 *   appareils ou par « déconnecter partout » — déconnexion et retour au
 *   login, dès cette requête.
 * - Session authentifiée sans ligne : restaurée depuis un remember-me, ou
 *   ouverte avant le déploiement du registre — elle est recensée ici
 *   (`adopt`), ce qui la rend visible et révocable. Idem pour une ligne qui
 *   appartient à un autre utilisateur que celui de la session.
 *
 * Placé après `RevokedSessionMiddleware` : une session antérieure à une
 * révocation globale est coupée par celui-ci avant d'être adoptée ici.
 */
@inject()
export default class SessionRegistryMiddleware {
  constructor(private userSessionService: UserSessionService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user || !this.userSessionService.isTracked(user)) return next()

    const recordId = this.userSessionService.currentId(ctx.session)
    if (recordId === null) {
      await this.userSessionService.adopt(ctx, user)
      return next()
    }

    const status = await this.userSessionService.check(recordId, user.id, ctx.request)
    if (status === 'foreign') {
      await this.userSessionService.adopt(ctx, user)
      return next()
    }
    if (status === 'revoked') {
      await ctx.auth.use('web').logout()
      ctx.session.forget(AUTH_SESSION_RECORD_KEY)
      ctx.session.forget(AUTH_SESSION_STARTED_AT_KEY)
      ctx.session.flash('error', ctx.i18n.t('flash.auth.sessionEnded'))
      return ctx.response.redirect().withQs(false).toPath('/login')
    }

    return next()
  }
}
