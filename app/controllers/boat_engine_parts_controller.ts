import BoatEquipmentService, { BoatEquipmentNotFoundError } from '#services/boat_equipment_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import { createEnginePartValidator, updateEnginePartValidator } from '#validators/boat_engine_part'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatEnginePartsController {
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
    const payload = await request.validateUsing(createEnginePartValidator)
    try {
      await this.equipmentService.createEnginePart(user, boat, Number(params.engineId), payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.created'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.authorize('boatUpdate', boat)
    const payload = await request.validateUsing(updateEnginePartValidator)
    try {
      await this.equipmentService.updateEnginePart(
        user,
        boat,
        Number(params.engineId),
        Number(params.partId),
        payload
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.updated'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.authorize('boatUpdate', boat)
    try {
      await this.equipmentService.deleteEnginePart(
        user,
        boat,
        Number(params.engineId),
        Number(params.partId)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.deleted'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
  }
}
