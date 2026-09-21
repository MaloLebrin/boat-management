import BoatPolicy from '#policies/boat_policy'
import IncidentPolicy from '#policies/incident_policy'
import BoatEquipmentService from '#services/boat_equipment_service'
import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import { toMaintenanceTaskRows } from '#transformers/boat_transformer'
import { toMediaRow } from '#transformers/media_row_transformer'
import { toTaskEquipmentSource } from '#transformers/maintenance_transformer'
import { maintenanceTaskPermissions } from '#utils/maintenance_task_permissions'
import {
  createSafetyEquipmentValidator,
  updateSafetyEquipmentValidator,
} from '#validators/boat_safety_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import { initialTabParam } from '#utils/inertia_tab'

@inject()
export default class BoatSafetyEquipmentController {
  constructor(
    private boatContext: BoatContextService,
    private equipmentService: BoatEquipmentService,
    private organizationService: OrganizationService,
    private mediaService: MediaService,
    private taskService: BoatMaintenanceTaskService
  ) {}

  async show({ inertia, request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { boat } = loaded

    const item = await this.equipmentService.findSafetyEquipment(boat.id, Number(params.itemId))
    if (!item) {
      session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
      response.redirect(`/boats/${boat.id}?tab=safety`)
      return
    }

    const [canManage, canReportIncident, media, maintenanceTasks, taskPermissions] =
      await Promise.all([
        bouncer.with(BoatPolicy).allows('edit', boat),
        bouncer.with(IncidentPolicy).allows('create', boat),
        this.mediaService.listForEntity('boat_safety_equipment', item.id),
        this.taskService.listForEquipment(boat.id, { type: 'safety', id: item.id }),
        maintenanceTaskPermissions(bouncer, boat),
      ])

    return inertia.render('boats/safety_equipment_show', {
      boat: { id: boat.id, name: boat.name },
      initialTab: initialTabParam(request),
      item: {
        id: item.id,
        equipmentType: item.equipmentType,
        quantity: item.quantity,
        expiryDate: item.expiryDate ? item.expiryDate.toISODate() : null,
        status: item.status,
        notes: item.notes,
        purchasePrice: item.purchasePrice ? Number.parseFloat(item.purchasePrice) : null,
        purchasedAt: item.purchasedAt ? item.purchasedAt.toISODate() : null,
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
      canReportIncident,
      maintenanceTasks: toMaintenanceTaskRows(maintenanceTasks),
      taskEquipment: toTaskEquipmentSource({ safetyEquipment: [item] }),
      taskPermissions,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(createSafetyEquipmentValidator)
    try {
      await this.equipmentService.createSafetyEquipment(user, boat, payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.created'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(updateSafetyEquipmentValidator)
    try {
      await this.equipmentService.updateSafetyEquipment(user, boat, Number(params.itemId), payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=safety`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.updated'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const org = await this.organizationService.findOrFail(boat.organizationId)
    try {
      await this.equipmentService.deleteSafetyEquipment(user, boat, Number(params.itemId), org)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.safetyEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=safety`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.safetyEquipment.deleted'))
    response.redirect(`/boats/${boat.id}?tab=safety`)
  }
}
