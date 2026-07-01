import {
  MouillageHasBoatsError,
  MouillageNotFoundError,
  PortNotFoundError,
} from '#exceptions/port_errors'
import MouillageService from '#services/mouillage_service'
import PortService from '#services/port_service'
import PortPolicy from '#policies/port_policy'
import { createMouillageValidator, updateMouillageValidator } from '#validators/mouillage'
import { updatePositionValidator } from '#validators/marina_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MouillagesController {
  constructor(
    private mouillageService: MouillageService,
    private portService: PortService
  ) {}

  async store({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      await bouncer.with(PortPolicy).authorize('create')
      const payload = await request.validateUsing(createMouillageValidator)
      await this.mouillageService.createForPort(port, payload)
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
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      await bouncer.with(PortPolicy).authorize('edit', port)
      const mouillage = await this.mouillageService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.mouillageId)
      )
      const payload = await request.validateUsing(updateMouillageValidator)
      await this.mouillageService.updateForPort(mouillage, payload)
      return response.redirect(`/ports/${params.portId}`)
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      if (error instanceof MouillageNotFoundError)
        return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }

  async destroy({ params, auth, response, session, bouncer, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      await bouncer.with(PortPolicy).authorize('delete', port)
      const mouillage = await this.mouillageService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.mouillageId)
      )
      await this.mouillageService.deleteForPort(mouillage)
      return response.redirect(`/ports/${params.portId}`)
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      if (error instanceof MouillageNotFoundError)
        return response.redirect(`/ports/${params.portId}`)
      if (error instanceof MouillageHasBoatsError) {
        session.flash('error', i18n.t('flash.mouillages.hasBoats'))
        return response.redirect(`/ports/${params.portId}`)
      }
      throw error
    }
  }

  async updatePosition({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      await bouncer.with(PortPolicy).authorize('edit', port)
      const mouillage = await this.mouillageService.getForUserOrFail(
        user,
        Number(params.portId),
        Number(params.mouillageId)
      )
      const payload = await request.validateUsing(updatePositionValidator)
      await this.mouillageService.updatePosition(mouillage, payload)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      if (error instanceof MouillageNotFoundError)
        return response.redirect(`/ports/${params.portId}`)
      throw error
    }
  }
}
