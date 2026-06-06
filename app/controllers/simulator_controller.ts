import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { simulatorValidator } from '#validators/simulator'
import BoatHullService from '#services/boat_hull_service'

@inject()
export default class SimulatorController {
  constructor(private boatHullService: BoatHullService) {}

  async saveSession({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(simulatorValidator)
    session.put('simulatorBoat', payload)
    return response.redirect('/signup')
  }

  async createBoat({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!user.organizationId) {
      return response.redirect().toRoute('dashboard')
    }
    const payload = await request.validateUsing(simulatorValidator)
    const boat = await this.boatHullService.createFromSimulator(user.organizationId, payload)
    return response.redirect(`/boats/${boat.id}`)
  }
}
