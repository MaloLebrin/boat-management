import { stampAuthSession } from '#utils/auth_session'
import { signupValidator } from '#validators/user'
import UserService from '#services/user_service'
import EmailQueueService from '#services/email_queue_service'
import EmailVerificationService from '#services/email_verification_service'
import env from '#start/env'
import BoatHullService from '#services/boat_hull_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { SimulatorBoatInput } from '#shared/types/simulator'
import { DateTime } from 'luxon'

@inject()
export default class NewAccountController {
  constructor(
    private userService: UserService,
    private emailQueueService: EmailQueueService,
    private emailVerificationService: EmailVerificationService,
    private boatHullService: BoatHullService
  ) {}

  async create({ inertia, request }: HttpContext) {
    const fromSimulator = request.qs().from === 'simulator'
    const fromDiagnostic = request.qs().from === 'diagnostic'
    const fromPartsAi = request.qs().from === 'parts'
    return inertia.render('auth/signup', { fromSimulator, fromDiagnostic, fromPartsAi })
  }

  async store({ request, response, auth, session }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user } = await this.userService.signupWithOrganization(payload)

    await auth.use('web').login(user)
    stampAuthSession(session)
    user.lastLoginAt = DateTime.now()
    await user.save()

    await this.emailQueueService.sendWelcome({ to: user.email, name: user.fullName })

    // Lien de vérification (#768). L'inscription reste sans friction — on
    // connecte et on redirige comme avant ; ce qui attend la vérification,
    // ce sont les actions qui engagent des tiers ou de l'argent.
    const verificationToken = await this.emailVerificationService.createToken(user.email)
    if (verificationToken !== null) {
      await this.emailQueueService.sendEmailVerification({
        to: user.email,
        verificationUrl: `${env.get('APP_URL')}/verify-email/confirm?token=${verificationToken}`,
      })
    }

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
