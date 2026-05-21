import BoatEquipmentService, { BoatEquipmentNotFoundError } from '#services/boat_equipment_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import {
  createSafetyEquipmentValidator,
  updateSafetyEquipmentValidator,
} from '#validators/boat_safety_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatSafetyEquipmentController {
  constructor(
    private boatService: BoatHullService,
    private equipmentService: BoatEquipmentService
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
    await bouncer.authorize('boatUpdate', boat)
    const payload = await request.validateUsing(createSafetyEquipmentValidator)
    try {
      await this.equipmentService.createSafetyEquipment(user, boat, payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.created'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.authorize('boatUpdate', boat)
    const payload = await request.validateUsing(updateSafetyEquipmentValidator)
    try {
      await this.equipmentService.updateSafetyEquipment(user, boat, Number(params.itemId), payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=safety`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.updated'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.authorize('boatUpdate', boat)
    try {
      await this.equipmentService.deleteSafetyEquipment(user, boat, Number(params.itemId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=safety`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.deleted'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }
}
