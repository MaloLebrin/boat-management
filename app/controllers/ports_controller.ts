import PortService from '#services/port_service'
import { PortHasBoatsError, PortNotFoundError } from '#exceptions/port_errors'
import { createPortValidator, updatePortValidator } from '#validators/port'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PortsController {
  constructor(private portService: PortService) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const ports = await this.portService.listForUser(user)

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
    const port = await this.portService.createForUser(user, payload)

    return response.redirect(`/ports/${port.id}`)
  }

  async show({ inertia, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getWithPontoonsAndMouillagesOrFail(user, Number(params.id))
      return inertia.render('ports/show', { port })
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async edit({ inertia, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getWithPontoonsAndMouillagesOrFail(user, Number(params.id))
      return inertia.render('ports/edit', { port })
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async update({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.id))
      const payload = await request.validateUsing(updatePortValidator)
      await this.portService.updateForUser(user, port, payload)
      return response.redirect(`/ports/${port.id}`)
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      throw error
    }
  }

  async destroy({ params, auth, response, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.id))
      await this.portService.deleteForUser(user, port)
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
