import { signupValidator } from '#validators/user'
import UserService from '#services/user_service'
import EmailQueueService from '#services/email_queue_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NewAccountController {
  constructor(
    private userService: UserService,
    private emailQueueService: EmailQueueService
  ) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user } = await this.userService.signupWithOrganization(payload)

    await auth.use('web').login(user)

    await this.emailQueueService.sendWelcome({ to: user.email, name: user.fullName })

    response.redirect().toRoute('dashboard')
  }
}
