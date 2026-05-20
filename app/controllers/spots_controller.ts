import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
import Spot from '#models/spot'
import SpotService from '#services/spot_service'
import { createSpotValidator, updateSpotValidator } from '#validators/spot'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SpotsController {
  constructor(private spotService: SpotService) {}

  async storeForPontoon({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.portId))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const pontoon = await Pontoon.query()
      .where('id', Number(params.pontoonId))
      .where('portId', port.id)
      .first()

    if (!pontoon) return response.redirect(`/ports/${port.id}`)

    const payload = await request.validateUsing(createSpotValidator)
    await this.spotService.createForPontoon(pontoon, port, payload)

    return response.redirect().back()
  }

  async storeForMouillage({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.portId))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const mouillage = await Mouillage.query()
      .where('id', Number(params.mouillageId))
      .where('portId', port.id)
      .first()

    if (!mouillage) return response.redirect(`/ports/${port.id}`)

    const payload = await request.validateUsing(createSpotValidator)
    await this.spotService.createForMouillage(mouillage, port, payload)

    return response.redirect().back()
  }

  async update({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const spot = await Spot.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!spot) return response.redirect('/ports')

    const payload = await request.validateUsing(updateSpotValidator)
    await this.spotService.update(spot, payload)

    return response.redirect().back()
  }

  async destroy({ params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const spot = await Spot.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!spot) return response.redirect('/ports')

    await this.spotService.delete(spot)

    return response.redirect().back()
  }
}
