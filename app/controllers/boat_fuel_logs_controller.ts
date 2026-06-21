import BoatFuelLogService, {
  BoatFuelLogNotFoundError,
  BoatFuelLogValidationError,
} from '#services/boat_fuel_log_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import FuelLogPolicy from '#policies/fuel_log_policy'
import { createBoatFuelLogValidator } from '#validators/boat_fuel_log'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatFuelLogsController {
  constructor(
    private boatService: BoatService,
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

    try {
      await this.fuelLogService.createForBoat(user, boat, {
        fueledAt: payload.fueledAt,
        quantityLiters: payload.quantityLiters,
        pricePerLiter: payload.pricePerLiter ?? null,
        totalCost: payload.totalCost ?? null,
        engineHoursAtFueling: payload.engineHoursAtFueling ?? null,
        boatEngineId: payload.boatEngineId ?? null,
        supplier: payload.supplier ?? null,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (error instanceof BoatFuelLogValidationError) {
        session.flash('error', i18n.t(`flash.fuelLog.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=fuel`)
        return
      }
      throw error
    }

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
