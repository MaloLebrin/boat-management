import BoatPolicy from '#policies/boat_policy'
import BoatGenericEquipmentService from '#services/boat_generic_equipment_service'
import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import { toMaintenanceTaskRows } from '#transformers/boat_transformer'
import { toMediaRow } from '#transformers/media_row_transformer'
import { toTaskEquipmentSource } from '#transformers/maintenance_transformer'
import { maintenanceTaskPermissions } from '#utils/maintenance_task_permissions'
import {
  createGenericEquipmentValidator,
  parseEquipmentCatalogId,
  updateGenericEquipmentValidator,
} from '#validators/boat_generic_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'

@inject()
export default class BoatGenericEquipmentController {
  constructor(
    private boatContext: BoatContextService,
    private equipmentService: BoatGenericEquipmentService,
    private organizationService: OrganizationService,
    private mediaService: MediaService,
    private taskService: BoatMaintenanceTaskService
  ) {}

  async show({ inertia, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { boat } = loaded

    const item = await this.equipmentService.findForBoat(boat.id, Number(params.itemId))
    if (!item) {
      session.flash('error', i18n.t('flash.genericEquipment.notFound'))
      response.redirect(`/boats/${boat.id}?tab=equipment`)
      return
    }

    const [canManage, media, maintenanceTasks, taskPermissions] = await Promise.all([
      bouncer.with(BoatPolicy).allows('edit', boat),
      this.mediaService.listForEntity('boat_generic_equipment', item.id),
      this.taskService.listForEquipment(boat.id, { type: 'generic', id: item.id }),
      maintenanceTaskPermissions(bouncer, boat),
    ])

    return inertia.render('boats/generic_equipment_show', {
      boat: { id: boat.id, name: boat.name },
      item: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        equipmentModelId: item.equipmentModelId,
        category: item.category,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
        purchasePrice: item.purchasePrice ? Number.parseFloat(item.purchasePrice) : null,
        purchasedAt: item.purchasedAt ? item.purchasedAt.toISODate() : null,
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
      maintenanceTasks: toMaintenanceTaskRows(maintenanceTasks),
      taskEquipment: toTaskEquipmentSource({ genericEquipment: [item] }),
      taskPermissions,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const { equipmentModelId, ...body } = await request.validateUsing(
      createGenericEquipmentValidator
    )
    try {
      await this.equipmentService.create(user, boat, {
        ...body,
        equipmentModelId: parseEquipmentCatalogId(equipmentModelId),
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.created'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const { equipmentModelId, ...body } = await request.validateUsing(
      updateGenericEquipmentValidator
    )
    try {
      await this.equipmentService.update(user, boat, Number(params.itemId), {
        ...body,
        equipmentModelId: parseEquipmentCatalogId(equipmentModelId),
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipment`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.updated'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const org = await this.organizationService.findOrFail(boat.organizationId)
    try {
      await this.equipmentService.delete(user, boat, Number(params.itemId), org)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.genericEquipment.notFound'))
        response.redirect(`/boats/${boat.id}?tab=equipment`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.genericEquipment.deleted'))
    response.redirect(`/boats/${boat.id}?tab=equipment`)
  }
}
