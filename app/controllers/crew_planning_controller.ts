import { CrewMemberNotFoundError, CrewUnavailabilityNotFoundError } from '#exceptions/crew_errors'
import CrewMemberPolicy from '#policies/crew_member_policy'
import CrewPlanningService from '#services/crew_planning_service'
import CrewService from '#services/crew_service'
import { createCrewUnavailabilityValidator, crewPlanningQueryValidator } from '#validators/crew'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

/** Jours affichés par le calendrier d'équipage. */
const PLANNING_DAYS = 28

/**
 * Planning d'équipage (#883) : calendrier `/crew/planning` (une ligne par
 * équipier) et indisponibilités. Gardé par le module Location, comme les
 * réservations sur lesquelles il repose.
 */
@inject()
export default class CrewPlanningController {
  constructor(
    private crewService: CrewService,
    private crewPlanningService: CrewPlanningService
  ) {}

  async index({ inertia, auth, bouncer, request }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('create')

    const { from } = await crewPlanningQueryValidator.validate(request.qs())
    const start = (from ?? DateTime.now()).startOf('week')
    const end = start.plus({ days: PLANNING_DAYS - 1 })

    const planning = await this.crewPlanningService.planning(user.organizationId!, start, end)

    return inertia.render('organization/crew_planning', { planning })
  }

  async storeUnavailability({
    request,
    auth,
    params,
    bouncer,
    response,
    session,
    i18n,
  }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('update')
    await user.load('organization')

    const payload = await request.validateUsing(createCrewUnavailabilityValidator)
    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.id)
      )
      await this.crewPlanningService.addUnavailability(member, {
        startsOn: payload.startsOn.toISODate()!,
        endsOn: payload.endsOn.toISODate()!,
        reason: payload.reason ?? null,
      })
    } catch (error) {
      if (!(error instanceof CrewMemberNotFoundError)) throw error
      session.flash('error', i18n.t('flash.crew.notFound'))
      return response.redirect('/crew')
    }

    session.flash('success', i18n.t('flash.crew.planning.unavailabilityCreated'))
    return response.redirect().back()
  }

  async destroyUnavailability({ auth, params, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(CrewMemberPolicy).authorize('update')
    await user.load('organization')

    try {
      const member = await this.crewService.getForOrganizationOrFail(
        user.organization,
        Number(params.id)
      )
      await this.crewPlanningService.deleteUnavailability(member, Number(params.unavailabilityId))
    } catch (error) {
      if (error instanceof CrewMemberNotFoundError) {
        session.flash('error', i18n.t('flash.crew.notFound'))
        return response.redirect('/crew')
      }
      if (!(error instanceof CrewUnavailabilityNotFoundError)) throw error
      session.flash('error', i18n.t('flash.crew.planning.unavailabilityNotFound'))
      return response.redirect().back()
    }

    session.flash('success', i18n.t('flash.crew.planning.unavailabilityDeleted'))
    return response.redirect().back()
  }
}
