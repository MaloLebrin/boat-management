import BoatPolicy from '#policies/boat_policy'
import BoatEquipmentService, { BoatEquipmentNotFoundError } from '#services/boat_equipment_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import { toMediaRow } from '#transformers/media_row_transformer'
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
    private equipmentService: BoatEquipmentService,
    private organizationService: OrganizationService,
    private mediaService: MediaService
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

  async show({ inertia, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { boat } = loaded

    const item = await this.equipmentService.findSafetyEquipment(boat.id, Number(params.itemId))
    if (!item) {
      session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
      response.redirect(`/boats/${boat.id}?tab=safety`)
      return
    }

    const canManage = await bouncer.with(BoatPolicy).allows('edit', boat)
    const media = await this.mediaService.listForEntity('boat_safety_equipment', item.id)

    return inertia.render('boats/safety_equipment_show', {
      boat: { id: boat.id, name: boat.name },
      item: {
        id: item.id,
        equipmentType: item.equipmentType,
        quantity: item.quantity,
        expiryDate: item.expiryDate ? item.expiryDate.toISODate() : null,
        status: item.status,
        notes: item.notes,
        purchasePrice: item.purchasePrice ? Number.parseFloat(item.purchasePrice) : null,
        purchasedAt: item.purchasedAt ? item.purchasedAt.toISODate() : null,
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
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
    await bouncer.with(BoatPolicy).authorize('edit', boat)
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
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const org = await this.organizationService.findOrFail(boat.organizationId)
    try {
      await this.equipmentService.deleteSafetyEquipment(user, boat, Number(params.itemId), org)
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
