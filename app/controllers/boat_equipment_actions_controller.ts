import {
  BoatEquipmentActionNotFoundError,
  BoatEquipmentActionValidationError,
} from '#exceptions/equipment_action_errors'
import BoatEquipmentActionService from '#services/boat_equipment_action_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import EquipmentActionPolicy from '#policies/equipment_action_policy'
import {
  createBoatEquipmentActionValidator,
  updateBoatEquipmentActionValidator,
} from '#validators/boat_equipment_action'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatEquipmentActionsController {
  constructor(
    private boatService: BoatService,
    private equipmentActionService: BoatEquipmentActionService
  ) {}

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(EquipmentActionPolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatEquipmentActionValidator)

    try {
      await this.equipmentActionService.createForBoat(user, boat, {
        label: payload.label,
        actionType: payload.actionType,
        notes: payload.notes ?? null,
        estimatedCost: payload.estimatedCost ?? null,
        equipmentType: payload.equipmentType ?? null,
        equipmentId: payload.equipmentId ?? null,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentActionValidationError) {
        session.flash('error', i18n.t(`flash.equipmentActions.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.equipmentActions.created'))
    response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(EquipmentActionPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateBoatEquipmentActionValidator)

    try {
      await this.equipmentActionService.updateForBoat(user, boat, Number(params.actionId), {
        label: payload.label,
        actionType: payload.actionType,
        notes: payload.notes ?? null,
        estimatedCost: payload.estimatedCost ?? null,
        actualCost: payload.actualCost ?? null,
        equipmentType: payload.equipmentType ?? null,
        equipmentId: payload.equipmentId ?? null,
        status: payload.status,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentActionNotFoundError) {
        session.flash('error', i18n.t('flash.equipmentActions.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
        return
      }
      if (error instanceof BoatEquipmentActionValidationError) {
        session.flash('error', i18n.t(`flash.equipmentActions.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.equipmentActions.updated'))
    response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(EquipmentActionPolicy).authorize('delete', boat)

    try {
      await this.equipmentActionService.deleteForBoat(user, boat, Number(params.actionId))
    } catch (error) {
      if (error instanceof BoatEquipmentActionNotFoundError) {
        session.flash('error', i18n.t('flash.equipmentActions.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.equipmentActions.deleted'))
    response.redirect(`/boats/${boat.id}?tab=equipmentActions`)
  }
}
