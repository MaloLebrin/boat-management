import { BoatNotFoundError } from '#exceptions/boat_errors'
import {
  BoatInspectionNotFoundError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import {
  BoatEquipmentActionNotFoundError,
  BoatEquipmentActionValidationError,
} from '#exceptions/equipment_action_errors'
import BoatService from '#services/boat_service'
import BoatReservationService from '#services/boat_reservation_service'
import BoatInspectionService from '#services/boat_inspection_service'
import BoatEquipmentActionService from '#services/boat_equipment_action_service'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import InspectionPolicy from '#policies/inspection_policy'
import EquipmentActionPolicy from '#policies/equipment_action_policy'
import {
  createBoatInspectionValidator,
  updateBoatInspectionValidator,
} from '#validators/boat_inspection'
import { createBoatEquipmentActionValidator } from '#validators/boat_equipment_action'
import { toBoatInspectionRow } from '#transformers/boat_inspection_transformer'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { toBoatEquipmentActionRow } from '#transformers/boat_equipment_action_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'

@inject()
export default class BoatInspectionsController {
  constructor(
    private boatService: BoatService,
    private reservationService: BoatReservationService,
    private inspectionService: BoatInspectionService,
    private equipmentActionService: BoatEquipmentActionService,
    private mediaService: MediaService,
    private organizationService: OrganizationService
  ) {}

  private async resolve(
    user: User,
    boatId: number,
    reservationId: number,
    response: HttpContext['response']
  ): Promise<{ boat: Boat; reservation: BoatReservation } | null> {
    let boat: Boat
    try {
      boat = await this.boatService.getForUserOrFail(user, boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }

    const reservation = await this.reservationService.findForBoat(user, boat, reservationId)
    if (!reservation) {
      response.redirect(`/boats/${boatId}/reservations`)
      return null
    }

    return { boat, reservation }
  }

  async show({ inertia, params, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded

    await bouncer.with(InspectionPolicy).authorize('view', reservation)

    let inspections
    try {
      inspections = await this.inspectionService.listForReservation(user, reservation)
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        response.redirect(`/boats/${boat.id}/reservations`)
        return
      }
      throw error
    }

    const [canEdit, canDelete, canManageActions, canDeleteActions] = await Promise.all([
      bouncer.with(InspectionPolicy).allows('edit', reservation),
      bouncer.with(InspectionPolicy).allows('delete', reservation),
      bouncer.with(EquipmentActionPolicy).allows('create', boat),
      bouncer.with(EquipmentActionPolicy).allows('delete', boat),
    ])

    const inspectionsWithMedia = await Promise.all(
      inspections.map(async (inspection) => {
        const actions = await this.equipmentActionService.listForInspection(user, boat, inspection)
        return {
          ...toBoatInspectionRow(inspection),
          photos: await this.mediaService.listForEntity('inspection', inspection.id),
          actions: actions.map(toBoatEquipmentActionRow),
        }
      })
    )

    return inertia.render('boats/reservation_inspection', {
      boat: { id: boat.id, name: boat.name },
      reservation: toBoatReservationRow(reservation, boat.name),
      inspections: inspectionsWithMedia,
      canEdit,
      canDelete,
      canManageActions,
      canDeleteActions,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('create', reservation)

    const payload = await request.validateUsing(createBoatInspectionValidator)

    try {
      await this.inspectionService.createForReservation(user, reservation, {
        kind: payload.kind,
        performedAt: payload.performedAt,
        tzOffsetMinutes: payload.tzOffsetMinutes,
        fuelLevel: payload.fuelLevel ?? null,
        engineHours: payload.engineHours ?? null,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        return response.redirect().back()
      }
      if (error instanceof BoatInspectionValidationError) {
        session.flash('error', i18n.t(`flash.inspections.${error.errorCode}`))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.inspections.created'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('edit', reservation)

    const payload = await request.validateUsing(updateBoatInspectionValidator)

    try {
      await this.inspectionService.updateForReservation(
        user,
        reservation,
        Number(params.inspectionId),
        {
          performedAt: payload.performedAt,
          tzOffsetMinutes: payload.tzOffsetMinutes,
          fuelLevel: payload.fuelLevel,
          engineHours: payload.engineHours,
          notes: payload.notes,
        }
      )
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.inspections.updated'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('delete', reservation)

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.inspectionService.deleteForReservation(
        user,
        reservation,
        Number(params.inspectionId),
        org
      )
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.inspections.deleted'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  /**
   * Raise an equipment action (défaut constaté) from a rental inspection (#311).
   * The boat is deduced from the resolved reservation, so it cannot be linked to
   * another boat's inspection.
   */
  async storeEquipmentAction({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('view', reservation)
    await bouncer.with(EquipmentActionPolicy).authorize('create', boat)

    let inspection
    try {
      inspection = await this.inspectionService.findForReservation(
        user,
        reservation,
        Number(params.inspectionId)
      )
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    const payload = await request.validateUsing(createBoatEquipmentActionValidator)

    try {
      await this.equipmentActionService.createFromInspection(user, boat, inspection, payload)
    } catch (error) {
      if (error instanceof BoatEquipmentActionValidationError) {
        session.flash('error', i18n.t(`flash.equipmentActions.${error.errorCode}`))
        return response.redirect().back()
      }
      if (error instanceof BoatEquipmentActionNotFoundError) {
        session.flash('error', i18n.t('flash.equipmentActions.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.equipmentActions.created'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  async destroyEquipmentAction({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('view', reservation)
    await bouncer.with(EquipmentActionPolicy).authorize('delete', boat)

    try {
      await this.equipmentActionService.deleteForBoat(user, boat, Number(params.actionId))
    } catch (error) {
      if (error instanceof BoatEquipmentActionNotFoundError) {
        session.flash('error', i18n.t('flash.equipmentActions.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.equipmentActions.deleted'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }
}
