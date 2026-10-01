import AuditLogService from '#services/audit_log_service'
import DemoService from '#services/demo_service'
import User from '#models/user'
import UserService from '#services/user_service'
import SessionLoginService from '#services/session_login_service'
import { beginTwoFactorChallenge, clearTwoFactorChallenge } from '#utils/two_factor_challenge'
import { TWO_FACTOR_CHALLENGE_PATH } from '#shared/constants/two_factor'
import { loginValidator } from '#validators/user'
import { loginAccountKey, loginAccountLimiter } from '#start/limiter'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SessionController {
  constructor(
    private userService: UserService,
    private auditLogService: AuditLogService,
    private demoService: DemoService,
    private sessionLoginService: SessionLoginService
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
      // Échec de connexion (#856) : on journalise uniquement si l'e-mail
      // normalisé correspond à un compte rattaché à une organisation. `userId`
      // reste null — la ligne ne doit pas révéler l'existence du compte via
      // l'UI (pas d'auteur), et on n'écrit jamais le mot de passe.
      await this.#logLoginFailed(email)
      // Message volontairement identique quelle que soit l'origine du blocage
      // — compteur par IP ou par compte. Le distinguer ferait du refus un
      // signal sur l'activité visant ce compte.
      session.flash('error', i18n.t('flash.auth.loginRateLimit'))
      return response.redirect().back()
    }

    const user = attempt[1]

    // Double authentification (#884) : le mot de passe ne suffit pas, rien
    // n'est ouvert côté `auth` — seul l'état pré-authentifié est posé, et le
    // remember-me attend le second facteur.
    if (user.hasTwoFactorEnabled) {
      beginTwoFactorChallenge(session, user.id, remember ?? false)
      return response.redirect().toPath(TWO_FACTOR_CHALLENGE_PATH)
    }

    clearTwoFactorChallenge(session)
    const redirectTo = await this.sessionLoginService.complete(
      { auth, session, i18n },
      user,
      remember ?? false
    )
    if (redirectTo) return response.redirect().toPath(redirectTo)
    response.redirect().toRoute('dashboard')
  }

  async #logLoginFailed(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const existing = await User.query()
      .where('email', normalized)
      .whereNotNull('organizationId')
      .select(['id', 'organizationId', 'email'])
      .first()
    if (!existing?.organizationId) return

    await this.auditLogService.log({
      organizationId: existing.organizationId,
      userId: null,
      action: 'auth.login_failed',
      metadata: { email: existing.email },
    })
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
