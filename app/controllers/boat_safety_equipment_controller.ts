import BoatService, { BoatEquipmentNotFoundError, BoatNotFoundError } from '#services/boat_service'
import {
  createSafetyEquipmentValidator,
  updateSafetyEquipmentValidator,
} from '#validators/boat_safety_equipment'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatSafetyEquipmentController {
  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat, boatService }
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
    const { user, boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)
    const payload = await request.validateUsing(createSafetyEquipmentValidator)
    try {
      await boatService.createSafetyEquipment(user, boat, payload)
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
    const { user, boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)
    const payload = await request.validateUsing(updateSafetyEquipmentValidator)
    try {
      await boatService.updateSafetyEquipment(user, boat, Number(params.itemId), payload)
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
    const { user, boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)
    try {
      await boatService.deleteSafetyEquipment(user, boat, Number(params.itemId))
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
