import AuditLogService from '#services/audit_log_service'
import UserService from '#services/user_service'
import { loginValidator } from '#validators/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

@inject()
export default class SessionController {
  constructor(
    private userService: UserService,
    private auditLogService: AuditLogService
  ) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password, remember } = await request.validateUsing(loginValidator)
    const user = await this.userService.verifyCredentials(email, password)
    await auth.use('web').login(user, remember ?? false)
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

  async destroy({ auth, response }: HttpContext) {
    const user = auth.user
    if (user?.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'logout',
      })
    }
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
