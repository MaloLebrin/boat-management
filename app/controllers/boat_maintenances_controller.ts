import BoatMaintenanceService, {
  BoatMaintenanceNotFoundError,
  BoatMaintenanceValidationError,
} from '#services/boat_maintenance_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import { createBoatMaintenanceValidator } from '#validators/boat_maintenance'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatMaintenancesController {
  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    let boat
    try {
      boat = await boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(createBoatMaintenanceValidator)
    const maintenanceService = new BoatMaintenanceService()

    try {
      await maintenanceService.createForBoat(user, boat, {
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

    const boatService = new BoatService()
    let boat
    try {
      boat = await boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.authorize('boatUpdate', boat)

    const maintenanceService = new BoatMaintenanceService()

    try {
      await maintenanceService.deleteForBoat(user, boat, Number(params.eventId))
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
