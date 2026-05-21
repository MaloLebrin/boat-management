import UserService from '#services/user_service'
import { loginValidator } from '#validators/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SessionController {
  constructor(private userService: UserService) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await this.userService.verifyCredentials(email, password)
    await auth.use('web').login(user)

    response.redirect().toRoute('dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
