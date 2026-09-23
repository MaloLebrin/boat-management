import { BoatIncidentNotFoundError, BoatIncidentValidationError } from '#exceptions/incident_errors'
import AuditLogService from '#services/audit_log_service'
import BoatIncidentService from '#services/boat_incident_service'
import BoatHullService from '#services/boat_hull_service'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import { toIncident } from '#transformers/boat_transformer'
import { toMediaRow } from '#transformers/media_row_transformer'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import IncidentPolicy from '#policies/incident_policy'
import { createBoatIncidentValidator, updateBoatIncidentValidator } from '#validators/boat_incident'
import { CREATE_INCIDENT_ACTION, UPDATE_INCIDENT_ACTION } from '#shared/constants/offline_queue'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatIncidentsController {
  constructor(
    private boatService: BoatHullService,
    private boatIncidentService: BoatIncidentService,
    private mediaService: MediaService,
    private organizationService: OrganizationService,
    private auditLogService: AuditLogService
  ) {}

  /** Page de détail d'un incident : en-tête, description, assurance et photos (#814). */
  async show({ inertia, response, auth, params, bouncer }: HttpContext) {
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

    await bouncer.with(IncidentPolicy).authorize('view', boat)

    let incident
    try {
      incident = await this.boatIncidentService.findForBoat(user, boat, Number(params.incidentId))
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    const [media, canManage, canDelete] = await Promise.all([
      this.mediaService.listForEntity('boat_incident', incident.id),
      bouncer.with(IncidentPolicy).allows('edit', boat),
      bouncer.with(IncidentPolicy).allows('delete', boat),
    ])

    return inertia.render('boats/incident_show', {
      boat: { id: boat.id, name: boat.name },
      incident: toIncident(incident),
      photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      canManage,
      canDelete,
    })
  }

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

    let incident
    try {
      incident = await this.boatIncidentService.createForBoat(user, boat, {
        occurredAt: payload.occurredAt,
        tzOffsetMinutes: payload.tzOffsetMinutes,
        type: payload.type,
        location: payload.location ?? null,
        description: payload.description,
        insuranceClaimed: payload.insuranceClaimed ?? false,
        insuranceClaimRef: payload.insuranceClaimRef ?? null,
        boatEngineId: payload.boatEngineId,
        boatSailId: payload.boatSailId,
        boatRigId: payload.boatRigId,
        boatSafetyEquipmentId: payload.boatSafetyEquipmentId,
        boatGenericEquipmentId: payload.boatGenericEquipmentId,
        boatEnginePartId: payload.boatEnginePartId,
      })
    } catch (error) {
      if (error instanceof BoatIncidentValidationError) {
        session.flash('error', i18n.t(`flash.incidents.${error.errorCode}`))
        // Refus métier sur un incident enfilé hors-ligne : sans marqueur, la
        // file le prendrait pour un succès et détruirait la saisie (#816).
        session.flash('rejectedType', CREATE_INCIDENT_ACTION)
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'incident.create',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { boatName: boat.name, type: incident.type },
    })

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

    let incident
    try {
      incident = await this.boatIncidentService.updateForBoat(
        user,
        boat,
        Number(params.incidentId),
        {
          occurredAt: payload.occurredAt,
          tzOffsetMinutes: payload.tzOffsetMinutes,
          type: payload.type,
          location: payload.location ?? null,
          description: payload.description,
          insuranceClaimed: payload.insuranceClaimed ?? false,
          insuranceClaimRef: payload.insuranceClaimRef ?? null,
          status: payload.status,
          // `undefined` = cible inchangée ; `null` sur toutes = retour au bateau entier
          boatEngineId: payload.boatEngineId,
          boatSailId: payload.boatSailId,
          boatRigId: payload.boatRigId,
          boatSafetyEquipmentId: payload.boatSafetyEquipmentId,
          boatGenericEquipmentId: payload.boatGenericEquipmentId,
          boatEnginePartId: payload.boatEnginePartId,
        }
      )
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        session.flash('error', i18n.t('flash.incidents.notFound'))
        session.flash('rejectedType', UPDATE_INCIDENT_ACTION)
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      if (error instanceof BoatIncidentValidationError) {
        session.flash('error', i18n.t(`flash.incidents.${error.errorCode}`))
        session.flash('rejectedType', UPDATE_INCIDENT_ACTION)
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'incident.update',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { boatName: boat.name, type: incident.type, status: incident.status },
    })

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

    // L'org sert à purger les photos de l'incident et à rendre le quota (#814).
    const org = await this.organizationService.findOrFail(boat.organizationId)

    let incident
    try {
      incident = await this.boatIncidentService.deleteForBoat(
        user,
        boat,
        Number(params.incidentId),
        org
      )
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        session.flash('error', i18n.t('flash.incidents.notFound'))
        response.redirect(`/boats/${boat.id}?tab=incidents`)
        return
      }
      throw error
    }

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'incident.delete',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { boatName: boat.name, type: incident.type },
    })

    session.flash('success', i18n.t('flash.incidents.deleted'))
    response.redirect(`/boats/${boat.id}?tab=incidents`)
  }
}
