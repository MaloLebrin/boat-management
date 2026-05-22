import BoatMaintenanceService, {
  BoatMaintenanceNotFoundError,
  BoatMaintenanceValidationError,
} from '#services/boat_maintenance_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MaintenancePolicy from '#policies/maintenance_policy'
import { createBoatMaintenanceValidator } from '#validators/boat_maintenance'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatMaintenancesController {
  constructor(
    private boatService: BoatService,
    private boatMaintenanceService: BoatMaintenanceService
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

    await bouncer.with(MaintenancePolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatMaintenanceValidator)

    try {
      await this.boatMaintenanceService.createForBoat(user, boat, {
        subject: payload.subject,
        boatEngineId: payload.boatEngineId ?? null,
        boatSailId: payload.boatSailId ?? null,
        boatRigId: payload.boatRigId ?? null,
        engineCaption: payload.engineCaption ?? null,
        sailCaption: payload.sailCaption ?? null,
        performedAt: payload.performedAt,
        title: payload.title,
        notes: payload.notes ?? null,
        parts: payload.parts,
      })
    } catch (error) {
      if (error instanceof BoatMaintenanceValidationError) {
        session.flash('error', i18n.t(`flash.maintenance.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenance.recorded'))
    response.redirect(`/boats/${boat.id}`)
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

    await bouncer.with(MaintenancePolicy).authorize('delete', boat)

    try {
      await this.boatMaintenanceService.deleteForBoat(user, boat, Number(params.eventId))
    } catch (error) {
      if (error instanceof BoatMaintenanceNotFoundError) {
        session.flash('error', i18n.t('flash.maintenance.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenance.removed'))
    response.redirect(`/boats/${boat.id}`)
  }
}
