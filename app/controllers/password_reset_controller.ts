import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import PasswordResetService from '#services/password_reset_service'
import { PASSWORD_RESET_TOKEN_SESSION_KEY } from '#shared/constants/auth'
import EmailQueueService from '#services/email_queue_service'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PasswordResetController {
  constructor(
    private passwordResetService: PasswordResetService,
    private emailQueueService: EmailQueueService
  ) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async store({ request, response, session, i18n }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    const token = await this.passwordResetService.createToken(email)

    if (token) {
      const resetUrl = `${env.get('APP_URL')}/reset-password?token=${token}`
      await this.emailQueueService.sendPasswordReset({ to: email, resetUrl })
    }

    session.flash('success', i18n.t('flash.auth.passwordResetSent'))
    return response.redirect().toPath('/forgot-password')
  }

  /**
   * `GET /reset-password`. Deux passages (#770) :
   *
   * 1. avec `?token=…`, on range le token en session et on **rejoue la page
   *    sans query string** — le token ne reste dans l'URL que le temps d'une
   *    requête, donc pas dans l'historique, pas dans les journaux d'accès du
   *    reverse proxy, pas dans le `Referer` des sous-requêtes de la page ;
   * 2. sans query string, on rend le formulaire en relisant la session.
   *
   * Le token continue d'être posté par le formulaire : il vit alors dans le
   * corps d'une requête, pas dans une URL.
   */
  async edit({ request, response, session, inertia }: HttpContext) {
    const fromQuery = request.qs().token

    if (typeof fromQuery === 'string' && fromQuery.length > 0) {
      session.put(PASSWORD_RESET_TOKEN_SESSION_KEY, fromQuery)
      return response.redirect().withQs(false).toPath('/reset-password')
    }

    const token = session.get(PASSWORD_RESET_TOKEN_SESSION_KEY)
    return inertia.render('auth/reset_password', {
      token: typeof token === 'string' ? token : '',
    })
  }

  async update({ request, response, session, i18n }: HttpContext) {
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    const record = await this.passwordResetService.verifyToken(token)

    if (!record) {
      session.flash('error', i18n.t('flash.auth.passwordResetTokenInvalid'))
      return response.redirect().back()
    }

    const updated = await this.passwordResetService.updatePassword(record.email, password)
    if (!updated) {
      session.flash('error', i18n.t('flash.auth.passwordResetTokenInvalid'))
      return response.redirect().back()
    }

    await this.passwordResetService.invalidateTokensForEmail(record.email)
    // Le token a servi : il n'a plus rien à faire en session (#770).
    session.forget(PASSWORD_RESET_TOKEN_SESSION_KEY)

    session.flash('success', i18n.t('flash.auth.passwordResetSuccess'))
    return response.redirect().toPath('/login')
  }
}
