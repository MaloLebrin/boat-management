import Mouillage from '#models/mouillage'
import Port from '#models/port'
import { MouillageHasBoatsError } from '#services/port_service'
import MouillageService from '#services/mouillage_service'
import { createMouillageValidator, updateMouillageValidator } from '#validators/mouillage'
import { updatePositionValidator } from '#validators/marina_layout'
import type { HttpContext } from '@adonisjs/core/http'

export default class MouillagesController {
  async store({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.portId))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const payload = await request.validateUsing(createMouillageValidator)
    const mouillageService = new MouillageService()
    await mouillageService.createForPort(port, payload)

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

    const mouillage = await Mouillage.query()
      .where('id', Number(params.mouillageId))
      .where('portId', port.id)
      .first()

    if (!mouillage) return response.redirect(`/ports/${port.id}`)

    const payload = await request.validateUsing(updateMouillageValidator)
    const mouillageService = new MouillageService()
    await mouillageService.updateForPort(mouillage, payload)

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

    const mouillage = await Mouillage.query()
      .where('id', Number(params.mouillageId))
      .where('portId', port.id)
      .first()

    if (!mouillage) return response.redirect(`/ports/${port.id}`)

    const mouillageService = new MouillageService()
    try {
      await mouillageService.deleteForPort(mouillage)
      return response.redirect(`/ports/${port.id}`)
    } catch (error) {
      if (error instanceof MouillageHasBoatsError) {
        session.flash('error', 'mouillage_has_boats')
        return response.redirect(`/ports/${port.id}`)
      }
      throw error
    }
  }

  async updatePosition({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.status(403).json({ error: 'forbidden' })

    const port = await Port.query()
      .where('id', Number(params.portId))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.status(404).json({ error: 'not found' })

    const mouillage = await Mouillage.query()
      .where('id', Number(params.mouillageId))
      .where('portId', port.id)
      .first()

    if (!mouillage) return response.status(404).json({ error: 'not found' })

    const payload = await request.validateUsing(updatePositionValidator)
    const mouillageService = new MouillageService()
    await mouillageService.updatePosition(mouillage, payload)

    return response.json({ ok: true })
  }
}
