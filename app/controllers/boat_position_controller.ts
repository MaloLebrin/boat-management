import { BoatNotFoundError } from '#exceptions/boat_errors'
import BoatPositionService from '#services/boat_position_service'
import { updateBoatPositionValidator } from '#validators/boat'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatPositionController {
  constructor(private boatPositionService: BoatPositionService) {}

  async store({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const payload = await request.validateUsing(updateBoatPositionValidator)
      await this.boatPositionService.storeManualPosition(user, Number(params.boatId), payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof BoatNotFoundError) return response.redirect('/boats')
      throw error
    }
  }
}
