import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatPolicy from '#policies/boat_policy'
import BoatHullService from '#services/boat_hull_service'
import BoatPositionService from '#services/boat_position_service'
import { updateBoatPositionValidator } from '#validators/boat'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatPositionController {
  constructor(
    private boatHullService: BoatHullService,
    private boatPositionService: BoatPositionService
  ) {}

  async store({ request, params, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatHullService.getForUserOrFail(user, Number(params.boatId))
      await bouncer.with(BoatPolicy).authorize('edit', boat)
      const payload = await request.validateUsing(updateBoatPositionValidator)
      await this.boatPositionService.storeManualPosition(boat, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }
  }
}
