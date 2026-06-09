import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { simulatorLeadValidator } from '#validators/simulator_lead'
import SimulatorLeadService from '#services/simulator_lead_service'

@inject()
export default class SimulatorLeadController {
  constructor(private simulatorLeadService: SimulatorLeadService) {}

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(simulatorLeadValidator)
    await this.simulatorLeadService.create(payload)
    session.flash('lead_captured', true)
    return response.redirect().back()
  }
}
