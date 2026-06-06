import { signupValidator } from '#validators/user'
import UserService from '#services/user_service'
import EmailQueueService from '#services/email_queue_service'
import BoatHullService from '#services/boat_hull_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { SimulatorBoatInput } from '#shared/types/simulator'

@inject()
export default class NewAccountController {
  constructor(
    private userService: UserService,
    private emailQueueService: EmailQueueService,
    private boatHullService: BoatHullService
  ) {}

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth, session }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user } = await this.userService.signupWithOrganization(payload)

    await auth.use('web').login(user)

    await this.emailQueueService.sendWelcome({ to: user.email, name: user.fullName })

    const simulatorData = session.get('simulatorBoat') as SimulatorBoatInput | null
    if (simulatorData && user.organizationId) {
      const boat = await this.boatHullService.createFromSimulator(
        user.organizationId,
        simulatorData
      )
      session.forget('simulatorBoat')
      return response.redirect(`/boats/${boat.id}`)
    }

    return response.redirect().toRoute('dashboard')
  }
}
