import BoatPolicy from '#policies/boat_policy'
import BoatGenericEquipmentService, {
  BoatEquipmentNotFoundError,
} from '#services/boat_generic_equipment_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import {
  createGenericEquipmentValidator,
  updateGenericEquipmentValidator,
} from '#validators/boat_generic_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatGenericEquipmentController {
  constructor(
    private boatService: BoatHullService,
    private equipmentService: BoatGenericEquipmentService
  ) {}

  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(createGenericEquipmentValidator)
    try {
      await this.equipmentService.create(user, boat, payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.created'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(updateGenericEquipmentValidator)
    try {
      await this.equipmentService.update(user, boat, Number(params.itemId), payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipment`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.updated'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    try {
      await this.equipmentService.delete(user, boat, Number(params.itemId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipment`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.deleted'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }
}
