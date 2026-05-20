import Pontoon from '#models/pontoon'
import Port from '#models/port'
import { PontoonHasBoatsError } from '#exceptions/port_errors'
import PontoonService from '#services/pontoon_service'
import { createPontoonValidator, updatePontoonValidator } from '#validators/pontoon'
import { updatePositionValidator } from '#validators/marina_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PontoonsController {
  constructor(private pontoonService: PontoonService) {}

  async store({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.portId))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const payload = await request.validateUsing(createPontoonValidator)
    await this.pontoonService.createForPort(port, payload)

    return response.redirect(`/ports/${port.id}`)
  }

  async update({ request, params, auth, response }: HttpContext) {
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

    const payload = await request.validateUsing(updatePontoonValidator)
    await this.pontoonService.updateForPort(pontoon, payload)

    return response.redirect(`/ports/${port.id}`)
  }

  async destroy({ params, auth, response, session }: HttpContext) {
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

    try {
      await this.pontoonService.deleteForPort(pontoon)
      return response.redirect(`/ports/${port.id}`)
    } catch (error) {
      if (error instanceof PontoonHasBoatsError) {
        session.flash('error', 'pontoon_has_boats')
        return response.redirect(`/ports/${port.id}`)
      }
      throw error
    }
  }

  async updatePosition({ request, params, auth, response }: HttpContext) {
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

    const payload = await request.validateUsing(updatePositionValidator)
    await this.pontoonService.updatePosition(pontoon, payload)

    return response.redirect().back()
  }
}
