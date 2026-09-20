import { stampAuthSession } from '#utils/auth_session'
import AuditLogService from '#services/audit_log_service'
import DemoService from '#services/demo_service'
import UserService from '#services/user_service'
import { loginValidator } from '#validators/user'
import { loginAccountKey, loginAccountLimiter } from '#start/limiter'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

@inject()
export default class SessionController {
  constructor(
    private userService: UserService,
    private auditLogService: AuditLogService,
    private demoService: DemoService
  ) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session, i18n }: HttpContext) {
    const { email, password, remember } = await request.validateUsing(loginValidator)

    // Compteur **par compte**, en plus du compteur par IP monté sur la route
    // (#767). `penalize` ne décompte que les échecs, remet le compteur à zéro
    // sur une connexion réussie, et court-circuite la vérification des
    // identifiants une fois le plafond atteint.
    const attempt = await loginAccountLimiter().penalize(loginAccountKey(email), () =>
      this.userService.verifyCredentials(email, password)
    )

    if (attempt[0] !== null) {
      // Message volontairement identique quelle que soit l'origine du blocage
      // — compteur par IP ou par compte. Le distinguer ferait du refus un
      // signal sur l'activité visant ce compte.
      session.flash('error', i18n.t('flash.auth.loginRateLimit'))
      return response.redirect().back()
    }

    const user = attempt[1]
    await auth.use('web').login(user, remember ?? false)
    stampAuthSession(session)
    // #451 — filet de sécurité : une session navigateur qui traîne encore un
    // `demoSessionStartedAt` (session démo antérieure) ne doit pas le transmettre
    // au compte réel qui vient de s'authentifier.
    session.forget('demoSessionStartedAt')
    user.lastLoginAt = DateTime.now()
    await user.save()

    if (user.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login',
      })
    }

    response.redirect().toRoute('dashboard')
  }

  async destroy({ auth, response, session }: HttpContext) {
    const user = auth.user
    const isDemo = user ? this.demoService.isDemoUser(user.email) : false

    if (user?.organizationId && !isDemo) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'logout',
      })
    }

    await auth.use('web').logout()
    // #451 — `auth.logout()` ne vide pas la session : sans cette purge, le compteur
    // de session démo restait posé dans le navigateur et la bannière réapparaissait
    // sur le compte suivant.
    session.forget('demoSessionStartedAt')

    if (isDemo) {
      try {
        await this.demoService.scheduleReset()
      } catch (err) {
        logger.warn({ err }, 'DemoService: failed to schedule reset after demo logout')
      }
    }

    response.redirect().toRoute('session.create')
  }
}
