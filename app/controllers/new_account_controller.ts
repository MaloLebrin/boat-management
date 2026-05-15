import { signupValidator } from '#validators/user'
import UserService from '#services/user_service'
import EmailQueueService from '#services/email_queue_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const userService = new UserService()
    const { user } = await userService.signupWithOrganization(payload)

    await auth.use('web').login(user)

    const emailService = new EmailQueueService()
    await emailService.sendWelcome({ to: user.email, name: user.fullName })

    response.redirect().toRoute('dashboard')
  }
}
