import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import PasswordResetService from '#services/password_reset_service'
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

  async edit({ request, inertia }: HttpContext) {
    const token = request.qs().token as string
    return inertia.render('auth/reset_password', { token: token ?? '' })
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

    session.flash('success', i18n.t('flash.auth.passwordResetSuccess'))
    return response.redirect().toPath('/login')
  }
}
