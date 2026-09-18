import BoatPolicy from '#policies/boat_policy'
import { toMediaRow } from '#transformers/media_row_transformer'
import { toMaintenanceTaskRows } from '#transformers/boat_transformer'
import { toTaskEquipmentSource } from '#transformers/maintenance_transformer'
import { maintenanceTaskPermissions } from '#utils/maintenance_task_permissions'
import AiAnalysisService from '#services/ai_analysis_service'
import BoatEquipmentService from '#services/boat_equipment_service'
import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import BoatEngineDiagnosticService from '#services/boat_engine_diagnostic_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import EngineCatalogService from '#services/engine_catalog_service'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import SailLoftService from '#services/sail_loft_service'
import {
  type BoatEngineFormBody,
  type BoatRigFormBody,
  type BoatSailFormBody,
  equipmentBodyToEnginePayload,
  equipmentBodyToRigPayload,
  equipmentBodyToSailPayload,
  incrementEngineHoursValidator,
  storeBoatEngineValidator,
  storeBoatSailValidator,
  updateBoatEngineValidator,
  updateBoatSailValidator,
  updateEquipmentNotesValidator,
  updateEquipmentStatusValidator,
  upsertBoatRigValidator,
} from '#validators/boat_equipment'
import { INCREMENT_ENGINE_HOURS_ACTION } from '#shared/constants/offline_queue'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { AiSuggestion } from '#shared/types/ai'
import { deferJson } from '#utils/inertia_defer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import { initialTabParam } from '#utils/inertia_tab'

@inject()
export default class BoatEquipmentController {
  constructor(
    private boatContext: BoatContextService,
    private equipmentService: BoatEquipmentService,
    private maintenanceService: BoatMaintenanceService,
    private taskService: BoatMaintenanceTaskService,
    private mediaService: MediaService,
    private enginePartService: BoatEnginePartService,
    private organizationService: OrganizationService,
    private diagnosticService: BoatEngineDiagnosticService,
    private engineCatalogService: EngineCatalogService,
    private sailLoftService: SailLoftService,
    private aiAnalysisService: AiAnalysisService
  ) {}

  async storeEngine({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const body = (await request.validateUsing(storeBoatEngineValidator)) as BoatEngineFormBody
    await this.equipmentService.createEngine(loaded.user, boat, equipmentBodyToEnginePayload(body))

    session.flash('success', i18n.t('flash.engine.added'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editEngine({
    inertia,
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const engine = boat.engines.find((e) => e.id === Number(params.engineId))
    if (!engine) {
      session.flash('error', i18n.t('flash.engine.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const catalog = await this.engineCatalogService.formProps(
      request.qs().engineBrandId,
      engine.brand
    )

    return inertia.render('boats/engine_edit', {
      boat: { id: boat.id, name: boat.name },
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        strokeType: engine.strokeType,
        family: engine.family,
        brand: engine.brand,
        model: engine.model,
        engineModelId: engine.engineModelId,
        serialNumber: engine.serialNumber,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        powerHp: engine.powerHp,
        hours: engine.hours,
        installHours: engine.installHours,
        status: engine.status,
      },
      ...catalog,
    })
  }

  async updateEngine({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const body = (await request.validateUsing(updateBoatEngineValidator)) as BoatEngineFormBody
    const engineId = Number(params.engineId)

    try {
      await this.equipmentService.updateEngine(
        loaded.user,
        boat,
        engineId,
        equipmentBodyToEnginePayload(body)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.engine.updated'))
    response.redirect(`/boats/${boat.id}/engines/${engineId}`)
  }

  async destroyEngine({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.equipmentService.deleteEngine(loaded.user, boat, Number(params.engineId), org)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.engine.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async storeSail({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const body = (await request.validateUsing(storeBoatSailValidator)) as BoatSailFormBody
    await this.equipmentService.createSail(loaded.user, boat, equipmentBodyToSailPayload(body))

    session.flash('success', i18n.t('flash.sail.added'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editSail({ inertia, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const sail = boat.sails.find((s) => s.id === Number(params.sailId))
    if (!sail) {
      session.flash('error', i18n.t('flash.sail.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    return inertia.render('boats/sail_edit', {
      boat: { id: boat.id, name: boat.name },
      sail: {
        id: sail.id,
        sailType: sail.sailType,
        manufacturedAt: sail.manufacturedAt ? sail.manufacturedAt.toISODate() : null,
        areaM2: sail.areaM2,
        material: sail.material,
        reefPoints: sail.reefPoints,
        status: sail.status,
        notes: sail.notes,
        sailmaker: sail.sailmaker,
        sailLoftId: sail.sailLoftId,
      },
      ...(await this.sailLoftService.formProps(sail)),
    })
  }

  async showSail({
    inertia,
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const sail = boat.sails.find((s) => s.id === Number(params.sailId))
    if (!sail) {
      session.flash('error', i18n.t('flash.sail.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const [canManage, media, maintenanceTasks, taskPermissions] = await Promise.all([
      bouncer.with(BoatPolicy).allows('edit', boat),
      this.mediaService.listForEntity('boat_sail', sail.id),
      this.taskService.listForEquipment(boat.id, { type: 'sail', id: sail.id }),
      maintenanceTaskPermissions(bouncer, boat),
    ])

    return inertia.render('boats/sail_show', {
      boat: { id: boat.id, name: boat.name },
      initialTab: initialTabParam(request),
      sail: {
        id: sail.id,
        sailType: sail.sailType,
        manufacturedAt: sail.manufacturedAt ? sail.manufacturedAt.toISODate() : null,
        areaM2: sail.areaM2,
        material: sail.material,
        reefPoints: sail.reefPoints,
        status: sail.status,
        notes: sail.notes,
        sailmaker: sail.sailmaker,
        sailLoftId: sail.sailLoftId,
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
      maintenanceTasks: toMaintenanceTaskRows(maintenanceTasks),
      taskEquipment: toTaskEquipmentSource({ sails: [sail] }),
      taskPermissions,
    })
  }

  async showRig({ inertia, request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const rig = boat.rig
    if (!rig) {
      session.flash('error', i18n.t('flash.rig.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const [canManage, media, maintenanceTasks, taskPermissions] = await Promise.all([
      bouncer.with(BoatPolicy).allows('edit', boat),
      this.mediaService.listForEntity('boat_rig', rig.id),
      this.taskService.listForEquipment(boat.id, { type: 'rig', id: rig.id }),
      maintenanceTaskPermissions(bouncer, boat),
    ])

    return inertia.render('boats/rig_show', {
      boat: { id: boat.id, name: boat.name },
      initialTab: initialTabParam(request),
      rig: {
        id: rig.id,
        rigType: rig.rigType,
        manufacturedAt: rig.manufacturedAt ? rig.manufacturedAt.toISODate() : null,
        mastCount: rig.mastCount,
        spreaders: rig.spreaders,
        status: rig.status,
        notes: rig.notes,
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
      maintenanceTasks: toMaintenanceTaskRows(maintenanceTasks),
      taskEquipment: toTaskEquipmentSource({ rig }),
      taskPermissions,
    })
  }

  async updateSail({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const body = (await request.validateUsing(updateBoatSailValidator)) as BoatSailFormBody

    try {
      await this.equipmentService.updateSail(
        loaded.user,
        boat,
        Number(params.sailId),
        equipmentBodyToSailPayload(body)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.sail.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.sail.updated'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroySail({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.equipmentService.deleteSail(loaded.user, boat, Number(params.sailId), org)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.sail.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.sail.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editRig({ inertia, response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    return inertia.render('boats/rig_edit', {
      boat: { id: boat.id, name: boat.name },
      rig: boat.rig
        ? {
            id: boat.rig.id,
            rigType: boat.rig.rigType,
            manufacturedAt: boat.rig.manufacturedAt ? boat.rig.manufacturedAt.toISODate() : null,
            mastCount: boat.rig.mastCount,
            spreaders: boat.rig.spreaders,
            status: boat.rig.status,
            notes: boat.rig.notes,
          }
        : null,
    })
  }

  async upsertRig({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const body = (await request.validateUsing(upsertBoatRigValidator)) as BoatRigFormBody
    await this.equipmentService.upsertRig(loaded.user, boat, equipmentBodyToRigPayload(body))

    session.flash('success', i18n.t('flash.rig.saved'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyRig({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)
    await this.equipmentService.deleteRig(loaded.user, boat, org)

    session.flash('success', i18n.t('flash.rig.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async showEngine({ inertia, request, response, auth, params, bouncer, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)

    if (!engine) {
      return response.redirect(`/boats/${boat.id}`)
    }

    const canManage = await bouncer.with(BoatPolicy).allows('edit', boat)

    const [
      maintenanceEvents,
      maintenanceTasks,
      engineMedia,
      engineParts,
      diagnosticCheckedStepKeys,
      taskPermissions,
    ] = await Promise.all([
      this.maintenanceService.listEventsForEngine(boat.id, engineId),
      this.taskService.listForEngine(boat.id, engineId),
      this.mediaService.listForEntity('boat_engine', engineId),
      this.enginePartService.listForEngine(engineId),
      this.diagnosticService.getCheckedStepKeysIfEligible(engine),
      maintenanceTaskPermissions(bouncer, boat),
    ])

    return inertia.render('boats/engine_show', {
      boat: { id: boat.id, name: boat.name },
      initialTab: initialTabParam(request),
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        strokeType: engine.strokeType,
        family: engine.family,
        brand: engine.brand,
        model: engine.model,
        serialNumber: engine.serialNumber,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        powerHp: engine.powerHp,
        hours: engine.hours,
        installHours: engine.installHours,
        status: engine.status,
        notes: engine.notes,
        documents: engineMedia.filter((m) => m.kind === 'document').map(toMediaRow),
        photos: engineMedia.filter((m) => m.kind === 'photo').map(toMediaRow),
        parts: engineParts.map((p) => ({
          id: p.id,
          designation: p.designation,
          reference: p.reference,
          stock: p.stock,
          supplier: p.supplier,
          notes: p.notes,
          wearState: p.wearState,
          documents: [],
          photos: [],
          purchasePrice: p.purchasePrice ? Number.parseFloat(p.purchasePrice) : null,
          purchasedAt: p.purchasedAt ? p.purchasedAt.toISODate() : null,
        })),
      },
      maintenanceEvents: maintenanceEvents.map((ev) => ({
        id: ev.id,
        subject: ev.subject,
        title: ev.title,
        notes: ev.notes,
        performedAt: ev.performedAt.toISODate()!,
        engineCaption: ev.engineCaption,
        parts: ev.parts.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          notes: p.notes,
        })),
      })),
      maintenanceTasks: toMaintenanceTaskRows(maintenanceTasks),
      taskEquipment: toTaskEquipmentSource({ engines: [engine] }),
      taskPermissions,
      diagnosticCheckedStepKeys,
      canManage,
      // Jamais `null` ici : le serializer d'Inertia jette « Cannot serialize
      // an item with null value » quand un callback différé résout `null`
      // (#478) — l'absence d'analyse est donc portée par la liste vide.
      aiSuggestions: inertia.defer(
        deferJson(async () => {
          const latest = await this.aiAnalysisService.getLatestEngineSuggestions(
            loaded.user.id,
            engineId,
            boat.organizationId,
            toAppLocale(i18n.locale)
          )
          if (!latest) return []
          try {
            return JSON.parse(latest.responseText) as AiSuggestion[]
          } catch {
            return []
          }
        })
      ),
    })
  }

  async updateEngineStatus({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const { status } = await request.validateUsing(updateEquipmentStatusValidator)

    try {
      await this.equipmentService.updateEngineStatus(
        loaded.user,
        boat,
        Number(params.engineId),
        status
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    response.redirect().back()
  }

  async updateEngineNotes({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const { notes } = await request.validateUsing(updateEquipmentNotesValidator)

    try {
      await this.equipmentService.updateEngineNotes(
        loaded.user,
        boat,
        Number(params.engineId),
        notes ?? null
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    response.redirect().back()
  }

  async incrementEngineHours({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const { hoursIncrement } = await request.validateUsing(incrementEngineHoursValidator)

    try {
      await this.equipmentService.incrementEngineHours(
        loaded.user,
        boat,
        Number(params.engineId),
        hoursIncrement
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        // Un incrément enfilé hors-ligne dont le moteur a disparu entre-temps :
        // le marqueur le range dans « échecs » au lieu de le laisser disparaître
        // avec les heures saisies (#727). Pas de `createdResourceId` ici —
        // l'action n'ouvre aucune ressource dont d'autres dépendraient.
        session.flash('rejectedType', INCREMENT_ENGINE_HOURS_ACTION)
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    response.redirect().back()
  }
}
