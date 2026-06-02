import {
  MouillageNotFoundError,
  PontoonNotFoundError,
  PortNotFoundError,
  SpotNotFoundError,
} from '#exceptions/port_errors'
import MouillageService from '#services/mouillage_service'
import PontoonService from '#services/pontoon_service'
import PortService from '#services/port_service'
import SpotService from '#services/spot_service'
import PortPolicy from '#policies/port_policy'
import { createSpotValidator, updateSpotValidator } from '#validators/spot'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SpotsController {
  constructor(
    private spotService: SpotService,
    private portService: PortService,
    private pontoonService: PontoonService,
    private mouillageService: MouillageService
  ) {}

  async storeForPontoon({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const pontoon = await this.pontoonService.getForPortOrFail(port.id, Number(params.pontoonId))
      const payload = await request.validateUsing(createSpotValidator)
      await this.spotService.createForPontoon(pontoon, port, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      if (error instanceof PontoonNotFoundError) return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }

  async storeForMouillage({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const mouillage = await this.mouillageService.getForPortOrFail(
        port.id,
        Number(params.mouillageId)
      )
      const payload = await request.validateUsing(createSpotValidator)
      await this.spotService.createForMouillage(mouillage, port, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      if (error instanceof MouillageNotFoundError)
        return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }

  async update({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const spot = await this.spotService.getForUserOrFail(user, Number(params.id))
      const payload = await request.validateUsing(updateSpotValidator)
      await this.spotService.update(spot, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof SpotNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async destroy({ params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const spot = await this.spotService.getForUserOrFail(user, Number(params.id))
      await this.spotService.delete(spot)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof SpotNotFoundError) return response.redirect('/ports')
      throw error
    }
  }
}
