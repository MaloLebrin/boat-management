import Port from '#models/port'
import PortService, { PortHasBoatsError, PortNotFoundError } from '#services/port_service'
import { createPortValidator, updatePortValidator } from '#validators/port'
import type { HttpContext } from '@adonisjs/core/http'

export default class PortsController {
  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portService = new PortService()
    const ports = await portService.listForUser(user)

    return inertia.render('ports/index', { ports })
  }

  async create({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    return inertia.render('ports/new', {})
  }

  async store({ request, response, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(createPortValidator)
    const portService = new PortService()
    const port = await portService.createForUser(user, payload)

    return response.redirect(`/ports/${port.id}`)
  }

  async show({ inertia, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portService = new PortService()
    try {
      const port = await portService.getWithPontoonsOrFail(user, Number(params.id))
      return inertia.render('ports/show', { port })
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async edit({ inertia, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portService = new PortService()
    try {
      const port = await portService.getWithPontoonsOrFail(user, Number(params.id))
      return inertia.render('ports/edit', { port })
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async update({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const payload = await request.validateUsing(updatePortValidator)
    const portService = new PortService()
    await portService.updateForUser(user, port, payload)

    return response.redirect(`/ports/${port.id}`)
  }

  async destroy({ params, auth, response, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/ports')

    const port = await Port.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!port) return response.redirect('/ports')

    const portService = new PortService()
    try {
      await portService.deleteForUser(user, port)
      return response.redirect('/ports')
    } catch (error) {
      if (error instanceof PortHasBoatsError) {
        session.flash('error', 'port_has_boats')
        return response.redirect(`/ports/${params.id}`)
      }
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }
}
