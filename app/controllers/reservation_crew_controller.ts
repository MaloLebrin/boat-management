import {
  CrewAssignmentNotFoundError,
  CrewAssignmentReservationCancelledError,
  CrewMemberAlreadyAssignedError,
  CrewMemberNotFoundError,
  CrewMemberUnavailableError,
} from '#exceptions/crew_errors'
import BoatPolicy from '#policies/boat_policy'
import CrewMemberPolicy from '#policies/crew_member_policy'
import BoatContextService from '#services/boat_context_service'
import CrewPlanningService from '#services/crew_planning_service'
import CrewRolePdfService from '#services/crew_role_pdf_service'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { assignReservationCrewValidator } from '#validators/crew'
import { contentDisposition } from '#shared/helpers/content_disposition'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Bloc « Équipage » d'une réservation (#883) : qui embarque, avec quel rôle,
 * et le rôle d'équipage PDF qui en découle. Lecture au droit de voir le
 * bateau, écriture au droit de gérer ses réservations.
 */
@inject()
export default class ReservationCrewController {
  constructor(
    private boatContext: BoatContextService,
    private crewPlanningService: CrewPlanningService,
    private pdfService: CrewRolePdfService
  ) {}

  async show({ inertia, params, auth, bouncer, response }: HttpContext) {
    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const [crew, availability, canManage, canManageCrew] = await Promise.all([
      this.crewPlanningService.listForReservation(reservation),
      this.crewPlanningService.availabilityFor(boat.organizationId, reservation),
      bouncer.with(BoatPolicy).allows('manage', boat),
      bouncer.with(CrewMemberPolicy).allows('create'),
    ])

    return inertia.render('boats/reservation_crew', {
      boat: { id: boat.id, name: boat.name },
      reservation: toBoatReservationRow(reservation, boat.name),
      crew,
      availability,
      canManage,
      canManageCrew,
    })
  }

  async store({ request, params, auth, bouncer, response, session, i18n }: HttpContext) {
    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('manage', boat)
    const payload = await request.validateUsing(assignReservationCrewValidator)

    try {
      const { warning } = await this.crewPlanningService.assign(
        boat.organizationId,
        reservation,
        payload
      )
      session.flash(
        warning ? 'info' : 'success',
        i18n.t(warning ? 'flash.crew.planning.assignedLapses' : 'flash.crew.planning.assigned')
      )
    } catch (error) {
      if (error instanceof CrewMemberUnavailableError) {
        session.flash('error', i18n.t('flash.crew.planning.unavailable'))
      } else if (error instanceof CrewMemberAlreadyAssignedError) {
        session.flash('error', i18n.t('flash.crew.planning.alreadyAssigned'))
      } else if (error instanceof CrewAssignmentReservationCancelledError) {
        session.flash('error', i18n.t('flash.crew.planning.reservationCancelled'))
      } else if (error instanceof CrewMemberNotFoundError) {
        session.flash('error', i18n.t('flash.crew.notFound'))
      } else {
        throw error
      }
    }

    return response.redirect().back()
  }

  async destroy({ params, auth, bouncer, response, session, i18n }: HttpContext) {
    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('manage', boat)

    try {
      await this.crewPlanningService.unassign(reservation, Number(params.assignmentId))
      session.flash('success', i18n.t('flash.crew.planning.unassigned'))
    } catch (error) {
      if (!(error instanceof CrewAssignmentNotFoundError)) throw error
      session.flash('error', i18n.t('flash.crew.planning.assignmentNotFound'))
    }

    return response.redirect().back()
  }

  /** Rôle d'équipage PDF de la réservation, avant même la sortie du jour J. */
  async pdf({ params, auth, bouncer, response, i18n }: HttpContext) {
    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const crewWithRoles = await this.crewPlanningService.crewWithRolesFor(reservation.id)
    const { buffer, filename } = await this.pdfService.generateForReservation(
      reservation,
      boat.name,
      crewWithRoles,
      i18n
    )

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', contentDisposition(filename))
    response.send(buffer)
  }
}
