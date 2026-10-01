import type User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import TwoFactorService from '#services/two_factor_service'
import { formatDateLong } from '#shared/helpers/date_format'
import { TWO_FACTOR_SETUP_PATH } from '#shared/constants/two_factor'
import { stampAuthSession } from '#utils/auth_session'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

/**
 * Ouverture de la session une fois **tous** les facteurs vérifiés (#884) :
 * appelée par `SessionController` (compte sans 2FA) et par
 * `TwoFactorChallengeController` (après le code).
 */
@inject()
export default class SessionLoginService {
  constructor(
    private auditLogService: AuditLogService,
    private twoFactorService: TwoFactorService
  ) {}

  /**
   * Connecte `user` et rend le chemin où le rediriger : le tableau de bord, ou
   * l'activation de la 2FA si la politique de son organisation l'impose déjà.
   */
  async complete(
    ctx: Pick<HttpContext, 'auth' | 'session' | 'i18n'>,
    user: User,
    remember: boolean
  ): Promise<string | null> {
    await ctx.auth.use('web').login(user, remember)
    stampAuthSession(ctx.session)
    // #451 — filet de sécurité : une session navigateur qui traîne encore un
    // `demoSessionStartedAt` (session démo antérieure) ne doit pas le transmettre
    // au compte réel qui vient de s'authentifier.
    ctx.session.forget('demoSessionStartedAt')
    user.lastLoginAt = DateTime.now()
    await user.save()

    if (user.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login',
      })
    }

    // Politique d'organisation : prévenir dès la connexion, et envoyer
    // directement à l'activation une fois le délai de grâce écoulé.
    if (user.hasTwoFactorEnabled) return null
    const enforcement = await this.twoFactorService.enforcementFor(user)
    if (!enforcement.required) return null

    if (enforcement.blocked) {
      ctx.session.flash('info', ctx.i18n.t('flash.twoFactor.requiredNow'))
      return TWO_FACTOR_SETUP_PATH
    }
    ctx.session.flash(
      'info',
      ctx.i18n.t('flash.twoFactor.requiredBy', {
        date: formatDateLong(enforcement.graceEndsAt ?? '', ctx.i18n.locale),
      })
    )
    return null
  }
}
