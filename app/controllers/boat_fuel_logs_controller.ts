import BoatFuelLogService from '#services/boat_fuel_log_service'
import { BoatFuelLogNotFoundError, BoatFuelLogValidationError } from '#exceptions/fuel_log_errors'
import BoatHullService from '#services/boat_hull_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import FuelLogPolicy from '#policies/fuel_log_policy'
import { createBoatFuelLogValidator } from '#validators/boat_fuel_log'
import { CREATE_FUEL_LOG_ACTION } from '#shared/constants/offline_queue'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatFuelLogsController {
  constructor(
    private boatService: BoatHullService,
    private fuelLogService: BoatFuelLogService
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

    await bouncer.with(FuelLogPolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatFuelLogValidator)

    let fuelLog
    try {
      fuelLog = await this.fuelLogService.createForBoat(user, boat, {
        fueledAt: payload.fueledAt,
        quantityLiters: payload.quantityLiters,
        pricePerLiter: payload.pricePerLiter ?? null,
        totalCost: payload.totalCost ?? null,
        engineHoursAtFueling: payload.engineHoursAtFueling ?? null,
        boatEngineId: payload.boatEngineId ?? null,
        fuelType: payload.fuelType ?? null,
        supplier: payload.supplier ?? null,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (error instanceof BoatFuelLogValidationError) {
        session.flash('error', i18n.t(`flash.fuelLog.${error.errorCode}`))
        // Refus métier sur un plein enfilé hors-ligne : sans marqueur, la file
        // le prendrait pour un succès et le détruirait (#727).
        session.flash('rejectedType', CREATE_FUEL_LOG_ACTION)
        response.redirect(`/boats/${boat.id}?tab=fuel`)
        return
      }
      throw error
    }

    session.flash('createdResourceType', CREATE_FUEL_LOG_ACTION)
    session.flash('createdResourceId', String(fuelLog.id))
    session.flash('success', i18n.t('flash.fuelLog.created'))
    response.redirect(`/boats/${boat.id}?tab=fuel`)
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

    await bouncer.with(FuelLogPolicy).authorize('delete', boat)

    try {
      await this.fuelLogService.deleteForBoat(user, boat, Number(params.logId))
    } catch (error) {
      if (error instanceof BoatFuelLogNotFoundError) {
        session.flash('error', i18n.t('flash.fuelLog.notFound'))
        response.redirect(`/boats/${boat.id}?tab=fuel`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.fuelLog.deleted'))
    response.redirect(`/boats/${boat.id}?tab=fuel`)
  }
}
