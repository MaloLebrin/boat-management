import { forgotPasswordValidator, resetPasswordValidator } from '#validators/user'
import PasswordResetService from '#services/password_reset_service'
import EmailQueueService from '#services/email_queue_service'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

export default class PasswordResetController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async store({ request, response, session, i18n }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    const resetService = new PasswordResetService()
    const token = await resetService.createToken(email)

    if (token) {
      const resetUrl = `${env.get('APP_URL')}/reset-password?token=${token}`
      const emailService = new EmailQueueService()
      await emailService.sendPasswordReset({ to: email, resetUrl })
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

    const resetService = new PasswordResetService()
    const record = await resetService.verifyToken(token)

    if (!record) {
      session.flash('error', i18n.t('flash.auth.passwordResetTokenInvalid'))
      return response.redirect().back()
    }

    const user = await User.findBy('email', record.email)
    if (!user) {
      session.flash('error', i18n.t('flash.auth.passwordResetTokenInvalid'))
      return response.redirect().back()
    }

    user.password = await hash.make(password)
    await user.save()

    await resetService.invalidateTokensForEmail(record.email)

    session.flash('success', i18n.t('flash.auth.passwordResetSuccess'))
    return response.redirect().toPath('/login')
  }
}
