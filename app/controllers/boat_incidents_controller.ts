import {
  BoatIncidentNotFoundError,
  BoatIncidentValidationError,
} from '#exceptions/incident_errors'
import BoatIncidentService from '#services/boat_incident_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import IncidentPolicy from '#policies/incident_policy'
import {
  createBoatIncidentValidator,
  updateBoatIncidentValidator,
} from '#validators/boat_incident'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatIncidentsController {
  constructor(
    private boatService: BoatService,
    private boatIncidentService: BoatIncidentService
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

    await bouncer.with(IncidentPolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatIncidentValidator)

    try {
      await this.boatIncidentService.createForBoat(user, boat, {
        occurredAt: payload.occurredAt,
        tzOffsetMinutes: payload.tzOffsetMinutes,
        type: payload.type,
        location: payload.location ?? null,
        description: payload.description,
        insuranceClaimed: payload.insuranceClaimed ?? false,
        insuranceClaimRef: payload.insuranceClaimRef ?? null,
      })
    } catch (error) {
      if (error instanceof BoatIncidentValidationError) {
        session.flash('error', i18n.t(`flash.incidents.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.incidents.created'))
    response.redirect(`/boats/${boat.id}?tab=incidents`)
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

    await bouncer.with(IncidentPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateBoatIncidentValidator)

    try {
      await this.boatIncidentService.updateForBoat(user, boat, Number(params.incidentId), {
        occurredAt: payload.occurredAt,
        tzOffsetMinutes: payload.tzOffsetMinutes,
        type: payload.type,
        location: payload.location ?? null,
        description: payload.description,
        insuranceClaimed: payload.insuranceClaimed ?? false,
        insuranceClaimRef: payload.insuranceClaimRef ?? null,
        status: payload.status,
      })
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        session.flash('error', i18n.t('flash.incidents.notFound'))
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      if (error instanceof BoatIncidentValidationError) {
        session.flash('error', i18n.t(`flash.incidents.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.incidents.updated'))
    response.redirect(`/boats/${boat.id}?tab=incidents`)
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

    await bouncer.with(IncidentPolicy).authorize('delete', boat)

    try {
      await this.boatIncidentService.deleteForBoat(user, boat, Number(params.incidentId))
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        session.flash('error', i18n.t('flash.incidents.notFound'))
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.incidents.deleted'))
    response.redirect(`/boats/${boat.id}?tab=incidents`)
  }
}
