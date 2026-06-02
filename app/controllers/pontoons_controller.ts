import {
  PontoonHasBoatsError,
  PontoonNotFoundError,
  PortNotFoundError,
} from '#exceptions/port_errors'
import PortService from '#services/port_service'
import PontoonService from '#services/pontoon_service'
import PortPolicy from '#policies/port_policy'
import { createPontoonValidator, updatePontoonValidator } from '#validators/pontoon'
import { updatePositionValidator } from '#validators/marina_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PontoonsController {
  constructor(
    private pontoonService: PontoonService,
    private portService: PortService
  ) {}

  async store({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      await bouncer.with(PortPolicy).authorize('create')
      const payload = await request.validateUsing(createPontoonValidator)
      await this.pontoonService.createForPort(port, payload)
      return response.redirect(`/ports/${port.id}`)
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async update({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const pontoon = await this.pontoonService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.pontoonId)
      )
      const payload = await request.validateUsing(updatePontoonValidator)
      await this.pontoonService.updateForPort(pontoon, payload)
      return response.redirect(`/ports/${params.portId}`)
    } catch (error) {
      if (error instanceof PontoonNotFoundError) return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }

  async destroy({ params, auth, response, session, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const pontoon = await this.pontoonService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.pontoonId)
      )
      await this.pontoonService.deleteForPort(pontoon)
      return response.redirect(`/ports/${params.portId}`)
    } catch (error) {
      if (error instanceof PontoonNotFoundError) return response.redirect(`/ports/${params.portId}`)
      if (error instanceof PontoonHasBoatsError) {
        session.flash('error', 'pontoon_has_boats')
        return response.redirect(`/ports/${params.portId}`)
      }
      throw error
    }
  }

  async updatePosition({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      await bouncer.with(PortPolicy).authorize('create')
      const pontoon = await this.pontoonService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.pontoonId)
      )
      const payload = await request.validateUsing(updatePositionValidator)
      await this.pontoonService.updatePosition(pontoon, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PontoonNotFoundError) return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }
}
